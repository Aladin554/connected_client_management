<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RestrictAdminIp
{
    // Enforce IP restrictions for these roles.
    protected array $restrictedRoles = [2, 3, 4];

    public function handle(Request $request, Closure $next): Response
    {
        $ip = $this->getRealIp($request);

        $user = $request->user();

        // If user is logged in and role is restricted, enforce global IP allowlist.
        if ($user && in_array((int) $user->role_id, $this->restrictedRoles, true)) {
            $allowedIps = SystemSetting::getIpAllowlist();
            if (empty($allowedIps) || !in_array($ip, $allowedIps, true)) {
                $request->user()?->currentAccessToken()?->delete();

                Log::warning('Blocked access from unauthorized IP', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'role_id' => $user->role_id,
                    'ip' => $ip,
                ]);

                return response()->json([
                    'message' => 'Access denied from this IP.',
                    'your_ip' => $ip,
                    'force_logout' => true,
                ], 403);
            }
        }

        return $next($request);
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
}
