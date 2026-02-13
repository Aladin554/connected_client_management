<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BoardList extends Model
{
    use HasFactory;

    protected $table = 'board_lists'; // ← good to be explicit if table != model name plural

    protected $fillable = [
        'board_id',
        'title',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function cards(): HasMany
    {
        return $this->hasMany(BoardCard::class, 'board_list_id')
                    ->orderBy('position');
    }

    /**
     * Users who have been granted access to this list
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'board_list_user',
            'board_list_id',   // ← explicit: foreign key for BoardList on pivot
            'user_id'          // ← explicit: foreign key for User on pivot
        );
        // ->withTimestamps();
    }
}