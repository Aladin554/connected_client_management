<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('board_cards', function (Blueprint $table) {
            $table->foreignId('service_area_id')
                ->nullable()
                ->after('intake_label_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('board_cards', function (Blueprint $table) {
            $table->dropColumn('service_area_id');
        });
    }
};
