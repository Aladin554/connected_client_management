<?php

namespace App\Console\Commands;

use App\Jobs\BuildCardDriveFolderStructure;
use App\Models\BoardCard;
use Illuminate\Console\Command;

/**
 * Safety net for the "no gap acceptable" requirement: catches cards whose
 * Drive folder structure never finished building - e.g. the queue worker
 * was down when the card was created, or the job crashed outside the
 * retry/backoff Laravel already gives it. Every step this re-triggers
 * (folder creation, file upload, member sync) is idempotent, so re-running
 * it against an already-complete card is a harmless no-op.
 */
class RepairDriveCards extends Command
{
    protected $signature = 'drive:repair
        {--minutes=10 : Only repair cards whose Drive folder is older than this many minutes}
        {--all : Ignore the age cutoff and check every card with a Drive folder}';

    protected $description = 'Re-dispatch Google Drive folder-structure building for cards where it never finished';

    public function handle(): int
    {
        $query = BoardCard::query()
            ->whereNotNull('google_drive_folder_id')
            ->whereNull('google_drive_client_uploads_folder_id');

        if (!$this->option('all')) {
            $cutoff = now()->subMinutes((int) $this->option('minutes'));
            $query->where('created_at', '<=', $cutoff);
        }

        $cards = $query->get();

        if ($cards->isEmpty()) {
            $this->info('No incomplete Drive cards found.');

            return self::SUCCESS;
        }

        foreach ($cards as $card) {
            $this->line("Re-dispatching card {$card->id} ({$card->invoice})");
            BuildCardDriveFolderStructure::dispatch($card);
        }

        $this->info($cards->count() . ' card(s) re-dispatched.');

        return self::SUCCESS;
    }
}
