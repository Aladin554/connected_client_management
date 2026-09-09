<?php

namespace App\Http\Controllers;

use App\Models\GoogleDriveSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoogleDriveSettingController extends Controller
{
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

        return response()->json(GoogleDriveSetting::current());
    }

    public function update(Request $request): JsonResponse
    {
        if (!$this->isSuperAdmin()) {
            return response()->json(['message' => 'Only superadmin can update Google Drive settings'], 403);
        }

        $validated = $request->validate([
            'oauth_enabled' => 'required|boolean',
        ]);

        $settings = GoogleDriveSetting::current();

        if ($validated['oauth_enabled'] && empty($settings->oauth_refresh_token)) {
            return response()->json([
                'message' => 'Connect a Google account before enabling Google Drive integration',
                'errors' => ['oauth_enabled' => ['Connect a Google account first.']],
            ], 422);
        }

        $settings->update($validated);

        return response()->json($settings->fresh());
    }
}
