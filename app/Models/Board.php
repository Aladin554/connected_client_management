<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Board extends Model
{
    protected $fillable = [
        'name',
    ];

    public function lists()
    {
        return $this->hasMany(BoardList::class)->orderBy('position');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'board_users');
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

}
