<?php

use Illuminate\Support\Facades\Route;

// The SPA shell is sent with "no-cache" so browsers always revalidate it;
// otherwise they keep an old index.html (and the old JS bundles it points to)
// for hours after a deploy.

Route::get('/', function () {
    return response()->file(public_path('react/index.html'), ['Cache-Control' => 'no-cache, must-revalidate']);
});

// React SPA catch-all (exclude api + static)
Route::get('/{any}', function () {
    return response()->file(public_path('react/index.html'), ['Cache-Control' => 'no-cache, must-revalidate']);
})->where('any', '^(?!api|react|assets|images|css|js|favicon\.ico|favicon\.png|robots\.txt).*$');
