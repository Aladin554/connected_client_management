<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BoardCardController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardListController;
use App\Http\Controllers\CityController;
use App\Http\Controllers\CountryLabelController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IntakeLabelController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ServiceAreaController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\CheckPanelAccess;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes (no auth required)
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

// Protected routes
Route::middleware(['auth:sanctum', CheckPanelAccess::class, 'admin.ip'])->group(function () {

    // ────────────────────────────────────────────────
    // User / Role / Profile
    // ────────────────────────────────────────────────
    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/me', [UserController::class, 'me']);
    Route::get('/profile', [UserController::class, 'showProfile']);
    Route::put('/profile', [UserController::class, 'updateProfile']);
    Route::get('/user', fn(Request $request) => $request->user());
    Route::get('/ip-access/config', [UserController::class, 'ipAccessConfig']);
    Route::patch('/ip-access/config', [UserController::class, 'updateIpAccessConfig']);
    Route::apiResource('users', UserController::class);
    Route::patch('/users/{id}/toggle-permission', [UserController::class, 'togglePermission']);
    Route::patch('/users/{user}/cities', [UserController::class, 'updateUserCities']);
    Route::patch('/users/{user}/boards', [UserController::class, 'updateUserBoards']);
    Route::post('/permissions/assign', [UserController::class, 'assignPermissions']);
    Route::patch('/users/{user}/lists', [UserController::class, 'updateUserLists']);

    // ────────────────────────────────────────────────
    // Cities
    // ────────────────────────────────────────────────
    Route::get('/cities', [CityController::class, 'index']);
    Route::post('/cities', [CityController::class, 'store']);         // Superadmin only
    Route::get('/cities/{city}', [CityController::class, 'show']);
    Route::put('/cities/{city}', [CityController::class, 'update']); // Superadmin only
    Route::delete('/cities/{city}', [CityController::class, 'destroy']); // Superadmin only

    // ────────────────────────────────────────────────
    // Boards
    // ────────────────────────────────────────────────
    Route::get('/boards', [BoardController::class, 'index']);
    Route::post('/boards', [BoardController::class, 'store']);        // Superadmin only
    Route::get('/boards/{board}', [BoardController::class, 'show']);
    Route::get('/boards/{board}/archived-cards', [BoardCardController::class, 'archivedByBoard']);
    Route::get('/boards/{board}/activities', [BoardCardController::class, 'boardActivities']);
    Route::put('/boards/{board}', [BoardController::class, 'update']); // Superadmin only
    Route::delete('/boards/{board}', [BoardController::class, 'destroy']); // Superadmin only
    Route::get('/boards-with-gradients', [BoardController::class, 'indexWithGradients']);
    Route::get('boards/branch/{branchId}', [BoardController::class, 'indexByBranch'])->name('boards.branch.index');
    Route::get('/users/me/permissions', [UserController::class, 'getMyPermissions']);
    // ────────────────────────────────────────────────
    // Board Lists & Cards
    // ────────────────────────────────────────────────
    Route::apiResource('boards.lists', BoardListController::class)
        ->parameters(['lists' => 'boardList']);

    Route::apiResource('board-lists.cards', BoardCardController::class)
        ->parameters(['board_lists' => 'boardList', 'cards' => 'boardCard']);

    Route::post('/cards/move', [BoardCardController::class, 'move']);

    // Card-specific actions
    Route::put('/cards/{boardCard}/labels', [BoardCardController::class, 'updateLabel']);
    Route::put('/cards/{boardCard}/description', [BoardCardController::class, 'updateDescription']);
    Route::put('/cards/{boardCard}/due-date', [BoardCardController::class, 'updateDueDate']);
    Route::put('/cards/{boardCard}/payment', [BoardCardController::class, 'updatePaymentStatus']);
    Route::put('/cards/{boardCard}/dependant-payment', [BoardCardController::class, 'updateDependantPaymentStatus']);
    Route::put('/cards/{boardCard}/archive', [BoardCardController::class, 'updateArchiveStatus']);
    Route::get('/cards/{boardCard}/members', [BoardCardController::class, 'members']);
    Route::put('/cards/{boardCard}/members', [BoardCardController::class, 'updateMembers']);

    // ────────────────────────────────────────────────
    // Activities & Comments
    // ────────────────────────────────────────────────
    Route::get('/cards/{boardCard}/activities', [BoardCardController::class, 'activities']);
    Route::post('/cards/{boardCard}/activities', [BoardCardController::class, 'storeComment']);
    Route::get('/activities/{activity}/attachment', [BoardCardController::class, 'downloadAttachment']);

    // Optional: general activity logging endpoint
    // (you can call this from other controllers if needed)
    Route::post('/activities', [BoardCardController::class, 'logActivity']);

    // ────────────────────────────────────────────────
    // Dashboard & Labels
    // ────────────────────────────────────────────────
    Route::get('/dashboard-counts', [DashboardController::class, 'index']);
    Route::apiResource('country-labels', CountryLabelController::class);
    Route::apiResource('intake-labels', IntakeLabelController::class);
    Route::apiResource('service-areas', ServiceAreaController::class);

    // ────────────────────────────────────────────────
    // Debug / Helpers
    // ────────────────────────────────────────────────
    Route::get('/show-ip', fn (Request $request) => $request->ip());
});
