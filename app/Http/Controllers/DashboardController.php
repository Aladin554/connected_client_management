<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Industry;
use App\Models\Department;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        // Count active users with role_id = 3
        $userCount = User::where('role_id', 3)->count();

        // Count industries
        $industryCount = Industry::count();

        // Count departments
        $departmentCount = Department::count();

        return response()->json([
            'users' => $userCount,
            'industries' => $industryCount,
            'departments' => $departmentCount,
        ]);
    }
}
