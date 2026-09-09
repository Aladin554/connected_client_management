<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-card Shared Drive (OAuth) is now the only supported mode - "Personal
 * Drive" and "Shared Drive" (service-account-based) modes and their settings
 * are removed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->dropColumn(['enabled', 'active_mode', 'root_folder_id', 'shared_drive_id', 'default_role']);
        });
    }

    public function down(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->boolean('enabled')->default(false)->after('id');
            $table->string('active_mode')->default('my_drive')->after('enabled');
            $table->string('root_folder_id')->nullable()->after('active_mode');
            $table->string('shared_drive_id')->nullable()->after('root_folder_id');
            $table->string('default_role')->default('writer')->after('shared_drive_id');
        });
    }
};
