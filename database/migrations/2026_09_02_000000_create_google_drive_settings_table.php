<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('google_drive_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(false);
            // Which configured destination is currently active: 'my_drive' or 'shared_drive'.
            $table->string('active_mode')->default('my_drive');
            // "My Drive" folder id, shared with the service account as Editor.
            $table->string('root_folder_id')->nullable();
            // Shared Drive id (Workspace Shared Drive).
            $table->string('shared_drive_id')->nullable();
            // Role granted to card members/contacts: reader, commenter, writer.
            $table->string('default_role')->default('writer');
            $table->timestamps();
        });

        // Seed a single settings row, carrying over whatever is currently in .env
        // so existing testing config keeps working after this migration.
        DB::table('google_drive_settings')->insert([
            'enabled' => (bool) env('GOOGLE_DRIVE_ENABLED', false),
            'active_mode' => !empty(env('GOOGLE_DRIVE_SHARED_DRIVE_ID')) ? 'shared_drive' : 'my_drive',
            'root_folder_id' => env('GOOGLE_DRIVE_ROOT_FOLDER_ID'),
            'shared_drive_id' => env('GOOGLE_DRIVE_SHARED_DRIVE_ID'),
            'default_role' => env('GOOGLE_DRIVE_DEFAULT_ROLE', 'writer'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('google_drive_settings');
    }
};
