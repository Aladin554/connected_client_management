<?php

namespace App\Http\Middleware;

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

        // If user is logged in and role is restricted, enforce per-user IP allowlist.
        if ($user && in_array((int) $user->role_id, $this->restrictedRoles, true)) {
            $allowedIps = $this->sanitizeAllowedIps($user->allowed_ips ?? []);
            if (!empty($allowedIps) && !in_array($ip, $allowedIps, true)) {
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
        $ipSources = [
            $request->header('X-Forwarded-For'),
            $request->header('CF-Connecting-IP'),
            $request->header('X-Real-IP'),
            $request->server('REMOTE_ADDR'),
            $request->ip(),
        ];

        foreach ($ipSources as $source) {
            if (!is_string($source) || trim($source) === '') {
                continue;
            }

            foreach (explode(',', $source) as $part) {
                $candidate = trim($part);
                if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                    return $candidate;
                }
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
