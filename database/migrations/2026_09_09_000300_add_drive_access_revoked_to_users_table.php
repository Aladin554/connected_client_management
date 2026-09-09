<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Superadmin/admin accounts get automatic Manager access to every card's
 * Google Drive folder. This lets a superadmin cut off a specific admin's
 * Drive access instantly (e.g. if their account is compromised) without
 * touching their app role/permissions - see UserController::toggleDriveAccess.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('drive_access_revoked')->default(false)->after('allowed_ips');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('drive_access_revoked');
        });
    }
};
