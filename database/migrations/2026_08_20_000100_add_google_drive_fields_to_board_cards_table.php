<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('board_cards', function (Blueprint $table) {
            $table->string('google_drive_folder_id')->nullable()->after('is_archived');
            $table->string('google_drive_folder_link')->nullable()->after('google_drive_folder_id');
            $table->timestamp('google_drive_synced_at')->nullable()->after('google_drive_folder_link');
        });
    }

    public function down(): void
    {
        Schema::table('board_cards', function (Blueprint $table) {
            $table->dropColumn(['google_drive_folder_id', 'google_drive_folder_link', 'google_drive_synced_at']);
        });
    }
};
