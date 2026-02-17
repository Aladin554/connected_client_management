<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    protected $casts = [
        'value' => 'array',
    ];

    public static function getIpAllowlist(): array
    {
        $row = self::query()->where('key', 'ip_allowlist_roles_2_3_4')->first();
        $value = $row?->value;

        if (!is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(static function ($ip) {
            return trim((string) $ip);
        }, $value))));
    }

    public static function setIpAllowlist(array $ips): void
    {
        $normalized = array_values(array_unique(array_filter(array_map(static function ($ip) {
            return trim((string) $ip);
        }, $ips))));

        self::query()->updateOrCreate(
            ['key' => 'ip_allowlist_roles_2_3_4'],
            ['value' => $normalized]
        );
    }
}

