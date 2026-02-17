<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\NewAccessToken;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use App\Notifications\CustomResetPassword;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'role_id',
        'report_status',
        'report_notification',
        'last_login_at',
        'can_create_users',
        'allowed_ips',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'last_login_at'     => 'datetime',
        'account_expires_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'role_id'           => 'integer',
        'can_create_users' => 'integer',
        'report_notification' => 'integer',
        'allowed_ips'       => 'array',
    ];

    /**
     * Backwards-compatible alias:
     * Some environments use `permission` as the DB column, while the frontend/API expects `panel_permission`.
     */
    public function getPanelPermissionAttribute(): int
    {
        if (array_key_exists('panel_permission', $this->attributes)) {
            return (int) $this->attributes['panel_permission'];
        }

        return (int) ($this->attributes['permission'] ?? 0);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    // CORRECT createToken() for Laravel 12 + Sanctum 4
    public function createToken(string $name = 'auth_token', array $abilities = ['*']): NewAccessToken
    {
        $plainTextToken = Str::random(40);

        $expiresAt = $this->role_id === 10 ? now()->addHours(72) : null;

        $token = $this->tokens()->create([
            'name'       => $name,
            'token'      => hash('sha256', $plainTextToken),
            'abilities'  => $abilities,
            'expires_at' => $expiresAt,
        ]);

        return new NewAccessToken($token, $token->id . '|' . $plainTextToken);
    }

    public function sendPasswordResetNotification($token)
    {
        $this->notify(new CustomResetPassword($token));
    }

    public function allowedIpsArray(): array
    {
        $raw = $this->allowed_ips;

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $raw = $decoded;
            } else {
                $raw = preg_split('/[\s,]+/', $raw) ?: [];
            }
        }

        if (!is_array($raw)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(static function ($ip) {
            return trim((string) $ip);
        }, $raw))));
    }

    public function isIpAllowed(string $ip): bool
    {
        return in_array($ip, $this->allowedIpsArray(), true);
    }

    public function cities()
{
    return $this->belongsToMany(City::class, 'city_users');
}

public function boards()
{
    return $this->belongsToMany(Board::class, 'board_users');
}

public function boardLists()
{
    return $this->belongsToMany(
        BoardList::class,
        'board_list_user'
    );
}

public function boardCards()
{
    return $this->belongsToMany(
        BoardCard::class,
        'board_card_user',
        'user_id',
        'board_card_id'
    );
}
}
