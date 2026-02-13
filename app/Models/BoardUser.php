<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class BoardUser extends Pivot
{
    // Mass assignable columns
    protected $fillable = [
        'user_id',
        'board_id',
    ];

    // Optional: disable timestamps if you don't need them
    // public $timestamps = false;
}
