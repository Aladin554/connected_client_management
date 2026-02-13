<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RestrictAdminIp
{
    // UPDATE THIS LIST WITH YOUR REAL PUBLIC IPs
    // Get them by running: curl ifconfig.me   (in Windows Command Prompt)
    protected array $allowedIps = [
        '103.178.220.35',   // ← Your main PC (example)
        '112.198.75.123',    // ← Another admin PC
        '203.87.50.200',     // ← Office IP, backup location, etc.
        // Add as many as you need
        // '2001:db8::1',    // ← IPv6 if needed
    ];

    // Change these numbers to your actual admin role_id(s)
    protected array $adminRoles = [2]; // Example: 1 = Super Admin, 2 = Moderator, etc.

    public function handle(Request $request, Closure $next): Response
    {
        // Get the REAL public IP (works with Cloudflare, load balancers, etc.)
        $ip = $this->getRealIp($request);

        // Allow everything in local development (your Windows PC when running "php artisan serve")
        if (app()->environment('local') || in_array($ip, ['127.0.0.1', '::1'])) {
            return $next($request);
        }

        $user = $request->user();

        // If user is logged in AND has an admin role → enforce IP whitelist
        if ($user && in_array($user->role_id, $this->adminRoles)) {
            if (!in_array($ip, $this->allowedIps)) {
                // Optional: force logout by revoking token
                $request->user()?->currentAccessToken()?->delete();

                Log::warning('Blocked admin access from unauthorized IP', [
                    'user_id' => $user->id,
                    'email'   => $user->email,
                    'ip'      => $ip,
                ]);

                return response()->json([
                    'message'      => 'Access denied. This IP is not allowed for admin accounts.',
                    'your_ip'      => $ip,
                    'force_logout' => true
                ], 403);
            }
        }

        return $next($request);
    }

    // Properly detect real IP even behind proxies / Cloudflare
    protected function getRealIp(Request $request): string
    {
        return $request->header('CF-Connecting-IP')      // Cloudflare
            ?? $request->header('X-Forwarded-For')      // Most proxies (take first one)
            ?? $request->header('X-Real-IP')
            ?? $request->ip();                          // Fallback
    }
}