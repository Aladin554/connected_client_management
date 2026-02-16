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

    public const CATEGORY_ADMISSION = 0;
    public const CATEGORY_VISA = 1;
    public const CATEGORY_DEPENDANT_VISA = 2;

    protected $table = 'board_lists';

    protected $fillable = [
        'board_id',
        'title',
        'category',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
        'category' => 'integer',
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
     * Users who have been granted access to this list.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'board_list_user',
            'board_list_id',
            'user_id'
        );
    }
}
