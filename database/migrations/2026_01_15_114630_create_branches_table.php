<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')
                ->constrained('cities') // references cities.id
                ->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
