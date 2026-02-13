<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class City extends Model
{
    protected $fillable = ['name'];

    public function boards()
    {
        return $this->hasMany(Board::class);
    }
    public function users()
{
    return $this->belongsToMany(User::class, 'city_users');
}

}
