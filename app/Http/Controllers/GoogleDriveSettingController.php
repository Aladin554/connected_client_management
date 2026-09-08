<?php

namespace App\Http\Controllers;

use App\Models\GoogleDriveSetting;
use App\Services\GoogleDriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GoogleDriveSettingController extends Controller
{
    public function __construct(private readonly GoogleDriveService $driveService)
    {
    }

    private function isSuperAdmin(): bool
    {
        $user = auth()->user();
        return $user && ((int) $user->role_id === 1 || $user->role?->name === 'superadmin');
    }

    public function show(): JsonResponse
    {
        if (!$this->isSuperAdmin()) {
            return response()->json(['message' => 'Only superadmin can view Google Drive settings'], 403);
        }

        $settings = GoogleDriveSetting::current();

        return response()->json([
            ...$settings->toArray(),
            'service_account_email' => $this->driveService->getServiceAccountEmail(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        if (!$this->isSuperAdmin()) {
            return response()->json(['message' => 'Only superadmin can update Google Drive settings'], 403);
        }

        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'active_mode' => ['required', Rule::in(['my_drive', 'shared_drive'])],
            'root_folder_id' => 'nullable|string|max:255',
            'shared_drive_id' => 'nullable|string|max:255',
            'default_role' => ['required', Rule::in(['reader', 'commenter', 'writer'])],
            'oauth_enabled' => 'sometimes|boolean',
        ]);

        if ($validated['enabled']) {
            if ($validated['active_mode'] === 'my_drive' && empty($validated['root_folder_id'])) {
                return response()->json([
                    'message' => 'Root folder ID is required when Personal Drive mode is active',
                    'errors' => ['root_folder_id' => ['This field is required.']],
                ], 422);
            }

            if ($validated['active_mode'] === 'shared_drive' && empty($validated['shared_drive_id'])) {
                return response()->json([
                    'message' => 'Shared Drive ID is required when Shared Drive mode is active',
                    'errors' => ['shared_drive_id' => ['This field is required.']],
                ], 422);
            }
        }

        $settings = GoogleDriveSetting::current();

        if (($validated['oauth_enabled'] ?? false) && empty($settings->oauth_refresh_token)) {
            return response()->json([
                'message' => 'Connect a Google account before enabling per-card Shared Drive mode',
                'errors' => ['oauth_enabled' => ['Connect a Google account first.']],
            ], 422);
        }

        $settings->update($validated);

        return response()->json([
            ...$settings->fresh()->toArray(),
            'service_account_email' => $this->driveService->getServiceAccountEmail(),
        ]);
    }
}
