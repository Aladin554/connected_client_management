<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoogleDriveSetting extends Model
{
    protected $fillable = [
        'enabled',
        'active_mode',
        'root_folder_id',
        'shared_drive_id',
        'default_role',
        'oauth_enabled',
        'oauth_refresh_token',
        'oauth_connected_email',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'oauth_enabled' => 'boolean',
        // Encrypted at rest - this is a real user's Google account credential,
        // not a scoped service-account key, so it's treated as more sensitive.
        'oauth_refresh_token' => 'encrypted',
    ];

    protected $hidden = [
        'oauth_refresh_token',
    ];

    /**
     * There is only ever one settings row; fetch it, creating a disabled
     * default row on first use.
     */
    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'enabled' => false,
            'active_mode' => 'my_drive',
            'default_role' => 'writer',
        ]);
    }

    public function activeFolderId(): ?string
    {
        return $this->active_mode === 'shared_drive' ? $this->shared_drive_id : $this->root_folder_id;
    }
}
