<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The master-Shared-Drive-with-shortcuts feature was reverted (confused
 * staff about which Drive's member count they were looking at) - drops the
 * column it added. See 2026_09_09_000100_add_shortcut_master_drive_to_google_drive_settings_table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->dropColumn('shortcut_master_drive_id');
        });
    }

    public function down(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->string('shortcut_master_drive_id')->nullable()->after('oauth_connected_email');
        });
    }
};
