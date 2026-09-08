<?php

namespace App\Http\Controllers;

use App\Models\GoogleDriveSetting;
use App\Services\GoogleDriveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class GoogleDriveOAuthController extends Controller
{
    public function __construct(private readonly GoogleDriveService $driveService)
    {
    }

    private function isSuperAdmin(): bool
    {
        $user = auth()->user();
        return $user && ((int) $user->role_id === 1 || $user->role?->name === 'superadmin');
    }

    /**
     * Authenticated: returns the Google consent URL for the admin panel to
     * redirect the browser to (a real top-level navigation, not an AJAX call).
     */
    public function connect()
    {
        if (!$this->isSuperAdmin()) {
            return response()->json(['message' => 'Only superadmin can connect a Google account'], 403);
        }

        $state = Str::random(40);
        // Short-lived - this only needs to survive the round trip to Google's
        // consent screen and back, not be a long-term session.
        Cache::put('google_drive_oauth_state:' . $state, true, now()->addMinutes(10));

        return response()->json([
            'url' => $this->driveService->getOAuthAuthorizationUrl($state),
        ]);
    }

    /**
     * Public: Google redirects the browser here after consent. Not behind
     * auth:sanctum because this is a plain browser navigation from Google,
     * carrying no Authorization header - the "state" param is what proves
     * this round trip started from an authenticated admin action above.
     */
    public function callback(Request $request)
    {
        $frontendUrl = rtrim((string) env('FRONTEND_URL'), '/') . '/dashboard/google-drive-settings';

        $state = (string) $request->query('state');
        $code = $request->query('code');
        $error = $request->query('error');

        if ($error) {
            return redirect()->away($frontendUrl . '?oauth=error&reason=' . urlencode((string) $error));
        }

        $stateKey = 'google_drive_oauth_state:' . $state;
        if (empty($state) || !Cache::pull($stateKey)) {
            return redirect()->away($frontendUrl . '?oauth=error&reason=invalid_state');
        }

        if (empty($code)) {
            return redirect()->away($frontendUrl . '?oauth=error&reason=missing_code');
        }

        try {
            $this->driveService->connectOAuthAccount($code);
        } catch (\Throwable $exception) {
            report($exception);
            return redirect()->away($frontendUrl . '?oauth=error&reason=' . urlencode($exception->getMessage()));
        }

        return redirect()->away($frontendUrl . '?oauth=success');
    }

    public function disconnect()
    {
        if (!$this->isSuperAdmin()) {
            return response()->json(['message' => 'Only superadmin can disconnect the Google account'], 403);
        }

        $this->driveService->disconnectOAuthAccount();

        return response()->json(GoogleDriveSetting::current());
    }
}
