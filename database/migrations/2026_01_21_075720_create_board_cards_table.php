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
        Schema::create('board_cards', function (Blueprint $table) {
            $table->id();

            $table->foreignId('board_list_id')
                  ->constrained('board_lists')
                  ->onDelete('cascade');

            $table->string('title')->nullable();

            // 👉 New fields added here
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('invoice')->unique();

            $table->text('description')->nullable();
            $table->foreignId('country_label_id')
                  ->nullable();   // or 'cascade' if you prefer deletion

            $table->foreignId('intake_label_id')
                  ->nullable();
            $table->date('due_date')->nullable();
            $table->unsignedInteger('position')->default(9999);
            $table->boolean('checked')->default(false);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('board_cards');
    }
};
