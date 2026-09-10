<?php

namespace App\Jobs;

use App\Models\BoardCard;
use App\Services\GoogleDriveService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Uploads the template files listed in config/drive_folder_template_files.php
 * into their matching folders inside a card's Drive structure (e.g. sample
 * checklists, fillable forms). Runs after BuildCardDriveFolderStructure so
 * every target folder already exists. Idempotent - GoogleDriveService::uploadFile()
 * skips any file that's already present, so re-running this (e.g. via the
 * ensureClientUploadsSubfolder backfill path) never creates duplicates.
 */
class UploadDriveTemplateFiles implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 4;
    public array $backoff = [30, 120, 300];
    public int $timeout = 1800;

    public function __construct(private readonly BoardCard $card)
    {
    }

    /**
     * With multiple queue workers, two of this job for the SAME card could
     * otherwise run at once and both upload the same file before either
     * sees the other's upload - idempotency only protects against a retry
     * after the first attempt finishes, not two attempts checking at the
     * same time. Serializes per card; different cards still run in parallel.
     */
    public function middleware(): array
    {
        return [(new WithoutOverlapping((string) $this->card->id))->expireAfter(1800)];
    }

    public function handle(GoogleDriveService $driveService): void
    {
        $card = $this->card->fresh();
        if (!$card || !$card->google_drive_folder_id) {
            return;
        }

        $entries = config('drive_folder_template_files', []);

        $resolvedFolderIds = [];
        $failures = [];

        foreach ($entries as $entry) {
            $path = $entry['path'];
            $pathKey = implode('/', $path);

            if (!array_key_exists($pathKey, $resolvedFolderIds)) {
                $resolvedFolderIds[$pathKey] = $driveService->resolveFolderPath(
                    $card->google_drive_folder_id,
                    $path
                );
            }

            $folderId = $resolvedFolderIds[$pathKey];
            if (!$folderId) {
                Log::error('Google Drive template file upload: target folder not found', [
                    'card_id' => $card->id,
                    'path' => $pathKey,
                    'file' => $entry['file'],
                ]);
                $failures[] = "{$pathKey}/{$entry['file']} (folder not found)";
                continue;
            }

            $localPath = storage_path('app/private/drive-templates/' . $entry['file']);
            $driveName = $entry['as'] ?? $entry['file'];

            $result = $driveService->uploadFile($localPath, $folderId, $driveName);
            if (!$result) {
                $failures[] = "{$pathKey}/{$entry['file']}";
            }
        }

        // uploadFile()/resolveFolderPath() are both idempotent, so retrying
        // this job after a partial failure only redoes what's still missing.
        // Note: google_drive_ready_at (gates the Drive link UI) is set by
        // BuildCardDriveFolderStructure right after sharing, not here - file
        // uploads have no bearing on whether the link is accessible.
        if (!empty($failures)) {
            throw new \RuntimeException(
                "Google Drive template file upload incomplete for card {$card->id}: " . implode(', ', $failures)
            );
        }
    }
}
