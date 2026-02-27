<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardCard;
use App\Models\BoardList;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\JsonResponse;
use App\Mail\NewUserCredentialsMail;
use Illuminate\Support\Facades\Mail;

class UserController extends Controller
{
    // --- Helper Methods ---

    protected function authUser(): User
    {
        return Auth::user();
    }

    protected function isAdmin(): bool
    {
        return $this->authUser()->role->name === 'admin';
    }

    protected function isSuperAdmin(): bool
    {
        return $this->authUser()->role->name === 'superadmin';
    }

    protected function canCreateUsers(): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->isAdmin()) {
            return (int) ($this->authUser()->can_create_users ?? 0) === 1;
        }

        return false;
    }

    protected function canManage(User $user): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->isAdmin() && in_array((int) $user->role_id, [3, 4], true)) {
            return true;
        }

        return false;
    }

    /**
     * Base query with common eager loading
     */
    protected function filterUsersForAuth()
    {
        $authUser = $this->authUser();
        $authRoleId = (int) ($authUser->role_id ?? 0);

        $query = User::with([
            'role',
            'cities.boards.lists',
            'boards',
            'boardLists'
        ]);

        if ($this->isSuperAdmin()) {
            return $query;
        }

        if ($this->isAdmin()) {
            // Admin can view role IDs 3 and 4, plus own account.
            return $query->where(function ($q) use ($authUser) {
                $q->whereIn('role_id', [3, 4])
                  ->orWhere('users.id', $authUser->id);
            });
        }

        // Role 3 can view role 3 and 4 users.
        if ($authRoleId === 3) {
            return $query->whereIn('role_id', [3, 4]);
        }

        // Role 4 can only view own user.
        if ($authRoleId === 4) {
            return $query->whereKey($authUser->id);
        }

        // Non-admin / non-superadmin gets no users
        return $query->whereRaw('0 = 1');
    }

    // --- Centralized Validation Rules ---
    protected function validationRules(bool $isUpdate = false, int $userId = 0): array
    {
        return [
            'first_name' => $isUpdate ? 'sometimes|string|max:255' : 'required|string|max:255',
            'last_name'  => $isUpdate ? 'sometimes|string|max:255' : 'required|string|max:255',
            'email'      => $isUpdate
                ? 'sometimes|email|unique:users,email,' . $userId
                : 'required|email|unique:users,email',
            'password'   => $isUpdate ? 'sometimes|min:6' : 'required|min:6',
            'role_id'    => $isUpdate ? 'sometimes|exists:roles,id' : 'required|exists:roles,id',
            'allowed_ips' => $isUpdate ? 'sometimes|array' : 'nullable|array',
            'allowed_ips.*' => 'nullable|ip',
        ];
    }

    protected function sanitizeAllowedIps($value): array
    {
        if (!is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(static function ($ip) {
            return trim((string) $ip);
        }, $value))));
    }

    // --- List Users ---
    public function index(): JsonResponse
    {
        $users = $this->filterUsersForAuth()
            ->get()
            ->map(function (User $user) {
                $payload = $user->toArray();
                $payload['can_create_users'] = (int) ($user->can_create_users ?? 0);
                $payload['panel_permission'] = (int) ($user->panel_permission ?? 0);

                return $payload;
            });

        return response()->json($users);
    }

    // --- Create User ---
    public function store(Request $request): JsonResponse
    {
        if (!$this->canCreateUsers()) {
            return response()->json(['message' => 'Add user permission is inactive'], 403);
        }

        if (!$this->isSuperAdmin() && $request->has('allowed_ips')) {
            return response()->json(['message' => 'Only superadmin can assign IP allowlist'], 403);
        }

        $request->validate($this->validationRules());

        if ($this->isAdmin() && !in_array((int) $request->role_id, [3, 4], true)) {
            return response()->json(['message' => 'Admins can only create roles 3 and 4 users'], 403);
        }

        try {
            $plainPassword = $request->password;

            $user = User::create([
                'first_name' => $request->first_name,
                'last_name'  => $request->last_name,
                'email'      => $request->email,
                'role_id'    => $request->role_id,
                'password'   => Hash::make($plainPassword),
                'allowed_ips' => $this->isSuperAdmin()
                    ? $this->sanitizeAllowedIps($request->input('allowed_ips', []))
                    : [],
            ]);

            // Send welcome / credentials email
            $token = app('auth.password.broker')->createToken($user);
            $resetUrl = env('FRONTEND_URL') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

            Mail::to($user->email)->send(
                new NewUserCredentialsMail($user, $plainPassword, $resetUrl)
            );

            return response()->json([
                'message' => 'User created & email sent successfully',
                'user'    => $user->load([
                    'role',
                    'cities.boards.lists',
                    'boards',
                    'boardLists'
                ]),
            ], 201);

        } catch (\Exception $e) {
            Log::error('User creation failed: ' . $e->getMessage());
            return response()->json(['message' => 'Server Error', 'error' => $e->getMessage()], 500);
        }
    }

    // --- Show Single User ---
    public function show(int $id): JsonResponse
    {
        $user = User::with([
            'role',
            'cities.boards.lists',
            'boards',
            'boardLists'
        ])->find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ((int) $user->id === (int) $this->authUser()->id) {
            return response()->json($user);
        }

        if (!$this->canManage($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($user);
    }

    // --- Update User ---
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $isSelf = (int) $user->id === (int) $this->authUser()->id;

        if (!$isSelf && !$this->canManage($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!$this->isSuperAdmin() && $request->has('allowed_ips')) {
            return response()->json(['message' => 'Only superadmin can assign IP allowlist'], 403);
        }

        if ($isSelf && !$this->isSuperAdmin() && $request->has('role_id') && (int) $request->role_id !== (int) $user->role_id) {
            return response()->json(['message' => 'You cannot change your own role'], 403);
        }

        $request->validate($this->validationRules(true, $id));

        if (!$isSelf && $request->role_id) {
            if ($this->isAdmin() && !in_array((int) $request->role_id, [3, 4], true)) {
                return response()->json(['message' => 'Admins can only assign roles 3 and 4'], 403);
            }
        }

        $user->fill([
            'first_name' => $request->first_name ?? $user->first_name,
            'last_name'  => $request->last_name ?? $user->last_name,
            'email'      => $request->email ?? $user->email,
            'role_id'    => (!$isSelf && $request->has('role_id')) ? (int) $request->role_id : $user->role_id,
        ]);

        if ($request->password) {
            $user->password = Hash::make($request->password);
        }

        if ($this->isSuperAdmin() && $request->has('allowed_ips')) {
            $user->allowed_ips = $this->sanitizeAllowedIps($request->input('allowed_ips', []));
        }

        try {
            $user->save();

            return response()->json([
                'message' => 'User updated successfully',
                'user'    => $user->load([
                    'role',
                    'cities.boards.lists',
                    'boards',
                    'boardLists'
                ]),
            ]);
        } catch (\Exception $e) {
            Log::error('User update failed: ' . $e->getMessage());
            return response()->json(['message' => 'Server Error', 'error' => $e->getMessage()], 500);
        }
    }

    // --- Delete User ---
    public function destroy(int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ((int) $user->id === (int) $this->authUser()->id) {
            return response()->json(['message' => 'You cannot delete your own account'], 403);
        }

        if (!$this->canManage($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            $user->delete();
            return response()->json(['message' => 'User deleted successfully']);
        } catch (\Exception $e) {
            Log::error('User deletion failed: ' . $e->getMessage());
            return response()->json(['message' => 'Server Error', 'error' => $e->getMessage()], 500);
        }
    }

    // --- Authenticated User Profile ---
    public function me(): JsonResponse
    {
        $user = $this->authUser();

        $panelPermission = $user->panel_permission ?? $user->permission ?? 0;

        return response()->json([
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'role_id' => (int) $user->role_id,
            'can_create_users' => (int) ($user->can_create_users ?? 0),
            'panel_permission' => (int) $panelPermission,
            'report_status' => (int) ($user->report_status ?? 0),
            'report_notification' => (int) ($user->report_notification ?? 0),
            // Optional fields (may not exist in every environment)
            'max_cards' => $user->max_cards ?? null,
            'data_range' => $user->data_range ?? null,
            'video_status' => $user->video_status ?? null,
            'last_login_at' => $user->last_login_at?->toDateTimeString(),
            'account_expires_at' => $user->account_expires_at?->toDateTimeString(),
        ]);
    }

    public function showProfile(Request $request): JsonResponse
    {
        $user = $this->authUser();

        // Keep profile lean by default; opt-in to heavy relations via ?with=a,b,c
        $withParam = (string) $request->query('with', '');
        $requested = array_values(array_filter(array_map('trim', explode(',', $withParam))));

        $allowed = [
            'role',
            'cities',
            'cities.boards',
            'cities.boards.lists',
            'boards',
            'boardLists',
        ];

        $with = array_values(array_intersect($requested, $allowed));
        if (!empty($with)) {
            $user->load($with);
        }

        return response()->json($user);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $this->authUser();

        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email,' . $user->id,
            'password'   => 'nullable|string|min:6',
        ]);

        $user->fill([
            'first_name' => $request->first_name,
            'last_name'  => $request->last_name,
            'email'      => $request->email,
        ]);

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user'    => $user->load([
                'role',
                'cities.boards.lists',
                'boards',
                'boardLists'
            ]),
        ]);
    }

    // --- Toggle Permission ---
    public function togglePermission(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ((int) $user->id === (int) $this->authUser()->id) {
            return response()->json(['message' => 'You cannot change your own permissions'], 403);
        }

        if (!$this->canManage($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $field = $request->input('field', 'can_create_users');

        if (!in_array($field, ['can_create_users', 'panel_permission'])) {
            return response()->json(['message' => 'Invalid permission field'], 400);
        }

        // `panel_permission` may exist as either `panel_permission` or legacy `permission` in the DB.
        $dbField = $field;
        if ($field === 'panel_permission') {
            $dbField = Schema::hasColumn('users', 'panel_permission') ? 'panel_permission' : 'permission';
        }

        $user->$dbField = $user->$dbField ? 0 : 1;
        $user->save();

        return response()->json([
            'message' => 'Permission updated',
            'can_create_users' => (int) ($user->can_create_users ?? 0),
            'panel_permission' => (int) ($user->panel_permission ?? 0),
        ]);
    }

    // --- Assign cities to a user ---
    public function updateUserCities(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'cities'   => 'array',
            'cities.*' => 'integer|exists:cities,id',
        ]);

        if (!$this->isSuperAdmin()) {
            $allowed = $this->authUser()->cities->pluck('id')->toArray();
            $validated['cities'] = array_intersect($validated['cities'] ?? [], $allowed);
        }

        $user->cities()->sync($validated['cities'] ?? []);

        return response()->json([
            'message' => 'City permissions updated successfully',
            'user' => $user->load([
                'role',
                'cities.boards.lists',
                'boards',
                'boardLists'
            ])
        ]);
    }

    // --- Assign boards to a user ---
    public function updateUserBoards(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'boards'   => 'array',
            'boards.*' => 'integer|exists:boards,id',
        ]);

        if (!$this->isSuperAdmin()) {
            $allowed = $this->authUser()->boards->pluck('id')->toArray();
            $validated['boards'] = array_intersect($validated['boards'] ?? [], $allowed);
        }

        $user->boards()->sync($validated['boards'] ?? []);

        // Keep hierarchy consistent: board access implies city access.
        $boardIds = $validated['boards'] ?? [];
        if (!empty($boardIds)) {
            $cityIds = Board::whereIn('id', $boardIds)
                ->pluck('city_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();

            if (!empty($cityIds)) {
                $user->cities()->syncWithoutDetaching($cityIds);
            }
        }

        return response()->json([
            'message' => 'Board permissions updated successfully',
            'user' => $user->load([
                'role',
                'cities.boards.lists',
                'boards',
                'boardLists'
            ])
        ]);
    }

    // --- Assign lists to a user ---
    public function updateUserLists(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'lists'    => 'array',
            'lists.*'  => 'integer|exists:board_lists,id',
        ]);

        if (!$this->isSuperAdmin()) {
            $allowed = $this->authUser()->boardLists->pluck('id')->toArray();
            $validated['lists'] = array_intersect($validated['lists'] ?? [], $allowed);
        }

        $listIds = collect($validated['lists'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $user->boardLists()->sync($listIds);

        // Keep card-level membership in sync with admin-panel list access
        // so card member circles/visibility match assigned permissions.
        $cardIds = [];
        if (!empty($listIds)) {
            $cardIds = BoardCard::whereIn('board_list_id', $listIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
        }
        $user->boardCards()->sync($cardIds);

        // Keep hierarchy consistent:
        // list access implies board + city access.
        if (!empty($listIds)) {
            $boardIds = BoardList::whereIn('id', $listIds)
                ->pluck('board_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();

            if (!empty($boardIds)) {
                $user->boards()->syncWithoutDetaching($boardIds);

                $cityIds = Board::whereIn('id', $boardIds)
                    ->pluck('city_id')
                    ->filter()
                    ->map(fn ($id) => (int) $id)
                    ->unique()
                    ->values()
                    ->all();

                if (!empty($cityIds)) {
                    $user->cities()->syncWithoutDetaching($cityIds);
                }
            }
        }

        return response()->json([
            'message' => 'List permissions updated successfully',
            'user' => $user->load([
                'role',
                'cities.boards.lists',
                'boards',
                'boardLists'
            ])
        ]);
    }
}
