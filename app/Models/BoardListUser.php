<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class BoardListUser extends Pivot
{
    protected $table = 'board_list_user';

    protected $fillable = [
        'user_id',
        'board_list_id',
    ];
}
