<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
    'name',
    'guard_name',
    'can_create_users',
];

protected $casts = [
    'can_create_users' => 'boolean',
];

    /**
     * A role can have many users
     */
    public function users()
    {
        return $this->hasMany(User::class, 'role_id');
    }
}
