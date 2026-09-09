<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            // A single Shared Drive that holds a shortcut into every card's
            // own Shared Drive, purely so staff have one place to browse all
            // cards from - Google Drive doesn't allow a Shared Drive to be
            // nested inside a folder, so this is the closest equivalent.
            // Lazily created on first use; see BoardCardController.
            $table->string('shortcut_master_drive_id')->nullable()->after('oauth_connected_email');
        });
    }

    public function down(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->dropColumn('shortcut_master_drive_id');
        });
    }
};
