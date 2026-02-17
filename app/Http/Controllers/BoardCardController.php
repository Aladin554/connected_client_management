<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardCard;
use App\Models\BoardList;
use App\Models\Activity;
use App\Models\City;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Carbon\Carbon;

class BoardCardController extends Controller
{
    private function canBypassListPermissions($user): bool
    {
        return (int) $user->role_id === 1;
    }

    private function canBypassCardMemberVisibility($user): bool
    {
        return in_array((int) $user->role_id, [1, 2], true);
    }

    private function canManageCardMembers($user): bool
    {
        return in_array((int) $user->role_id, [1, 2], true);
    }

    private function assertCanAccessBoardId(int $boardId): void
    {
        $user = Auth::user();

        if (!$user) {
            abort(401, 'Unauthenticated');
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
        if ($this->canBypassListPermissions($user)) {
            return;
        }

        $hasListAccess = $user->boardLists()->whereKey($boardList->id)->exists();
        if (!$hasListAccess) {
            abort(403, 'Forbidden');
        }
    }

    private function assertCanAccessBoardCard(BoardCard $boardCard): void
    {
        $user = Auth::user();
        $boardCard->loadMissing('boardList');

        $boardList = $boardCard->boardList;
        if (!$boardList) {
            abort(404);
        }

        $this->assertCanAccessBoardList($boardList);

        if ($this->canBypassCardMemberVisibility($user)) {
            return;
        }

        $hasMemberRestriction = $boardCard->members()->exists();
        if (!$hasMemberRestriction) {
            return;
        }

        $isCardMember = $boardCard->members()
            ->where('users.id', $user->id)
            ->exists();

        if (!$isCardMember) {
            abort(403, 'Forbidden');
        }
    }

    private function eligibleMemberUsersQuery(BoardCard $boardCard)
    {
        $boardCard->loadMissing('boardList');
        $boardList = $boardCard->boardList;

        if (!$boardList) {
            abort(404);
        }

        return User::query()
            ->select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.role_id')
            ->whereIn('users.role_id', [2, 3, 4])
            ->orderBy('users.first_name')
            ->orderBy('users.last_name');
    }

    // Helper to get logged user full name
    private function userFullName()
    {
        $user = Auth::user();

        return trim(
            ($user->first_name ?? '') . ' ' . ($user->last_name ?? '')
        ) ?: 'Guest';
    }

    // GET all cards in a list
    public function index(BoardList $boardList)
    {
        $this->assertCanAccessBoardList($boardList);

        $query = $boardList->cards()
            ->where('is_archived', false)
            ->orderBy('position');

        $user = Auth::user();
        if (!$this->canBypassCardMemberVisibility($user)) {
            $query->where(function ($visibleQuery) use ($user) {
                $visibleQuery
                    ->whereDoesntHave('members')
                    ->orWhereHas('members', function ($memberQuery) use ($user) {
                        $memberQuery->where('users.id', $user->id);
                    });
            });
        }

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

        if (!$this->canBypassListPermissions($user)) {
            $query->whereHas('boardList.users', function ($userQuery) use ($user) {
                $userQuery->where('users.id', $user->id);
            });
        }

        if (!$this->canBypassCardMemberVisibility($user)) {
            $query->where(function ($visibleQuery) use ($user) {
                $visibleQuery
                    ->whereDoesntHave('members')
                    ->orWhereHas('members', function ($memberQuery) use ($user) {
                        $memberQuery->where('users.id', $user->id);
                    });
            });
        }

        return response()->json($query->get());
    }

    // Archive / unarchive card
    public function updateArchiveStatus(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

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

        $validated = $request->validate([
            'invoice'      => 'required|string|max:255|unique:board_cards,invoice',
            'first_name'   => 'nullable|string|max:255',
            'last_name'    => 'nullable|string|max:255',
            'description'  => 'nullable|string',
            'position'     => 'nullable|integer|min:0',
            'checked'      => 'nullable|boolean',
        ]);

        // Auto position
        $maxPosition = $boardList->cards()->max('position') ?? 0;

        $card = $boardList->cards()->create([
            'invoice'     => $validated['invoice'],
            'first_name'  => $validated['first_name'] ?? null,
            'last_name'   => $validated['last_name'] ?? null,
            'description' => $validated['description'] ?? null,
            'position'    => $validated['position'] ?? $maxPosition + 10000,
            'checked'     => $validated['checked'] ?? false,
        ]);

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $card->id,
            'list_id'   => $boardList->id,
            'action'    => 'created card',
            'details'   => trim(($card->first_name ?? '') . ' ' . ($card->last_name ?? '')),
        ]);

