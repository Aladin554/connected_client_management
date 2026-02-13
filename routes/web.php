<?php

use App\Http\Controllers\SecureDeleteController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/signin');
});

// React SPA catch-all (exclude api + static)
Route::get('/{any}', function () {
    return response()->file(public_path('react/index.html'));
})->where('any', '^(?!api|react|assets|css|js|favicon\.ico|robots\.txt).*$');
