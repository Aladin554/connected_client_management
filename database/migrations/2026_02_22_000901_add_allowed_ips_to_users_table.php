<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'allowed_ips')) {
                $table->json('allowed_ips')->nullable()->after('can_create_users');
            }
        });

        if (!Schema::hasTable('system_settings')) {
            return;
        }

        $rawValue = DB::table('system_settings')
            ->where('key', 'ip_allowlist_roles_2_3_4')
            ->value('value');

        $allowedIps = $this->sanitizeAllowedIps($rawValue);
        if (empty($allowedIps)) {
            return;
        }

        DB::table('users')
            ->whereIn('role_id', [2, 3, 4])
            ->whereNull('allowed_ips')
            ->update([
                'allowed_ips' => json_encode($allowedIps),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'allowed_ips')) {
                $table->dropColumn('allowed_ips');
            }
        });
    }

    private function sanitizeAllowedIps($value): array
    {
        $decoded = is_array($value) ? $value : json_decode((string) $value, true);
        if (!is_array($decoded)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(static function ($ip) {
            return trim((string) $ip);
        }, $decoded))));
    }
};
