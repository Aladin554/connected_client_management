<?php

namespace App\Jobs;

use App\Http\Controllers\BoardCardController;
use App\Models\BoardCard;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;

/**
 * Queued wrapper around BoardCardController::syncCardDriveAccess() for a
 * single card - used to force an immediate re-sync of every card's Drive
 * membership, e.g. right after a superadmin revokes an admin's Drive access
 * (see UserController::toggleDriveAccess), instead of waiting for that
 * card's own next natural sync event.
 */
class SyncCardDriveAccess implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 4;
    public array $backoff = [30, 120, 300];
    public int $timeout = 1800;

    public function __construct(private readonly BoardCard $card)
    {
    }

    public function middleware(): array
    {
        return [(new WithoutOverlapping((string) $this->card->id))->expireAfter(1800)];
    }

    public function handle(BoardCardController $controller): void
    {
        $card = $this->card->fresh();
        if ($card) {
            $controller->syncCardDriveAccess($card);
        }
    }
}
