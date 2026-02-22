<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password; // For password resets
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    // LOGIN
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // Block inactive
        if ((int) $user->report_status === 3) {
            return response()->json([
                'message' => 'Your account is inactive.',
                'force_logout' => true
            ], 403);
        }

        // Fixed 72-hour account expiry for role 3
        if ((int) $user->role_id === 3 && $user->account_expires_at && $user->account_expires_at->isPast()) {
            return response()->json([
                'message' => 'Your 72-hour access has expired. Contact administrator.',
                'expired_at' => $user->account_expires_at->toDateTimeString(),
                'force_logout' => true
            ], 403);
        }

        // Dynamic IP restriction for roles 2, 3, 4.
        $clientIp = $this->getRealIp($request);
        if ($this->shouldEnforceIpFor($user)) {
            $allowedIps = $this->sanitizeAllowedIps($user->allowed_ips ?? []);

            if (!empty($allowedIps) && !in_array($clientIp, $allowedIps, true)) {
                return response()->json([
                    'message' => 'Login blocked from this IP. Please contact administrator.',
                    'your_ip' => $clientIp,
                    'force_logout' => true,
                ], 403);
            }
        }

        // Set fixed 72-hour expiry only on first-ever login (role 3)
        if ((int) $user->role_id === 3 && is_null($user->account_expires_at)) {
            $user->account_expires_at = now()->addHours(72);
            $user->save();
        }

        $user->last_login_at = now();
        $user->save();

        // Token never expires (expiry controlled via account_expires_at).
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'access_token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role_id' => $user->role_id,
                'panel_permission' => (bool) $user->panel_permission,
                'report_status' => (int) $user->report_status,
                'last_login_at' => $user->last_login_at->toDateTimeString(),
                'account_expires_at' => (int) $user->role_id === 3 ? $user->account_expires_at?->toDateTimeString() : null,
            ]
        ]);
    }

    // LOGOUT
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    // FORGOT PASSWORD (SPA-friendly: always returns success)
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Send reset link (Laravel will fail silently if email doesn't exist)
        Password::sendResetLink($request->only('email'));

        // Always return a generic success message (safe for SPA)
        return response()->json([
            'message' => 'Password reset link has been sent.'
        ]);
    }

    // RESET PASSWORD
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required',
            'password' => 'required|min:6|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Invalid or expired link'], 400);
        }

        return response()->json(['message' => 'Password reset successful']);
    }

    protected function shouldEnforceIpFor(User $user): bool
    {
        return in_array((int) $user->role_id, [2, 3, 4], true);
    }

    protected function getRealIp(Request $request): string
    {
        $forwarded = $request->header('CF-Connecting-IP')
            ?? $request->header('X-Forwarded-For')
            ?? $request->header('X-Real-IP');

        if (is_string($forwarded) && $forwarded !== '') {
            $parts = explode(',', $forwarded);
            $candidate = trim($parts[0]);
            if ($candidate !== '') {
                return $candidate;
            }
        }

        return (string) $request->ip();
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
}
