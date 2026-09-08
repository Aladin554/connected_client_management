<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('board_cards', function (Blueprint $table) {
            // True when google_drive_folder_id is actually a per-card Shared
            // Drive ID (created via OAuth), not a regular folder inside the
            // admin-configured root. Fixed at creation time so later changes
            // to the admin Google Drive settings never change how an
            // already-created card's Drive access is managed.
            $table->boolean('google_drive_own_shared_drive')->default(false)->after('google_drive_synced_at');
        });
    }

    public function down(): void
    {
        Schema::table('board_cards', function (Blueprint $table) {
            $table->dropColumn('google_drive_own_shared_drive');
        });
    }
};
