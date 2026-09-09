<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardCard;
use App\Models\BoardList;
use App\Models\Activity;
use App\Models\City;
use App\Models\CountryLabel;
use App\Models\IntakeLabel;
use App\Models\ServiceArea;
use App\Models\User;
use App\Jobs\BuildCardDriveFolderStructure;
use App\Jobs\CreateDriveSubfolderTree;
use App\Jobs\UploadDriveTemplateFiles;
use App\Services\GoogleDriveService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class BoardCardController extends Controller
{
    public function __construct(private readonly GoogleDriveService $driveService)
    {
    }

    public const CLIENT_UPLOADS_SUBFOLDER = 'Client Uploaded Files';

    /**
     * Every superadmin/admin becomes a Drive member of every card automatically -
     * except accounts listed in GOOGLE_DRIVE_EXCLUDED_ADMIN_EMAILS, which exist
     * only for app/infra administration and shouldn't clutter client Drive folders.
     */
    private function driveEligibleAdminEmails()
    {
        $excluded = collect(config('services.google_drive.excluded_admin_emails', []))
            ->map(fn ($email) => strtolower(trim($email)));

        return User::whereIn('role_id', [1, 2])
            ->pluck('email')
            ->filter()
            ->unique()
            ->reject(fn ($email) => $excluded->contains(strtolower(trim($email))))
            ->values();
    }

    private function cardDriveFolderName(BoardCard $card): string
    {
        $invoice = $card->invoice ?: ('Card #' . $card->id);
        $fullName = trim(($card->first_name ?? '') . ' ' . ($card->last_name ?? ''));

        return $fullName !== '' ? $invoice . ' ' . $fullName : $invoice;
    }

    /**
     * @return bool true when this call just created the folder (and dispatched
     *   BuildCardDriveFolderStructure to build the rest in the background);
     *   false when the card already had one. Callers use this to avoid
     *   racing that background job with their own synchronous subfolder/sync
     *   calls, which would otherwise create duplicate top-level subfolders
     *   (e.g. two "Client Uploaded Files") if the card is touched again -
     *   opened, contact email changed, members changed - before the job
     *   finishes building the structure itself.
     */
    private function ensureCardDriveFolder(BoardCard $card): bool
    {
        if ($card->google_drive_folder_id) {
            return false;
        }

        if (!$this->driveService->isOAuthEnabled()) {
            return false;
        }

        // Each card gets its own, brand new Shared Drive - this is the only
        // supported mode, since only a real Google account (via OAuth) can
        // create Shared Drives or add real members to one.
        $drive = $this->driveService->createSharedDrive($this->cardDriveFolderName($card));
        if (!$drive) {
            return false;
        }

        // Give the brand new Shared Drive a moment before hitting it with
        // more writes - immediately following creation with a burst of
        // requests against a resource with zero history appears to be
        // what triggers Google's abuse detection into deleting the drive
        // a few minutes later (observed: drives with heavy, fast API
        // activity right after creation vanished; an established drive
        // handling the same volume of writes was unaffected).
        sleep(3);

        // A brand new Shared Drive has NO members at all - not even its
        // creator - until permissions are explicitly granted. Google
        // appears to garbage-collect member-less Shared Drives after a
        // few minutes, so at least one organizer (every admin here) must
        // be added synchronously, right now, before anything else -
        // waiting for the background job to do this later is too slow
        // and loses the drive. One at a time, paced, for the same reason
        // as the sleep() above - avoid a burst of writes right after
        // creating a drive with no history.
        $adminEmails = $this->driveEligibleAdminEmails();
        foreach ($adminEmails as $adminEmail) {
            $this->driveService->addSharedDriveMember($drive['id'], $adminEmail, 'organizer');
            usleep(500000);
        }

        $card->update([
            'google_drive_folder_id' => $drive['id'],
            'google_drive_folder_link' => $drive['link'],
            'google_drive_synced_at' => now(),
            'google_drive_own_shared_drive' => true,
        ]);

        BuildCardDriveFolderStructure::dispatch($card);
        return true;
    }

    /**
     * Backfill the "Client Uploaded Files" subfolder for cards whose Drive
     * folder was created before that subfolder was tracked separately.
     */
    private function ensureClientUploadsSubfolder(BoardCard $card): void
    {
        if ($card->google_drive_client_uploads_folder_id || !$card->google_drive_folder_id) {
            return;
        }

        $subfolder = $this->driveService->createFolder(self::CLIENT_UPLOADS_SUBFOLDER, $card->google_drive_folder_id);
        if (!$subfolder) {
            return;
        }

        $card->update([
            'google_drive_client_uploads_folder_id' => $subfolder['id'],
            'google_drive_client_uploads_folder_link' => $subfolder['link'],
        ]);

        $children = config('drive_folder_template.' . self::CLIENT_UPLOADS_SUBFOLDER, []);
        if (!empty($children)) {
            CreateDriveSubfolderTree::dispatch($subfolder['id'], $children);
        }

        UploadDriveTemplateFiles::dispatch($card);
    }

    /**
     * Share the card's Drive folder(s) according to role. Staff become real
     * members of this card's own dedicated Shared Drive (that's what unlocks
     * local Drive-for-Desktop sync + adding files from a synced folder); the
     * contact email deliberately does NOT, since they only need to add files
     * via the Drive website, not from a local folder:
     *  - Every superadmin/admin (role 1/2) gets "organizer" automatically,
     *    by role alone - they don't need to be added as a card member first.
     *  - Subadmin/counsellor (role 3/4) get "fileOrganizer", but only on
     *    cards an admin explicitly added them to as a member. Since Shared
     *    Drive membership can't be folder-scoped, this does mean they can
     *    browse Admission/Visa Specific Files too, not just Client Uploaded.
     *  - The contact email is kept OFF the drive membership entirely and
     *    only gets an item-level "writer" permission on just the "Client
     *    Uploaded Files" subfolder - so they can't see Admission/Visa
     *    Specific Files at all (not even read-only), and their write access
     *    only works via the Drive website (not local sync, since they're
     *    not a drive member).
     *
     * Public so the background BuildCardDriveFolderStructure job can call it
     * once the card's Drive folder(s) have been created.
     */
    public function syncCardDriveAccess(BoardCard $card): void
    {
        if (!$card->google_drive_folder_id || !$this->driveService->isOAuthEnabled()) {
            return;
        }

        $this->ensureClientUploadsSubfolder($card);

        $members = $card->members()->get(['users.id', 'users.email', 'users.role_id']);

        $fullAccessEmails = $members
            ->filter(fn ($member) => $this->canBypassCardMemberVisibility($member))
            ->pluck('email')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $restrictedMemberEmails = $members
            ->filter(fn ($member) => !$this->canBypassCardMemberVisibility($member))
            ->pluck('email')
            ->filter()
            ->unique()
            ->values()
            ->all();

        // Only staff (admins auto-access + explicitly added members) become
        // real Shared Drive members - that's what local Drive-for-Desktop
        // sync/write needs. The contact email does NOT need local sync
        // (they just add files via the Drive website), so they're kept
        // OFF the drive membership entirely and only get an item-level
        // "writer" permission on "Client Uploaded Files" - meaning they
        // can't see Admission/Visa Specific Files at all, not even read-only.
        $allAdminEmails = $this->driveEligibleAdminEmails();

        // The OAuth-connected account itself must always stay "wanted" -
        // it's the drive's creator/organizer but isn't necessarily a row
        // in our own users table, so it can be missing from
        // $allAdminEmails. Omitting it here would make the sync below
        // remove the connected account's own access, which immediately
        // orphans the drive (confirmed: this is what was silently
        // deleting per-card Shared Drives, not any Google-side abuse
        // detection).
        $connectedEmail = $this->driveService->getOAuthConnectedEmail();

        $emailToRole = $allAdminEmails->mapWithKeys(fn ($email) => [$email => 'organizer'])
            ->union(collect($fullAccessEmails)->mapWithKeys(fn ($email) => [$email => 'organizer']))
            ->union(collect($restrictedMemberEmails)->mapWithKeys(fn ($email) => [$email => 'fileOrganizer']))
            ->union($connectedEmail ? [$connectedEmail => 'organizer'] : [])
            ->all();

        $this->driveService->syncSharedDriveMembers($card->google_drive_folder_id, $emailToRole);

        if ($card->google_drive_client_uploads_folder_id) {
            $this->driveService->syncFolderMembers(
                $card->google_drive_client_uploads_folder_id,
                $card->contact_email ? [$card->contact_email] : [],
                'writer'
            );
        }

        $card->update(['google_drive_synced_at' => now()]);
    }

    private function isCommissionBoardName(?string $name): bool
    {
        $normalized = strtolower(trim((string) $name));
        return str_contains($normalized, 'commission') || str_contains($normalized, 'comission');
    }

    private function canReadAllBoardLists($user): bool
    {
        return in_array((int) ($user->role_id ?? 0), [1, 2, 3, 4], true);
    }

    private function canBypassListPermissions($user): bool
    {
        return in_array((int) $user->role_id, [1, 2], true);
    }

    private function canBypassCardMemberVisibility($user): bool
    {
        return in_array((int) $user->role_id, [1, 2], true);
    }

    private function isOpenVisibilityList(?BoardList $boardList): bool
    {
        return in_array(strtolower(trim((string) ($boardList?->title ?? ''))), [
            'new customers',
            'member assigned',
        ], true);
    }

    private function canReadAllCardsInOpenVisibilityLists($user): bool
    {
        return (int) ($user->role_id ?? 0) === 3;
    }

    private function requiresExplicitCardMembership($user): bool
    {
        return in_array((int) $user->role_id, [3, 4], true);
    }

    private function applyCardVisibilityScope($cardQuery, $user): void
    {
        if ($this->canBypassCardMemberVisibility($user)) {
            return;
        }

        if ($this->requiresExplicitCardMembership($user)) {
            $cardQuery->where(function ($visibleQuery) use ($user) {
                $visibleQuery->whereHas('members', function ($memberQuery) use ($user) {
                    $memberQuery->where('users.id', $user->id);
                });

                if ($this->canReadAllCardsInOpenVisibilityLists($user)) {
                    $visibleQuery->orWhereHas('boardList', function ($listQuery) {
                        $listQuery->whereIn(\DB::raw('LOWER(TRIM(title))'), [
                            'new customers',
                            'member assigned',
                        ]);
                    });
                }
            });
            return;
        }

        $cardQuery->where(function ($visibleQuery) use ($user) {
            $visibleQuery
                ->whereDoesntHave('members')
                ->orWhereHas('members', function ($memberQuery) use ($user) {
                    $memberQuery->where('users.id', $user->id);
                });
        });
    }

    private function canManageCardMembers($user): bool
    {
        return !empty($this->manageableMemberRoleIds($user));
    }

    private function canManagePaymentStatus($user): bool
    {
        return in_array((int) ($user->role_id ?? 0), [1, 2, 3], true);
    }

    private function manageableMemberRoleIds($user): array
    {
        $roleId = (int) ($user->role_id ?? 0);

        return match ($roleId) {
            1, 2 => [2, 3, 4],
            3 => [3, 4],
            4 => [4],
            default => [],
        };
    }

    private function hasAssignedBoardListAccess($user, BoardList $boardList): bool
    {
        if (!$user) {
            return false;
        }

        if ($this->canBypassListPermissions($user)) {
            return true;
        }

        return $user->boardLists()->whereKey($boardList->id)->exists();
    }

    private function canReadBoardList($user, BoardList $boardList): bool
    {
        if (!$user) {
            return false;
        }

        return $this->canReadAllBoardLists($user)
            || $this->hasAssignedBoardListAccess($user, $boardList);
    }

    private function canReadBoardCard($user, BoardCard $boardCard, ?BoardList $boardList = null): bool
    {
        $resolvedBoardList = $boardList;
        if (!$resolvedBoardList) {
            $boardCard->loadMissing('boardList');
            $resolvedBoardList = $boardCard->boardList;
        }

        if (!$resolvedBoardList || !$this->canReadBoardList($user, $resolvedBoardList)) {
            return false;
        }

        if ($this->canBypassCardMemberVisibility($user)) {
            return true;
        }

        $isCardMember = $boardCard->members()
            ->where('users.id', $user->id)
            ->exists();

        if ($this->requiresExplicitCardMembership($user)) {
            if (
                $this->canReadAllCardsInOpenVisibilityLists($user) &&
                $this->isOpenVisibilityList($resolvedBoardList)
            ) {
                return true;
            }

            return $isCardMember;
        }

        $hasMemberRestriction = $boardCard->members()->exists();
        if (!$hasMemberRestriction) {
            return true;
        }

        return $isCardMember;
    }

    private function canAccessBoardCardForWrite($user, BoardCard $boardCard, ?BoardList $boardList = null): bool
    {
        $resolvedBoardList = $boardList;
        if (!$resolvedBoardList) {
            $boardCard->loadMissing('boardList');
            $resolvedBoardList = $boardCard->boardList;
        }

        if (!$resolvedBoardList || !$this->canReadBoardList($user, $resolvedBoardList)) {
            return false;
        }

        if ($this->canBypassCardMemberVisibility($user)) {
            return true;
        }

        $isCardMember = $boardCard->members()
            ->where('users.id', $user->id)
            ->exists();

        if ($this->requiresExplicitCardMembership($user)) {
            if (
                $this->canReadAllCardsInOpenVisibilityLists($user) &&
                $this->isOpenVisibilityList($resolvedBoardList)
            ) {
                return true;
            }

            return $isCardMember;
        }

        $hasMemberRestriction = $boardCard->members()->exists();
        if (!$hasMemberRestriction) {
            return true;
        }

        return $isCardMember;
    }

    private function canAccessBoardCardExtendedWrite($user, BoardCard $boardCard, ?BoardList $boardList = null): bool
    {
        $resolvedBoardList = $boardList;
        if (!$resolvedBoardList) {
            $boardCard->loadMissing('boardList');
            $resolvedBoardList = $boardCard->boardList;
        }

        return $this->canAccessBoardCardForWrite($user, $boardCard, $resolvedBoardList);
    }

    private function assertCanAccessBoardId(int $boardId): void
    {
        $user = Auth::user();

        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        $board = Board::query()->select('id', 'name')->find($boardId);
        if (!$board) {
            abort(404);
        }

        if ($this->isCommissionBoardName($board->name ?? null) && (int) $user->role_id !== 1) {
            abort(403, 'Forbidden');
        }

        // Superadmin can access everything.
        if ((int) $user->role_id === 1) {
            return;
        }

        if (!$user->boards()->whereKey($boardId)->exists()) {
            abort(403, 'Forbidden');
        }
    }

    private function assertCanAccessBoardList(BoardList $boardList): void
    {
        $this->assertCanAccessBoardId((int) $boardList->board_id);

        $user = Auth::user();
        if ($this->hasAssignedBoardListAccess($user, $boardList)) {
            return;
        }

        abort(403, 'Forbidden');
    }

    private function assertCanReadBoardList(BoardList $boardList): void
    {
        $this->assertCanAccessBoardId((int) $boardList->board_id);

        $user = Auth::user();
        if ($this->canReadBoardList($user, $boardList)) {
            return;
        }

        abort(403, 'Forbidden');
    }

    private function assertCanAccessBoardCard(BoardCard $boardCard): void
    {
        $user = Auth::user();
        $boardCard->loadMissing('boardList');

        $boardList = $boardCard->boardList;
        if (!$boardList) {
            abort(404);
        }

        $this->assertCanAccessBoardId((int) $boardList->board_id);
        if ($this->canAccessBoardCardForWrite($user, $boardCard, $boardList)) {
            return;
        }

        abort(403, 'Forbidden');
    }

    private function assertCanAccessBoardCardExtendedWrite(BoardCard $boardCard): void
    {
        $user = Auth::user();
        $boardCard->loadMissing('boardList');

        $boardList = $boardCard->boardList;
        if (!$boardList) {
            abort(404);
        }

        $this->assertCanAccessBoardId((int) $boardList->board_id);
        if ($this->canAccessBoardCardExtendedWrite($user, $boardCard, $boardList)) {
            return;
        }

        abort(403, 'Forbidden');
    }

    private function assertCanReadBoardCard(BoardCard $boardCard): void
    {
        $user = Auth::user();
        $boardCard->loadMissing('boardList');

        $boardList = $boardCard->boardList;
        if (!$boardList) {
            abort(404);
        }

        $this->assertCanAccessBoardId((int) $boardList->board_id);
        if ($this->canReadBoardCard($user, $boardCard, $boardList)) {
            return;
        }

        abort(403, 'Forbidden');
    }

    private function eligibleMemberUsersQuery(BoardCard $boardCard)
    {
        $boardCard->loadMissing('boardList');
        $boardList = $boardCard->boardList;

        if (!$boardList) {
            abort(404);
        }

        $query = User::query()
            ->select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role_id')
            ->orderBy('users.first_name')
            ->orderBy('users.last_name');

        $manageableRoleIds = $this->manageableMemberRoleIds(Auth::user());
        if (empty($manageableRoleIds)) {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereIn('users.role_id', $manageableRoleIds);
    }

    // Helper to get logged user full name
    private function userFullName()
    {
        $user = Auth::user();

        return trim(
            ($user->first_name ?? '') . ' ' . ($user->last_name ?? '')
        ) ?: 'Guest';
    }

    private function normalizeIdArray($value): array
    {
        return collect(is_array($value) ? $value : [])
            ->filter(fn ($id) => !is_null($id) && $id !== '')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function extractCardLabelIds($singleId, $multipleIds): array
    {
        return collect($this->normalizeIdArray($multipleIds))
            ->merge(!is_null($singleId) ? [(int) $singleId] : [])
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function resolveModelNamesByIds(string $modelClass, array $ids, string $fallbackPrefix): array
    {
        $normalizedIds = $this->normalizeIdArray($ids);
        if (empty($normalizedIds)) {
            return [];
        }

        $namesById = $modelClass::query()
            ->whereIn('id', $normalizedIds)
            ->pluck('name', 'id');

        return collect($normalizedIds)
            ->map(fn ($id) => (string) ($namesById[$id] ?? ($fallbackPrefix . ' #' . $id)))
            ->all();
    }

    private function formatActivityList(array $values, string $empty = 'None'): string
    {
        $clean = collect($values)
            ->map(fn ($value) => trim((string) $value))
            ->filter(fn ($value) => $value !== '')
            ->values()
            ->all();

        return empty($clean) ? $empty : implode(', ', $clean);
    }

    private function formatActivityValue(?string $value, ?int $limit = 180): string
    {
        $text = trim((string) $value);
        if ($text === '') {
            return '[empty]';
        }

        $singleLine = preg_replace('/\s+/', ' ', $text);
        $singleLine = is_string($singleLine) ? trim($singleLine) : $text;

        if (!is_null($limit) && $limit > 0) {
            return '"' . Str::limit($singleLine, $limit) . '"';
        }

        return '"' . $singleLine . '"';
    }

    private function formatActivityChange(?string $oldValue, ?string $newValue, ?int $limit = 180): string
    {
        return $this->formatActivityValue($oldValue, $limit) . ' -> ' . $this->formatActivityValue($newValue, $limit);
    }

    private function formatUserDisplayName(User $user): string
    {
        $fullName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
        if ($fullName !== '') {
            return $fullName;
        }

        if (!empty($user->email)) {
            return (string) $user->email;
        }

        return 'User #' . $user->id;
    }

    private function resolveUserNamesByIds(array $ids): array
    {
        $normalizedIds = $this->normalizeIdArray($ids);
        if (empty($normalizedIds)) {
            return [];
        }

        $usersById = User::query()
            ->whereIn('id', $normalizedIds)
            ->get(['id', 'first_name', 'last_name', 'email'])
            ->keyBy('id');

        return collect($normalizedIds)
            ->map(function ($id) use ($usersById) {
                $user = $usersById->get($id);
                if (!$user) {
                    return 'User #' . $id;
                }

                return $this->formatUserDisplayName($user);
            })
            ->all();
    }

    private function normalizeInvoiceValue(?string $invoice): string
    {
        $normalized = preg_replace('/\s+/', ' ', trim((string) $invoice));
        return is_string($normalized) ? $normalized : trim((string) $invoice);
    }

    private function isDuplicateInvoiceException(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());
        if ($sqlState !== '23000' && $sqlState !== '23505') {
            return false;
        }

        $message = strtolower($exception->getMessage());
        return str_contains($message, 'board_cards_invoice_unique')
            || str_contains($message, 'duplicate entry')
            || str_contains($message, 'unique constraint');
    }

    private function duplicateInvoiceResponse()
    {
        return response()->json([
            'message' => 'Invoice already exists. Please use a unique invoice.',
            'errors' => [
                'invoice' => ['This invoice has already been taken.'],
            ],
        ], 422);
    }

    // GET all cards in a list
    public function index(BoardList $boardList)
    {
        $this->assertCanReadBoardList($boardList);

        $query = $boardList->cards()
            ->where('is_archived', false)
            ->orderBy('position');

        $user = Auth::user();
        $this->applyCardVisibilityScope($query, $user);

        return response()->json($query->get());
    }

    // GET archived cards in a board
    public function archivedByBoard(Board $board)
    {
        $this->assertCanAccessBoardId((int) $board->id);

        $user = Auth::user();

        $query = BoardCard::query()
            ->where('is_archived', true)
            ->whereHas('boardList', function ($listQuery) use ($board) {
                $listQuery->where('board_id', $board->id);
            })
            ->with([
                'boardList:id,title,board_id',
                'members:id,first_name,last_name,email',
            ])
            ->orderByDesc('updated_at');

        if (!$this->canReadAllBoardLists($user)) {
            $query->where(function ($visibleQuery) use ($user) {
                $visibleQuery->whereHas('boardList.users', function ($userQuery) use ($user) {
                    $userQuery->where('users.id', $user->id);
                });
            });
        }

        $this->applyCardVisibilityScope($query, $user);

        return response()->json($query->get());
    }

    // Archive / unarchive card
    public function updateArchiveStatus(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCardExtendedWrite($boardCard);

        $validated = $request->validate([
            'is_archived' => 'required|boolean',
        ]);

        $nextStatus = (bool) $validated['is_archived'];
        $previousStatus = (bool) $boardCard->is_archived;

        $boardCard->update([
            'is_archived' => $nextStatus,
        ]);

        if ($nextStatus !== $previousStatus) {
            Activity::create([
                'user_id'   => Auth::id(),
                'user_name' => $this->userFullName(),
                'card_id'   => $boardCard->id,
                'list_id'   => $boardCard->board_list_id,
                'action'    => $nextStatus ? 'archived card' : 'restored card',
                'details'   => $boardCard->invoice ?: ('Card #' . $boardCard->id),
            ]);
        }

        return response()->json($boardCard->fresh());
    }

    // CREATE card + log activity
    public function store(Request $request, BoardList $boardList)
    {
        $this->assertCanAccessBoardList($boardList);

        $request->merge([
            'invoice' => $this->normalizeInvoiceValue($request->input('invoice')),
        ]);

        $validated = $request->validate([
            'invoice'       => ['required', 'string', 'max:255', Rule::unique('board_cards', 'invoice')],
            'first_name'    => 'nullable|string|max:255',
            'last_name'     => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'description'   => 'nullable|string',
            'position'      => 'nullable|integer|min:0',
            'checked'       => 'nullable|boolean',
        ]);

        // Auto position
        $maxPosition = $boardList->cards()->max('position') ?? 0;
        try {
            $card = $boardList->cards()->create([
                'invoice'       => $validated['invoice'],
                'first_name'    => $validated['first_name'] ?? null,
                'last_name'     => $validated['last_name'] ?? null,
                'contact_email' => $validated['contact_email'] ?? null,
                'description'   => $validated['description'] ?? null,
                'position'      => $validated['position'] ?? $maxPosition + 10000,
                'checked'       => $validated['checked'] ?? false,
            ]);
        } catch (QueryException $exception) {
            if ($this->isDuplicateInvoiceException($exception)) {
                return $this->duplicateInvoiceResponse();
            }
            throw $exception;
        }

        try {
            Activity::create([
                'user_id'   => Auth::id(),
                'user_name' => $this->userFullName(),
                'card_id'   => $card->id,
                'list_id'   => $boardList->id,
                'action'    => 'created card',
                'details'   => trim(($card->first_name ?? '') . ' ' . ($card->last_name ?? '')),
            ]);
        } catch (\Throwable $exception) {
            // Card was created successfully; keep API response successful even if activity log fails.
            report($exception);
        }

        try {
            // Only creates the card's own folder synchronously; subfolders and
            // sharing happen in the background (see BuildCardDriveFolderStructure)
            // so creating a card doesn't wait on the Drive API more than once.
            $this->ensureCardDriveFolder($card);
        } catch (\Throwable $exception) {
            // Card was created successfully; Drive folder creation is best-effort.
            report($exception);
        }

        return response()->json($card->fresh(), 201);
    }

    public function show(BoardList $boardList, BoardCard $boardCard)
    {
        if ((int) $boardCard->board_list_id !== (int) $boardList->id) {
            return response()->json(['message' => 'Card not found in this list'], 404);
        }

        $this->assertCanReadBoardCard($boardCard);

        return response()->json(
            $boardCard->load([
                'members:id,first_name,last_name,role_id,email',
                'countryLabel:id,name',
                'intakeLabel:id,name',
                'serviceArea:id,name',
            ])
        );
    }

    // UPDATE card (general)
    public function update(Request $request, BoardList $boardList, BoardCard $boardCard)
    {
        if ((int) $boardCard->board_list_id !== (int) $boardList->id) {
            return response()->json(['message' => 'Card not found in this list'], 404);
        }

        $this->assertCanAccessBoardCard($boardCard);
        $boardCard->loadMissing('boardList');

        if ($request->has('invoice')) {
            $request->merge([
                'invoice' => $this->normalizeInvoiceValue($request->input('invoice')),
            ]);
        }

        $validated = $request->validate([
            'invoice'       => ['sometimes', 'filled', 'string', 'max:255', Rule::unique('board_cards', 'invoice')->ignore($boardCard->id)],
            'first_name'    => 'sometimes|nullable|string|max:255',
            'last_name'     => 'sometimes|nullable|string|max:255',
            'contact_email' => 'sometimes|nullable|email|max:255',
            'description'   => 'sometimes|nullable|string',
            'position'      => 'sometimes|integer|min:0',
            'checked'       => 'sometimes|boolean',
            'board_list_id' => 'sometimes|exists:board_lists,id',
        ]);

        if (array_key_exists('board_list_id', $validated)) {
            $targetList = BoardList::findOrFail((int) $validated['board_list_id']);
            $currentList = $boardCard->boardList;

            if (!$currentList || (int) $targetList->board_id !== (int) $currentList->board_id) {
                return response()->json(['message' => 'Cards cannot be moved across boards'], 422);
            }

            $this->assertCanAccessBoardList($targetList);

            $currentCategory = (int) (($currentList->category ?? BoardList::CATEGORY_ADMISSION));
            $targetCategory = (int) ($targetList->category ?? BoardList::CATEGORY_ADMISSION);
            if (
                $targetCategory === BoardList::CATEGORY_VISA
                && $currentCategory !== BoardList::CATEGORY_VISA
                && !$boardCard->payment_done
            ) {
                return response()->json([
                    'message' => 'Payment must be marked done before moving this card to Visa',
                ], 422);
            }

            if (
                $targetCategory === BoardList::CATEGORY_DEPENDANT_VISA
                && $currentCategory !== BoardList::CATEGORY_DEPENDANT_VISA
                && !$boardCard->dependant_payment_done
            ) {
                return response()->json([
                    'message' => 'Dependant payment must be marked done before moving this card to Dependant Visa',
                ], 422);
            }
        }

        $beforeInvoice = (string) ($boardCard->invoice ?? '');
        $beforeFirstName = (string) ($boardCard->first_name ?? '');
        $beforeLastName = (string) ($boardCard->last_name ?? '');
        $beforeContactEmail = (string) ($boardCard->contact_email ?? '');
        $beforeDescription = (string) ($boardCard->description ?? '');

        try {
            $boardCard->update($validated);
        } catch (QueryException $exception) {
            if ($this->isDuplicateInvoiceException($exception)) {
                return $this->duplicateInvoiceResponse();
            }
            throw $exception;
        }

        $changeLines = [];

        if (array_key_exists('invoice', $validated)) {
            $afterInvoice = (string) ($boardCard->invoice ?? '');
            if (trim($beforeInvoice) !== trim($afterInvoice)) {
                $changeLines[] = 'Invoice: ' . $this->formatActivityChange($beforeInvoice, $afterInvoice, 120);
            }
        }

        if (array_key_exists('first_name', $validated)) {
            $afterFirstName = (string) ($boardCard->first_name ?? '');
            if (trim($beforeFirstName) !== trim($afterFirstName)) {
                $changeLines[] = 'First name: ' . $this->formatActivityChange($beforeFirstName, $afterFirstName, 120);
            }
        }

        if (array_key_exists('last_name', $validated)) {
            $afterLastName = (string) ($boardCard->last_name ?? '');
            if (trim($beforeLastName) !== trim($afterLastName)) {
                $changeLines[] = 'Last name: ' . $this->formatActivityChange($beforeLastName, $afterLastName, 120);
            }
        }

        if (array_key_exists('contact_email', $validated)) {
            $afterContactEmail = (string) ($boardCard->contact_email ?? '');
            if (trim($beforeContactEmail) !== trim($afterContactEmail)) {
                $changeLines[] = 'Contact email: ' . $this->formatActivityChange($beforeContactEmail, $afterContactEmail, 120);
            }
        }

        if (array_key_exists('description', $validated)) {
            $afterDescription = (string) ($boardCard->description ?? '');
            if (trim($beforeDescription) !== trim($afterDescription)) {
                $changeLines[] = 'Description: ' . $this->formatActivityChange($beforeDescription, $afterDescription, null);
            }
        }

        if (array_key_exists('contact_email', $validated)) {
            try {
                // If this call just created the folder, BuildCardDriveFolderStructure
                // is already dispatched and will build the structure + call
                // syncCardDriveAccess itself once done - calling it again here
                // would race it and create duplicate top-level subfolders.
                if (!$this->ensureCardDriveFolder($boardCard)) {
                    $this->syncCardDriveAccess($boardCard);
                }
            } catch (\Throwable $exception) {
                // Card update succeeded; Drive permission sync is best-effort.
                report($exception);
            }
        }

        if (!empty($changeLines)) {
            try {
                Activity::create([
                    'user_id'   => Auth::id(),
                    'user_name' => $this->userFullName(),
                    'card_id'   => $boardCard->id,
                    'action'    => 'updated card details',
                    'details'   => implode("\n", $changeLines),
                ]);
            } catch (\Throwable $exception) {
                // Keep the main card update successful even if activity logging fails.
                report($exception);
            }
        }

        return response()->json($boardCard);
    }

    // MOVE card + log activity
    public function move(Request $request)
    {
        $validated = $request->validate([
            'card_id'    => 'required|exists:board_cards,id',
            'to_list_id' => 'required|exists:board_lists,id',
            'position'   => 'required|integer|min:0',
        ]);

        $card = BoardCard::findOrFail($validated['card_id']);

        $card->loadMissing('boardList');
        $oldList = $card->boardList;
        if (!$oldList) {
            abort(404);
        }

        $newList = BoardList::findOrFail($validated['to_list_id']);

        // Prevent cross-board moves and enforce board access.
        if ((int) $newList->board_id !== (int) $oldList->board_id) {
            return response()->json(['message' => 'Cards cannot be moved across boards'], 422);
        }

        $this->assertCanAccessBoardId((int) $oldList->board_id);
        $this->assertCanReadBoardList($newList);
        $this->assertCanReadBoardCard($card);

        $oldCategory = (int) (($oldList->category ?? BoardList::CATEGORY_ADMISSION));
        $targetCategory = (int) ($newList->category ?? BoardList::CATEGORY_ADMISSION);
        if (
            $targetCategory === BoardList::CATEGORY_VISA
            && $oldCategory !== BoardList::CATEGORY_VISA
            && !$card->payment_done
        ) {
            return response()->json([
                'message' => 'Payment must be marked done before moving this card to Visa',
            ], 422);
        }

        if (
            $targetCategory === BoardList::CATEGORY_DEPENDANT_VISA
            && $oldCategory !== BoardList::CATEGORY_DEPENDANT_VISA
            && !$card->dependant_payment_done
        ) {
            return response()->json([
                'message' => 'Dependant payment must be marked done before moving this card to Dependant Visa',
            ], 422);
        }

        $oldTitle = $oldList->title ?? 'Previous List';
        $newTitle = $newList->title ?? 'New List';

        $card->update([
            'board_list_id' => $validated['to_list_id'],
            'position'      => $validated['position'],
        ]);

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $card->id,
            'list_id'   => $newList->id,
            'action'    => 'moved card',
            'details'   => "from \"$oldTitle\" to \"$newTitle\"",
        ]);

        return response()->json([
            'message' => 'Card moved successfully',
            'card'    => $card
        ]);
    }

    // GET commission board target lists for a card
    public function commissionMoveTargets(BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $user = Auth::user();
        if (!$user || (int) $user->role_id !== 1) {
            return response()->json([
                'message' => 'Only superadmin can move cards to Commission Board',
            ], 403);
        }

        $boardCard->loadMissing('boardList.board');
        $sourceList = $boardCard->boardList;
        $sourceBoard = $sourceList?->board;
        if (!$sourceList || !$sourceBoard) {
            return response()->json(['message' => 'Card source list not found'], 404);
        }

        $commissionBoardBaseQuery = Board::query()
            ->where(function ($query) {
                $query
                    ->whereRaw('LOWER(name) = ?', ['commission board'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%commission%']);
            })
            ->orderByRaw("CASE WHEN LOWER(name) = 'commission board' THEN 0 ELSE 1 END")
            ->orderBy('id');

        $commissionBoard = null;
        if (!empty($sourceBoard->city_id)) {
            $commissionBoard = (clone $commissionBoardBaseQuery)
                ->where('city_id', $sourceBoard->city_id)
                ->first();
        }
        if (!$commissionBoard) {
            $commissionBoard = (clone $commissionBoardBaseQuery)->first();
        }

        if (!$commissionBoard) {
            return response()->json([
                'message' => 'Commission Board not found',
            ], 422);
        }

        $this->assertCanAccessBoardId((int) $commissionBoard->id);

        $lists = $commissionBoard->lists()
            ->where('category', BoardList::CATEGORY_COMMISSION_BOARD)
            ->orderBy('position')
            ->get(['id', 'title', 'position']);

        return response()->json([
            'board' => [
                'id' => $commissionBoard->id,
                'name' => $commissionBoard->name,
            ],
            'lists' => $lists,
            'default_list_id' => $lists->first()?->id,
        ]);
    }

    // MOVE card to Commission Board
    public function moveToCommissionBoard(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $user = Auth::user();
        if (!$user || (int) $user->role_id !== 1) {
            return response()->json([
                'message' => 'Only superadmin can move cards to Commission Board',
            ], 403);
        }

        $boardCard->loadMissing('boardList.board');
        $sourceList = $boardCard->boardList;
        $sourceBoard = $sourceList?->board;
        if (!$sourceList || !$sourceBoard) {
            return response()->json(['message' => 'Card source list not found'], 404);
        }

        $validated = $request->validate([
            'to_list_id' => 'nullable|integer|exists:board_lists,id',
        ]);

        $commissionBoardBaseQuery = Board::query()
            ->where(function ($query) {
                $query
                    ->whereRaw('LOWER(name) = ?', ['commission board'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%commission%']);
            })
            ->orderByRaw("CASE WHEN LOWER(name) = 'commission board' THEN 0 ELSE 1 END")
            ->orderBy('id');

        $commissionBoard = null;
        if (!empty($sourceBoard->city_id)) {
            $commissionBoard = (clone $commissionBoardBaseQuery)
                ->where('city_id', $sourceBoard->city_id)
                ->first();
        }
        if (!$commissionBoard) {
            $commissionBoard = (clone $commissionBoardBaseQuery)->first();
        }

        if (!$commissionBoard) {
            return response()->json([
                'message' => 'Commission Board not found',
            ], 422);
        }

        $this->assertCanAccessBoardId((int) $commissionBoard->id);

        $targetListQuery = $commissionBoard->lists()
            ->where('category', BoardList::CATEGORY_COMMISSION_BOARD)
            ->orderBy('position');
        if (!empty($validated['to_list_id'])) {
            $targetList = (clone $targetListQuery)
                ->whereKey((int) $validated['to_list_id'])
                ->first();

            if (!$targetList) {
                return response()->json([
                    'message' => 'Selected list does not belong to Commission Board',
                ], 422);
            }
        } else {
            $targetList = $targetListQuery->first();
        }

        if (!$targetList) {
            return response()->json([
                'message' => 'No list found in Commission Board',
            ], 422);
        }

        $this->assertCanAccessBoardList($targetList);

        if ((int) $boardCard->board_list_id === (int) $targetList->id) {
            return response()->json([
                'message' => 'Card is already in the selected Commission Board list',
                'card' => $boardCard->fresh(),
            ]);
        }

        $nextPosition = ((int) ($targetList->cards()->max('position') ?? 0)) + 1;

        $oldListTitle = $sourceList->title ?? 'Unknown List';
        $newListTitle = $targetList->title ?? 'Unknown List';
        $oldBoardTitle = $sourceBoard->name ?? 'Unknown Board';
        $newBoardTitle = $commissionBoard->name ?? 'Commission Board';

        $boardCard->update([
            'board_list_id' => $targetList->id,
            'position' => $nextPosition,
        ]);

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'list_id'   => $targetList->id,
            'action'    => 'moved card to commission board',
            'details'   => "from \"$oldBoardTitle / $oldListTitle\" to \"$newBoardTitle / $newListTitle\"",
        ]);

        return response()->json([
            'message' => 'Card moved to Commission Board successfully',
            'card' => $boardCard->fresh(),
            'target_board' => [
                'id' => $commissionBoard->id,
                'name' => $commissionBoard->name,
            ],
            'target_list' => [
                'id' => $targetList->id,
                'title' => $targetList->title,
            ],
        ]);
    }

    // DELETE card
    public function destroy(BoardList $boardList, BoardCard $boardCard)
    {
        if ((int) $boardCard->board_list_id !== (int) $boardList->id) {
            return response()->json(['message' => 'Card not found in this list'], 404);
        }

        $this->assertCanAccessBoardCard($boardCard);

        $boardCard->delete();

        return response()->json(['message' => 'Card deleted']);
    }

    // Update labels + log
    public function updateLabel(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCardExtendedWrite($boardCard);

        $beforeCountryIds = $this->extractCardLabelIds($boardCard->country_label_id, $boardCard->country_label_ids);
        $beforeIntakeId = !is_null($boardCard->intake_label_id) ? (int) $boardCard->intake_label_id : null;
        $beforeServiceAreaIds = $this->extractCardLabelIds($boardCard->service_area_id, $boardCard->service_area_ids);

        $validated = $request->validate([
            'country_label_id' => 'nullable|exists:country_labels,id',
            'country_label_ids' => 'nullable|array',
            'country_label_ids.*' => 'integer|exists:country_labels,id',
            'intake_label_id'  => 'nullable|exists:intake_labels,id',
            'service_area_id'  => 'nullable|exists:service_areas,id',
            'service_area_ids' => 'nullable|array',
            'service_area_ids.*' => 'integer|exists:service_areas,id',
        ]);

        $payload = [];

        if (
            array_key_exists('country_label_id', $validated) ||
            array_key_exists('country_label_ids', $validated)
        ) {
            $countryIds = collect($validated['country_label_ids'] ?? [])
                ->merge(isset($validated['country_label_id']) ? [$validated['country_label_id']] : [])
                ->filter(fn ($id) => !is_null($id))
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();

            $payload['country_label_ids'] = $countryIds->isEmpty() ? null : $countryIds->all();
            $payload['country_label_id'] = $countryIds->first();
        }

        if (array_key_exists('intake_label_id', $validated)) {
            $payload['intake_label_id'] = $validated['intake_label_id'];
        }

        if (
            array_key_exists('service_area_id', $validated) ||
            array_key_exists('service_area_ids', $validated)
        ) {
            $serviceIds = collect($validated['service_area_ids'] ?? [])
                ->merge(isset($validated['service_area_id']) ? [$validated['service_area_id']] : [])
                ->filter(fn ($id) => !is_null($id))
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();

            $payload['service_area_ids'] = $serviceIds->isEmpty() ? null : $serviceIds->all();
            $payload['service_area_id'] = $serviceIds->first();
        }

        if (!empty($payload)) {
            $boardCard->update($payload);
        }

        $boardCard->refresh();

        $afterCountryIds = $this->extractCardLabelIds($boardCard->country_label_id, $boardCard->country_label_ids);
        $afterIntakeId = !is_null($boardCard->intake_label_id) ? (int) $boardCard->intake_label_id : null;
        $afterServiceAreaIds = $this->extractCardLabelIds($boardCard->service_area_id, $boardCard->service_area_ids);

        $changeLines = [];

        if ($beforeCountryIds !== $afterCountryIds) {
            $beforeCountryNames = $this->resolveModelNamesByIds(CountryLabel::class, $beforeCountryIds, 'Country');
            $afterCountryNames = $this->resolveModelNamesByIds(CountryLabel::class, $afterCountryIds, 'Country');
            $changeLines[] = 'Country: ' . $this->formatActivityList($beforeCountryNames) . ' -> ' . $this->formatActivityList($afterCountryNames);
        }

        if ($beforeIntakeId !== $afterIntakeId) {
            $beforeIntakeNames = $beforeIntakeId ? $this->resolveModelNamesByIds(IntakeLabel::class, [$beforeIntakeId], 'Intake') : [];
            $afterIntakeNames = $afterIntakeId ? $this->resolveModelNamesByIds(IntakeLabel::class, [$afterIntakeId], 'Intake') : [];
            $changeLines[] = 'Intake: ' . $this->formatActivityList($beforeIntakeNames) . ' -> ' . $this->formatActivityList($afterIntakeNames);
        }

        if ($beforeServiceAreaIds !== $afterServiceAreaIds) {
            $beforeServiceNames = $this->resolveModelNamesByIds(ServiceArea::class, $beforeServiceAreaIds, 'Service area');
            $afterServiceNames = $this->resolveModelNamesByIds(ServiceArea::class, $afterServiceAreaIds, 'Service area');
            $changeLines[] = 'Service area: ' . $this->formatActivityList($beforeServiceNames) . ' -> ' . $this->formatActivityList($afterServiceNames);
        }

        if (!empty($changeLines)) {
            Activity::create([
                'user_id'   => Auth::id(),
                'user_name' => $this->userFullName(),
                'card_id'   => $boardCard->id,
                'action'    => 'updated labels',
                'details'   => implode("\n", $changeLines),
            ]);
        }

        return response()->json(
            $boardCard->fresh(['countryLabel', 'intakeLabel', 'serviceArea'])
        );
    }

    // Update description
    public function updateDescription(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCardExtendedWrite($boardCard);

        $beforeDescription = (string) ($boardCard->description ?? '');

        $validated = $request->validate([
            'description' => 'nullable|string',
        ]);

        $nextDescription = (string) ($validated['description'] ?? '');
        if (trim($beforeDescription) === trim($nextDescription)) {
            return response()->json($boardCard->fresh());
        }

        $boardCard->update([
            'description' => $validated['description'] ?? null,
        ]);

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'updated description',
            'details'   => 'Description: ' . $this->formatActivityChange($beforeDescription, $nextDescription, null),
        ]);

        return response()->json($boardCard->fresh());
    }

    // Update payment status
    public function updatePaymentStatus(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCardExtendedWrite($boardCard);

        if (!$this->canManagePaymentStatus(Auth::user())) {
            return response()->json(['message' => 'Counsellor cannot update visa payment status'], 403);
        }

        $validated = $request->validate([
            'payment_done' => 'required|boolean',
        ]);

        $newStatus = (bool) $validated['payment_done'];
        $oldStatus = (bool) $boardCard->payment_done;

        $boardCard->update([
            'payment_done' => $newStatus,
        ]);

        if ($newStatus !== $oldStatus) {
            Activity::create([
                'user_id' => Auth::id(),
                'user_name' => $this->userFullName(),
                'card_id' => $boardCard->id,
                'action' => 'updated payment status',
                'details' => $newStatus ? 'Visa payment marked as done' : 'Visa payment marked as pending',
            ]);
        }

        return response()->json($boardCard->fresh());
    }

    // Update dependant payment status
    public function updateDependantPaymentStatus(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCardExtendedWrite($boardCard);

        if (!$this->canManagePaymentStatus(Auth::user())) {
            return response()->json(['message' => 'Counsellor cannot update dependant payment status'], 403);
        }

        $validated = $request->validate([
            'dependant_payment_done' => 'required|boolean',
        ]);

        $newStatus = (bool) $validated['dependant_payment_done'];
        $oldStatus = (bool) $boardCard->dependant_payment_done;

        $boardCard->update([
            'dependant_payment_done' => $newStatus,
        ]);

        if ($newStatus !== $oldStatus) {
            Activity::create([
                'user_id' => Auth::id(),
                'user_name' => $this->userFullName(),
                'card_id' => $boardCard->id,
                'action' => 'updated dependant payment status',
                'details' => $newStatus
                    ? 'Dependant payment marked as done'
                    : 'Dependant payment marked as pending',
            ]);
        }

        return response()->json($boardCard->fresh());
    }

    // Update due date
    public function updateDueDate(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCardExtendedWrite($boardCard);

        $validated = $request->validate([
            'due_date' => 'nullable|date',
        ]);

        $oldDate = $boardCard->due_date ? Carbon::parse($boardCard->due_date)->toDateString() : null;
        $newDate = !empty($validated['due_date']) ? Carbon::parse($validated['due_date'])->toDateString() : null;

        if ($oldDate === $newDate) {
            return response()->json($boardCard->fresh());
        }

        $boardCard->update([
            'due_date' => $validated['due_date'] ?? null,
        ]);

        $oldLabel = $oldDate ? Carbon::parse($oldDate)->format('M d, Y') : 'None';
        $newLabel = $newDate ? Carbon::parse($newDate)->format('M d, Y') : 'None';

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'updated due date',
            'details'   => 'Due date: ' . $oldLabel . ' -> ' . $newLabel,
        ]);

        return response()->json($boardCard->fresh());
    }

    // GET card members + eligible member options
    public function members(BoardCard $boardCard)
    {
        $this->assertCanReadBoardCard($boardCard);

        $user = Auth::user();
        $canManage = $this->canManageCardMembers($user)
            && $this->canAccessBoardCardExtendedWrite($user, $boardCard);

        $members = $boardCard->members()
            ->select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role_id')
            ->orderBy('users.first_name')
            ->orderBy('users.last_name')
            ->get();

        $options = collect();
        if ($canManage) {
            $memberIds = $members->pluck('id')->all();

            $optionsQuery = $this->eligibleMemberUsersQuery($boardCard);
            if (!empty($memberIds)) {
                $optionsQuery->orWhereIn('users.id', $memberIds);
            }

            $options = $optionsQuery->distinct()->get();
        }

        return response()->json([
            'can_manage' => $canManage,
            'members' => $members,
            'options' => $options,
        ]);
    }

    // UPDATE card member visibility
    public function updateMembers(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCardExtendedWrite($boardCard);

        $user = Auth::user();
        if (!$this->canManageCardMembers($user)) {
            return response()->json(['message' => 'You are not allowed to manage card members'], 403);
        }

        $validated = $request->validate([
            'user_ids' => 'array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $existingMemberIds = $boardCard->members()
            ->pluck('users.id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values();

        $requestedIds = collect($validated['user_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values();

        $allowedIds = $this->eligibleMemberUsersQuery($boardCard)
            ->pluck('users.id')
            ->map(fn ($id) => (int) $id)
            ->merge($existingMemberIds)
            ->unique()
            ->values();

        $invalidIds = $requestedIds->diff($allowedIds);
        if ($invalidIds->isNotEmpty()) {
            return response()->json([
                'message' => 'One or more selected users are not eligible for this card',
            ], 422);
        }

        // Ensure card assignees can actually see the full hierarchy:
        // city -> board -> list -> card
        $boardCard->loadMissing('boardList.board');
        $boardList = $boardCard->boardList;
        $board = $boardList?->board;

        if ($boardList && $requestedIds->isNotEmpty()) {
            $ids = $requestedIds->all();

            $boardList->users()->syncWithoutDetaching($ids);

            if ($board) {
                $board->users()->syncWithoutDetaching($ids);

                if (!empty($board->city_id)) {
                    $city = City::find($board->city_id);
                    if ($city) {
                        $city->users()->syncWithoutDetaching($ids);
                    }
                }
            }
        }

        $boardCard->members()->sync($requestedIds->all());

        try {
            // See the contact_email branch above for why this is guarded.
            if (!$this->ensureCardDriveFolder($boardCard)) {
                $this->syncCardDriveAccess($boardCard);
            }
        } catch (\Throwable $exception) {
            // Member update succeeded; Drive permission sync is best-effort.
            report($exception);
        }

        $addedIds = $requestedIds->diff($existingMemberIds)->values()->all();
        $removedIds = $existingMemberIds->diff($requestedIds)->values()->all();
        $visibilityChanged = $requestedIds->isEmpty() !== $existingMemberIds->isEmpty();

        $detailLines = [];
        if ($visibilityChanged) {
            $detailLines[] = $requestedIds->isEmpty()
                ? 'Visibility: restricted members -> everyone with board access'
                : 'Visibility: everyone with board access -> restricted members';
        }

        if (!empty($addedIds)) {
            $detailLines[] = 'Added members: ' . $this->formatActivityList($this->resolveUserNamesByIds($addedIds));
        }

        if (!empty($removedIds)) {
            $detailLines[] = 'Removed members: ' . $this->formatActivityList($this->resolveUserNamesByIds($removedIds));
        }

        $hasMemberChanges = $visibilityChanged || !empty($addedIds) || !empty($removedIds);

        if ($hasMemberChanges && $requestedIds->isNotEmpty()) {
            $detailLines[] = 'Current members: ' . $this->formatActivityList($this->resolveUserNamesByIds($requestedIds->all()));
        }

        if ($hasMemberChanges && !empty($detailLines)) {
            Activity::create([
                'user_id'   => Auth::id(),
                'user_name' => $this->userFullName(),
                'card_id'   => $boardCard->id,
                'action'    => 'updated members',
                'details'   => implode("\n", $detailLines),
            ]);
        }

        $members = $boardCard->members()
            ->select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role_id')
            ->orderBy('users.first_name')
            ->orderBy('users.last_name')
            ->get();

        return response()->json([
            'message' => 'Card members updated successfully',
            'members' => $members,
        ]);
    }

    // GET Google Drive folder info for a card (lazily creates the folder if missing)
    public function driveInfo(BoardCard $boardCard)
    {
        $this->assertCanReadBoardCard($boardCard);

        if (!$this->driveService->isOAuthEnabled() && !$boardCard->google_drive_folder_id) {
            return response()->json([
                'enabled' => false,
                'folder_link' => null,
                'members' => [],
            ]);
        }

        try {
            // Same race as above: if this request is the one that creates the
            // folder, BuildCardDriveFolderStructure already owns building the
            // rest of the structure in the background - don't duplicate it by
            // also creating "Client Uploaded Files" synchronously here just
            // because the job hasn't reached it yet.
            if (!$this->ensureCardDriveFolder($boardCard)) {
                $this->ensureClientUploadsSubfolder($boardCard);
            }
        } catch (\Throwable $exception) {
            report($exception);
        }

        $boardCard->refresh();

        $members = $boardCard->members()
            ->select('users.id', 'users.first_name', 'users.last_name', 'users.email')
            ->orderBy('users.first_name')
            ->orderBy('users.last_name')
            ->get();

        // Everyone with access to the card's Shared Drive is a real member of
        // it, so there's no separate "client_uploads only" link to hand out -
        // the main link IS their access.
        return response()->json([
            'enabled' => true,
            'folder_id' => $boardCard->google_drive_folder_id,
            'folder_link' => $boardCard->google_drive_folder_link,
            'scope' => 'full',
            'error' => $boardCard->google_drive_folder_id ? null : $this->driveService->getLastError(),
            'synced_at' => $boardCard->google_drive_synced_at,
            'contact_email' => $boardCard->contact_email,
            'members' => $members,
        ]);
    }

    // GET activities for a card
    public function activities(BoardCard $boardCard)
    {
        $this->assertCanReadBoardCard($boardCard);

        return response()->json(
            Activity::where('card_id', $boardCard->id)->latest()->get()
        );
    }

    // GET activities for a board (all cards/lists user can access)
    public function boardActivities(Request $request, Board $board)
    {
        $this->assertCanAccessBoardId((int) $board->id);

        $validated = $request->validate([
            'tab' => 'nullable|string|in:all,comment,comments,coment',
            'limit' => 'nullable|integer|min:1|max:500',
        ]);

        $user = Auth::user();
        $tab = strtolower((string) ($validated['tab'] ?? 'all'));
        $commentsOnly = in_array($tab, ['comment', 'comments', 'coment'], true);
        $limit = (int) ($validated['limit'] ?? 200);

        $query = Activity::query()
            ->where(function ($scope) use ($board) {
                $scope
                    ->whereHas('card.boardList', function ($listQuery) use ($board) {
                        $listQuery->where('board_id', $board->id);
                    })
                    ->orWhereHas('list', function ($listQuery) use ($board) {
                        $listQuery->where('board_id', $board->id);
                    });
            })
            ->with([
                'card' => function ($cardQuery) {
                    $cardQuery
                        ->select('id', 'board_list_id', 'invoice', 'first_name', 'last_name')
                        ->with(['boardList:id,title']);
                },
                'list:id,board_id,title',
            ])
            ->latest();

        if ($commentsOnly) {
            $query->where('action', 'commented');
        }

        if (!$this->canReadAllBoardLists($user)) {
            $query->where(function ($scope) use ($user) {
                $scope
                    ->whereHas('card.boardList.users', function ($userQuery) use ($user) {
                        $userQuery->where('users.id', $user->id);
                    })
                    ->orWhereHas('list.users', function ($userQuery) use ($user) {
                        $userQuery->where('users.id', $user->id);
                    });
            });
        }

        if (!$this->canBypassCardMemberVisibility($user)) {
            $query->where(function ($scope) use ($user) {
                $scope
                    ->whereNull('card_id')
                    ->orWhereHas('card', function ($cardQuery) use ($user) {
                        $this->applyCardVisibilityScope($cardQuery, $user);
                    });
            });
        }

        return response()->json($query->limit($limit)->get());
    }

    // POST comment
    public function storeComment(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCardExtendedWrite($boardCard);

        $validated = $request->validate([
            'details'    => 'nullable|string|max:2000',
            'attachment' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,csv,txt,zip,rar',
        ]);

        $details = trim((string) ($validated['details'] ?? ''));
        $hasAttachment = $request->hasFile('attachment');

        if ($details === '' && !$hasAttachment) {
            return response()->json([
                'message' => 'Either comment text or attachment is required',
            ], 422);
        }

        $attachmentData = [
            'attachment_path' => null,
            'attachment_name' => null,
            'attachment_mime' => null,
            'attachment_size' => null,
        ];

        if ($hasAttachment) {
            $file = $request->file('attachment');
            $destination = public_path('storage/activity-attachments');
            if (!is_dir($destination)) {
                mkdir($destination, 0755, true);
            }

            $originalName = $file->getClientOriginalName();
            $mimeType = $file->getClientMimeType();
            $size = null;
            try {
                $size = $file->getSize();
            } catch (\Throwable $e) {
                $size = null;
            }

            $extension = $file->getClientOriginalExtension();
            $storedFilename = Str::random(40) . ($extension ? ('.' . $extension) : '');
            $file->move($destination, $storedFilename);

            $attachmentData = [
                'attachment_path' => 'activity-attachments/' . $storedFilename,
                'attachment_name' => $originalName,
                'attachment_mime' => $mimeType,
                'attachment_size' => $size,
            ];
        }

        $activity = Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'commented',
            'details'   => $details !== '' ? $details : null,
            ...$attachmentData,
        ]);

        return response()->json($activity->fresh(), 201);
    }

    // GET attachment file for an activity
    public function downloadAttachment(Activity $activity)
    {
        if (empty($activity->attachment_path)) {
            abort(404, 'Attachment not found');
        }

        if (!empty($activity->card_id)) {
            $card = BoardCard::findOrFail($activity->card_id);
            $this->assertCanReadBoardCard($card);
        } elseif (!empty($activity->list_id)) {
            $list = BoardList::findOrFail($activity->list_id);
            $this->assertCanReadBoardList($list);
        } else {
            abort(403, 'Forbidden');
        }

        $relativePath = ltrim((string) $activity->attachment_path, '/');
        $publicPath = public_path('storage/' . $relativePath);
        $legacyPath = storage_path('app/public/' . $relativePath);

        $filePath = null;
        if (is_file($publicPath)) {
            $filePath = $publicPath;
        } elseif (is_file($legacyPath)) {
            $filePath = $legacyPath;
        }

        if (!$filePath) {
            abort(404, 'Attachment file is missing');
        }

        $headers = [];
        if (!empty($activity->attachment_mime)) {
            $headers['Content-Type'] = $activity->attachment_mime;
        }

        return response()->file($filePath, $headers);
    }

    // General activity logger
    public function logActivity(Request $request)
    {
        $validated = $request->validate([
            'card_id'   => 'nullable|exists:board_cards,id',
            'list_id'   => 'nullable|exists:board_lists,id',
            'action'    => 'required|string|max:100',
            'details'   => 'nullable|string',
        ]);

        if (!empty($validated['card_id'])) {
            $card = BoardCard::findOrFail($validated['card_id']);
            $this->assertCanAccessBoardCard($card);
        }

        if (!empty($validated['list_id'])) {
            $list = BoardList::findOrFail($validated['list_id']);
            $this->assertCanAccessBoardList($list);
        }

        $activity = Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            ...$validated,
        ]);

        return response()->json($activity, 201);
    }
}
