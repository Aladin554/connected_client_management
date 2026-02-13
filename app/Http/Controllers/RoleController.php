<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleController extends Controller
{
    /**
     * Display a listing of roles.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(): \Illuminate\Http\JsonResponse
    {
        $auth = Auth::user();

        // Superadmin → show all EXCEPT superadmin
        if ($auth->role->id === 1) {

            $roles = Role::where('id', '!=', 1)->get();
        }

        // Admin → only allow "user" (or junior admin if that's what you mean)
        else if ($auth->role->id === 2) {

            // change 'user' to 'junior admin' if needed
            $roles = Role::where('name', 'user')->get();
        }

        // Normal user → no access
        else {
            return response()->json([], 403);
        }

        return response()->json($roles);
    }

}
