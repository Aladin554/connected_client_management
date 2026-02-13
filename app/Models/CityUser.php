<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class CityUser extends Pivot
{
    // Mass assignable columns
    protected $fillable = [
        'user_id',
        'city_id',
    ];

    // Optional: disable timestamps if you don't need them
    // public $timestamps = false;
}
