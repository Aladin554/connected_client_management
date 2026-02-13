<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\CheckPanelAccess;
use App\Http\Middleware\RestrictAdminIp;   // ← ADD THIS LINE

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // 1. Global middleware (runs on every request)
        $middleware->append([
            CheckPanelAccess::class,    // ← your existing "inactive account" checker
            // RestrictAdminIp::class,   // ← DO NOT put here unless you want it on EVERY request
        ]);

        // 2. Register middleware alias so you can use 'admin.ip' on specific routes
        $middleware->alias([
            'admin.ip' => RestrictAdminIp::class,   // ← THIS IS THE CORRECT WAY
        ]);

        // Optional: If you want IP check on ALL API routes (including login), uncomment below:
        // $middleware->api(append: RestrictAdminIp::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();