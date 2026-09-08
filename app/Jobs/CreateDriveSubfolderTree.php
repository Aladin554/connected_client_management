<?php

namespace App\Jobs;

use App\Services\GoogleDriveService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Recursively creates a nested folder structure under a given parent folder.
 * Goes through the real queue (database driver) rather than dispatchAfterResponse:
 * under `php artisan serve` there's no fastcgi_finish_request, so the HTTP
 * response wouldn't actually reach the client until the whole tree (100+
 * folders, several minutes) finished - a real queue worker processes this
 * in a fully separate process instead.
 */
class CreateDriveSubfolderTree implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 4;
    public array $backoff = [30, 120, 300];
    public int $timeout = 1800;

    /** @var string[] Relative paths (e.g. "02. Sponsor ID/NID Translated (If applicable)") that failed this run. */
    private array $failures = [];

    /**
     * @param array<string, array> $tree Folder name => children (nested, same shape recursively)
     * @param bool $useOAuth true when $parentFolderId lives inside a per-card
     *   Shared Drive (created via OAuth) - the service account isn't a member
     *   of those, so folder creation must go through the OAuth-connected account.
     */
    public function __construct(
        private readonly string $parentFolderId,
        private readonly array $tree,
        private readonly bool $useOAuth = false
    ) {
    }

    /**
     * Also usable as a plain synchronous call (not just via the queue) - see
     * BuildCardDriveFolderStructure, which calls this inline for the same
     * card's own tree instead of paying for a second queue round-trip.
     * createFolder() is idempotent, so retrying/re-calling this after a
     * partial failure only redoes what's actually missing.
     */
    public function handle(GoogleDriveService $driveService): void
    {
        $this->failures = [];
        $this->createTree($driveService, $this->parentFolderId, $this->tree);

        if (!empty($this->failures)) {
            throw new \RuntimeException(
                'Google Drive subfolder tree incomplete: ' . implode(', ', $this->failures)
            );
        }
    }

    private function createTree(GoogleDriveService $driveService, string $parentId, array $tree, string $pathPrefix = ''): void
    {
        foreach ($tree as $name => $children) {
            $path = $pathPrefix === '' ? (string) $name : "{$pathPrefix}/{$name}";

            try {
                $folder = $driveService->createFolder((string) $name, $parentId, $this->useOAuth);
            } catch (\Throwable $exception) {
                Log::error('Google Drive subfolder tree: folder creation failed', [
                    'name' => $name,
                    'parent' => $parentId,
                    'error' => $exception->getMessage(),
                ]);
                $this->failures[] = $path;
                continue;
            }

            if (!$folder) {
                Log::error('Google Drive subfolder tree: folder creation returned null', [
                    'name' => $name,
                    'parent' => $parentId,
                ]);
                $this->failures[] = $path;
                continue;
            }

            if (!empty($children)) {
                $this->createTree($driveService, $folder['id'], $children, $path);
            }
        }
    }
}
