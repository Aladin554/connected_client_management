<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
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

    protected function canManage(User $user): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->isAdmin() && $user->role->name === 'user') {
            return true;
        }

        return false;
    }

    /**
     * Base query with common eager loading
     */
    protected function filterUsersForAuth()
    {
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
            return $query->whereHas('role', function ($q) {
                $q->where('name', 'user');
            });
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
        ];
    }

    // --- List Users ---
    public function index(): JsonResponse
    {
        $users = $this->filterUsersForAuth()->get();

        return response()->json($users);
    }

    // --- Create User ---
    public function store(Request $request): JsonResponse
    {
        $request->validate($this->validationRules());

        $role = Role::find($request->role_id);

        if ($this->isAdmin() && $role->name !== 'user') {
            return response()->json(['message' => 'Admins can only create users'], 403);
        }

        try {
            $plainPassword = $request->password;

            $user = User::create([
                'first_name' => $request->first_name,
                'last_name'  => $request->last_name,
                'email'      => $request->email,
                'role_id'    => $request->role_id,
                'password'   => Hash::make($plainPassword),
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

        if (!$this->canManage($user)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate($this->validationRules(true, $id));

        if ($request->role_id) {
            $role = Role::find($request->role_id);
            if ($this->isAdmin() && $role->name !== 'user') {
                return response()->json(['message' => 'Admins can only assign user role'], 403);
            }
        }

        $user->fill([
            'first_name' => $request->first_name ?? $user->first_name,
            'last_name'  => $request->last_name ?? $user->last_name,
            'email'      => $request->email ?? $user->email,
            'role_id'    => $request->role_id ?? $user->role_id,
        ]);

        if ($request->password) {
            $user->password = Hash::make($request->password);
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

        $user->boardLists()->sync($validated['lists'] ?? []);

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
