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
        Schema::table('board_lists', function (Blueprint $table) {
            // 0 = admission, 1 = visa
            $table->unsignedTinyInteger('category')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('board_lists', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};

