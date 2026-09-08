<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            // Per-card Shared Drive mode: each card gets its own Shared Drive
            // (needs a real Google account via OAuth, not the service account,
            // since only real org members can create Shared Drives).
            $table->boolean('oauth_enabled')->default(false)->after('default_role');
            $table->text('oauth_refresh_token')->nullable()->after('oauth_enabled');
            $table->string('oauth_connected_email')->nullable()->after('oauth_refresh_token');
        });
    }

    public function down(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->dropColumn(['oauth_enabled', 'oauth_refresh_token', 'oauth_connected_email']);
        });
    }
};
