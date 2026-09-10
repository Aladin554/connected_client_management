<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
        'contact_email',
        'country_label_id',
        'country_label_ids',
        'intake_label_id',
        'service_area_id',
        'service_area_ids',
        'due_date',
        'payment_done',
        'dependant_payment_done',
        'is_archived',
        'google_drive_folder_id',
        'google_drive_folder_link',
        'google_drive_client_uploads_folder_id',
        'google_drive_client_uploads_folder_link',
        'google_drive_synced_at',
        'google_drive_ready_at',
        'google_drive_own_shared_drive',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'position' => 'integer',
        'checked' => 'boolean',
        'country_label_id' => 'integer',
        'country_label_ids' => 'array',
        'intake_label_id' => 'integer',
        'service_area_id' => 'integer',
        'service_area_ids' => 'array',
        'due_date' => 'date',
        'payment_done' => 'boolean',
        'dependant_payment_done' => 'boolean',
        'is_archived' => 'boolean',
        'google_drive_synced_at' => 'datetime',
        'google_drive_ready_at' => 'datetime',
        'google_drive_own_shared_drive' => 'boolean',
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

    /**
     * Get the service area assigned to this card.
     */
    public function serviceArea(): BelongsTo
    {
        return $this->belongsTo(ServiceArea::class, 'service_area_id');
    }

    /**
     * Users who can view this card when member-restricted.
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'board_card_user',
            'board_card_id',
            'user_id'
        );
    }
}
