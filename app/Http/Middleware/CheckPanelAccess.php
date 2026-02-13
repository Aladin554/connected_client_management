<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPanelAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // If no user, just pass the request
        if (!$user) {
            return $next($request);
        }

        // Super Admin (1) and Admin (2) → no restrictions at all
        // Normal users → no 72-hour restriction anymore
        return $next($request);
    }
}