        return response()->json($card, 201);
    }

    // UPDATE card (general)
    public function update(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);
        $boardCard->loadMissing('boardList');

        $validated = $request->validate([
            'invoice'       => 'sometimes|string|max:255',
            'first_name'    => 'sometimes|nullable|string|max:255',
            'last_name'     => 'sometimes|nullable|string|max:255',
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

        $boardCard->update($validated);

        if ($request->has('description')) {
            Activity::create([
                'user_id'   => Auth::id(),
                'user_name' => $this->userFullName(),
                'card_id'   => $boardCard->id,
                'action'    => 'updated description',
                'details'   => 'Description was modified',
            ]);
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
        $this->assertCanAccessBoardList($newList);
        $this->assertCanAccessBoardCard($card);

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

    // DELETE card
    public function destroy(BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $boardCard->delete();

        return response()->json(['message' => 'Card deleted']);
    }

    // Update labels + log
    public function updateLabel(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

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

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'updated labels',
            'details'   => 'Country / Intake / Service labels changed',
        ]);

        return response()->json(
            $boardCard->fresh(['countryLabel', 'intakeLabel', 'serviceArea'])
        );
    }

    // Update description
    public function updateDescription(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $validated = $request->validate([
            'description' => 'nullable|string|max:2000',
        ]);

        $boardCard->update($validated);

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'updated description',
            'details'   => 'Description updated',
        ]);

        return response()->json($boardCard->fresh());
    }

    // Update payment status
    public function updatePaymentStatus(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

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
        $this->assertCanAccessBoardCard($boardCard);

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
        $this->assertCanAccessBoardCard($boardCard);

        $validated = $request->validate([
            'due_date' => 'nullable|date',
        ]);

        $oldDate = $boardCard->due_date;
        $newDate = $validated['due_date'];

        $boardCard->update($validated);

        $detail = $oldDate
            ? "changed from " . Carbon::parse($oldDate)->format('M d, Y') . " to " . ($newDate ? Carbon::parse($newDate)->format('M d, Y') : 'unset')
            : ($newDate ? "set to " . Carbon::parse($newDate)->format('M d, Y') : 'removed');

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'updated due date',
            'details'   => $detail,
        ]);

        return response()->json($boardCard->fresh());
    }

    // GET card members + eligible member options
    public function members(BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $user = Auth::user();
        $canManage = $this->canManageCardMembers($user);

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
        $this->assertCanAccessBoardCard($boardCard);

        $user = Auth::user();
        if (!$this->canManageCardMembers($user)) {
            return response()->json(['message' => 'Only superadmin/admin can manage card members'], 403);
        }

        $validated = $request->validate([
            'user_ids' => 'array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $requestedIds = collect($validated['user_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $allowedIds = $this->eligibleMemberUsersQuery($boardCard)
            ->pluck('users.id')
            ->map(fn ($id) => (int) $id);

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

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'updated members',
            'details'   => $requestedIds->isEmpty()
                ? 'Card visibility set to everyone with board access'
                : 'Card visibility restricted to selected members',
        ]);

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

    // GET activities for a card
    public function activities(BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

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

        if (!$this->canBypassListPermissions($user)) {
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
                        $cardQuery->where(function ($visibleCardQuery) use ($user) {
                            $visibleCardQuery
                                ->whereDoesntHave('members')
                                ->orWhereHas('members', function ($memberQuery) use ($user) {
                                    $memberQuery->where('users.id', $user->id);
                                });
                        });
                    });
            });
        }

        return response()->json($query->limit($limit)->get());
    }

    // POST comment
    public function storeComment(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

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
            $this->assertCanAccessBoardCard($card);
        } elseif (!empty($activity->list_id)) {
            $list = BoardList::findOrFail($activity->list_id);
            $this->assertCanAccessBoardList($list);
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
