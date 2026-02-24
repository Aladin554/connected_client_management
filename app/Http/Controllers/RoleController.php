<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Support\Facades\Auth;

class RoleController extends Controller
{
    /**
     * Display a listing of assignable roles for current user.
     */
    public function index(): \Illuminate\Http\JsonResponse
    {
        $auth = Auth::user();
        $authRoleId = (int) ($auth->role_id ?? 0);

        // Superadmin can assign all roles except superadmin itself.
        if ($authRoleId === 1) {
            $roles = Role::where('id', '!=', 1)->get();
            return response()->json($roles);
        }

        // Admin can assign only subadmin (3) and counsellor (4).
        if ($authRoleId === 2) {
            $roles = Role::whereIn('id', [3, 4])->get();
            return response()->json($roles);
        }

        // Other roles are not allowed to fetch assignable roles.
        return response()->json([], 403);
    }
}
