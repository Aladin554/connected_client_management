<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->file(public_path('react/index.html'));
});

// React SPA catch-all (exclude api + static)
Route::get('/{any}', function () {
    return response()->file(public_path('react/index.html'));
})->where('any', '^(?!api|react|assets|images|css|js|favicon\.ico|favicon\.png|robots\.txt).*$');
