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
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // who did it (optional if guest)
            $table->string('user_name')->nullable(); // fallback / display name (e.g. "MD", "Syed")
            $table->foreignId('card_id')
            ->nullable()
            ->constrained('board_cards')
            ->nullOnDelete();

            $table->foreignId('list_id')->nullable()->constrained('board_lists')->nullOnDelete();
            $table->string('action');           // "created card", "moved card", "updated due_date", "commented", etc.
            $table->text('details')->nullable(); // JSON or plain text (e.g. "from New to Contacted", comment text)
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
