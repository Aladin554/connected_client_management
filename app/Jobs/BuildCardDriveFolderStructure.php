<?php

namespace App\Jobs;

use App\Http\Controllers\BoardCardController;
use App\Models\BoardCard;
use App\Services\GoogleDriveService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Builds a card's full Drive subfolder tree (Admission/Client Uploaded/Visa
 * Specific + the ~200-folder visa checklist template) and then shares it,
 * all in the background. Card creation itself only waits on one Drive API
 * call (the card's own folder) - everything else happens here so the user
 * isn't stuck waiting on hundreds of sequential API calls.
 */
class BuildCardDriveFolderStructure implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 4;
    public array $backoff = [30, 120, 300];
    public int $timeout = 1800;

    public function __construct(private readonly BoardCard $card)
    {
    }

    public function handle(GoogleDriveService $driveService, BoardCardController $controller): void
    {
        $card = $this->card->fresh();
        if (!$card || !$card->google_drive_folder_id) {
            return;
        }

        $template = config('drive_folder_template', []);
        $failures = [];

        // createFolder() is idempotent (skips creation if a same-named
        // folder already exists under the parent), so a retry after a
        // partial failure - or this job overlapping the ensureClientUploadsSubfolder
        // backfill path - never produces duplicate top-level folders.
        $created = [];
        foreach (array_keys($template) as $name) {
            $folder = $driveService->createFolder($name, $card->google_drive_folder_id);
            if ($folder) {
                $created[$name] = $folder;
            } else {
                $failures[] = $name;
            }
        }

        foreach ($template as $name => $children) {
            $subfolder = $created[$name] ?? null;
            if (!$subfolder) {
                Log::error('Google Drive card structure: top-level subfolder failed', [
                    'card_id' => $card->id,
                    'name' => $name,
                ]);
                continue;
            }

            if ($name === $controller::CLIENT_UPLOADS_SUBFOLDER) {
                $card->update([
                    'google_drive_client_uploads_folder_id' => $subfolder['id'],
                    'google_drive_client_uploads_folder_link' => $subfolder['link'],
                ]);
            }

            // Root cause of the earlier "per-card Shared Drive disappears"
            // bug was NOT folder volume - it was syncCardDriveAccess()
            // dropping the OAuth-connected account's own membership during
            // sync (fixed there + in syncSharedDriveMembers()).
            if (!empty($children)) {
                try {
                    (new CreateDriveSubfolderTree($subfolder['id'], $children))->handle($driveService);
                } catch (\Throwable $exception) {
                    // Keep going with the other top-level branches instead of
                    // aborting the whole card on one bad branch - everything
                    // gets summarized into a single retry-triggering throw below.
                    $failures[] = "{$name} (" . $exception->getMessage() . ')';
                }
            }
        }

        UploadDriveTemplateFiles::dispatch($card);

        $controller->syncCardDriveAccess($card->fresh());

        // Throwing (instead of silently finishing "successfully" with gaps)
        // is what makes $tries/$backoff above actually retry a partial
        // failure - every create above is idempotent, so a retry only
        // redoes exactly what's still missing.
        if (!empty($failures)) {
            throw new \RuntimeException(
                "Google Drive structure build incomplete for card {$card->id}: " . implode(', ', $failures)
            );
        }
    }
}
