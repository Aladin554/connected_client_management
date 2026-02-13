<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BoardCard extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'board_list_id',
        'title',
        'description',
        'position',
        'checked',
        'first_name',
        'last_name',
        'invoice',
        'country_label_id',
        'intake_label_id',
        'due_date',           // ✅ new column added
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'position'          => 'integer',
        'checked'           => 'boolean',
        'country_label_id'  => 'integer',
        'intake_label_id'   => 'integer',
        'due_date'          => 'date',   // ✅ cast as date
    ];

    /**
     * Get the list that owns the card.
     */
    public function list(): BelongsTo
    {
        return $this->belongsTo(BoardList::class, 'board_list_id');
    }

    /**
     * Alias for list() used throughout the codebase.
     */
    public function boardList(): BelongsTo
    {
        return $this->belongsTo(BoardList::class, 'board_list_id');
    }

    /**
     * Get the country label assigned to this card.
     */
    public function countryLabel(): BelongsTo
    {
        return $this->belongsTo(CountryLabel::class, 'country_label_id');
    }

    /**
     * Get the intake label assigned to this card.
     */
    public function intakeLabel(): BelongsTo
    {
        return $this->belongsTo(IntakeLabel::class, 'intake_label_id');
    }
}
