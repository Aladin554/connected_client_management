<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Safety net: catches any card whose Drive folder structure never finished
// (e.g. the queue worker was down at creation time). Every step it
// re-triggers is idempotent, so this is a harmless no-op for complete cards.
Schedule::command('drive:repair')->everyFiveMinutes()->withoutOverlapping();
