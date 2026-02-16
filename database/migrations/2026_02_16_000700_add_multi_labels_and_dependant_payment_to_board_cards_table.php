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
            $table->json('country_label_ids')->nullable()->after('country_label_id');
            $table->json('service_area_ids')->nullable()->after('service_area_id');
            $table->boolean('dependant_payment_done')->default(false)->after('payment_done');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('board_cards', function (Blueprint $table) {
            $table->dropColumn([
                'country_label_ids',
                'service_area_ids',
                'dependant_payment_done',
            ]);
        });
    }
};

