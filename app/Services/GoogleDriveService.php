<?php

namespace App\Services;

use App\Models\GoogleDriveSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Talks to the Google Drive API v3 REST endpoints directly (via Guzzle/Http)
 * using an OAuth-connected real Google account. Every card gets its own
 * brand new Shared Drive - only a real organization member (via OAuth) can
 * create those or add real members to them, so this is the only supported
 * mode. This avoids pulling in the full google/apiclient-services package,
 * which bundles generated bindings for every Google API and is impractically
 * large for what we need here (folder/file create + permission share/list/delete).
 */
class GoogleDriveService
{
    private const SCOPE = 'https://www.googleapis.com/auth/drive';
    private const BASE_URL = 'https://www.googleapis.com/drive/v3';
    private const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

    private ?GoogleDriveSetting $settings = null;
    private ?string $lastError = null;

    /**
     * Settings are DB-backed (managed from the admin panel) and cached for
     * the lifetime of this service instance so we don't re-query per call.
     */
    private function settings(): GoogleDriveSetting
    {
        return $this->settings ??= GoogleDriveSetting::current();
    }

    /**
     * Each card gets its own brand new Shared Drive, which requires a real
     * Google account (via OAuth) - an external service account can't create
     * Shared Drives in someone else's organization or add real members to one.
     */
    public function isOAuthEnabled(): bool
    {
        $settings = $this->settings();
        return $settings->oauth_enabled && !empty($settings->oauth_refresh_token);
    }

    public function getOAuthConnectedEmail(): ?string
    {
        return $this->settings()->oauth_connected_email;
    }

    public function getOAuthAuthorizationUrl(string $state): string
    {
        $params = [
            'client_id' => config('services.google_drive.oauth_client_id'),
            'redirect_uri' => config('services.google_drive.oauth_redirect_uri'),
            'response_type' => 'code',
            'scope' => self::SCOPE . ' https://www.googleapis.com/auth/userinfo.email',
            'access_type' => 'offline',
            // Forces the consent screen every time so Google always returns a
            // refresh_token, even if this account authorized the app before.
            'prompt' => 'consent',
            'state' => $state,
        ];

        return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
    }

    /**
     * Exchanges an OAuth "code" for a refresh token and stores it (plus the
     * connected account's email) on the settings row.
     */
    public function connectOAuthAccount(string $code): void
    {
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.google_drive.oauth_client_id'),
            'client_secret' => config('services.google_drive.oauth_client_secret'),
            'redirect_uri' => config('services.google_drive.oauth_redirect_uri'),
            'code' => $code,
            'grant_type' => 'authorization_code',
        ])->throw();

        $refreshToken = $response->json('refresh_token');
        $accessToken = $response->json('access_token');

        if (empty($refreshToken)) {
            throw new \RuntimeException(
                'Google did not return a refresh token. If this account already authorized this app before, '
                . 'revoke access at myaccount.google.com/permissions and try connecting again.'
            );
        }

        $email = Http::withToken($accessToken)
            ->get('https://www.googleapis.com/oauth2/v2/userinfo')
            ->throw()
            ->json('email');

        $this->settings()->update([
            'oauth_refresh_token' => $refreshToken,
            'oauth_connected_email' => $email,
        ]);

        Cache::forget('google_drive_oauth_access_token');
    }

    public function disconnectOAuthAccount(): void
    {
        $this->settings()->update([
            'oauth_enabled' => false,
            'oauth_refresh_token' => null,
            'oauth_connected_email' => null,
        ]);

        Cache::forget('google_drive_oauth_access_token');
    }

    private function oauthAccessToken(): string
    {
        $refreshToken = $this->settings()->oauth_refresh_token;
        if (empty($refreshToken)) {
            throw new \RuntimeException('Google OAuth account is not connected.');
        }

        return Cache::remember('google_drive_oauth_access_token', 2700, function () use ($refreshToken) {
            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google_drive.oauth_client_id'),
                'client_secret' => config('services.google_drive.oauth_client_secret'),
                'refresh_token' => $refreshToken,
                'grant_type' => 'refresh_token',
            ]);

            if (!$response->successful()) {
                throw new \RuntimeException('Failed to refresh Google OAuth access token: ' . $response->body());
            }

            return $response->json('access_token');
        });
    }

    private function oauthClient()
    {
        return Http::withToken($this->oauthAccessToken())
            ->baseUrl(self::BASE_URL)
            ->acceptJson();
    }

    /**
     * The raw error message from the most recent failed Drive API call, if any.
     * Useful for surfacing "why" a folder create/share silently returned null/false.
     */
    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    /**
     * Create a folder inside a Shared Drive, nested under a parent folder.
     * Returns ['id' => ..., 'link' => ...] or null on failure/if disabled.
     * Idempotent: if a folder with this name already exists directly inside
     * $parentFolderId, that one is returned instead of creating a duplicate -
     * this is what makes retrying a partially-failed job safe.
     */
    public function createFolder(string $name, string $parentFolderId): ?array
    {
        if (!$this->isOAuthEnabled()) {
            return null;
        }

        // The check-then-create below isn't atomic on its own: the background
        // BuildCardDriveFolderStructure job and an on-demand HTTP path (e.g.
        // ensureClientUploadsSubfolder(), triggered just by opening a brand
        // new card's detail modal) can both ask "does this folder exist yet?"
        // at the same moment, both get "no", and both create it - producing
        // two folders with the same name under the same parent. Serializing
        // per (parent, name) closes that window for every caller, not just
        // job-vs-job overlap (which WithoutOverlapping already covers).
        $lock = Cache::lock('gdrive-create-folder:' . $parentFolderId . ':' . md5($name), 30);

        try {
            return $lock->block(15, fn () => $this->createFolderUnlocked($name, $parentFolderId));
        } catch (\Throwable $exception) {
            // Couldn't get the lock in time - fall back to a best-effort
            // direct attempt (still exists-checked) rather than failing
            // outright just because another caller is briefly holding it.
            return $this->createFolderUnlocked($name, $parentFolderId);
        }
    }

    private function createFolderUnlocked(string $name, string $parentFolderId): ?array
    {
        $existing = $this->findChildByName($parentFolderId, $name, foldersOnly: true);
        if ($existing) {
            return $existing;
        }

        try {
            // Ask for id+webViewLink directly in the create response so we
            // don't need a second round-trip to fetch metadata - this matters
            // a lot when creating large folder trees (100+ folders).
            $response = $this->oauthClient()
                ->post('/files?supportsAllDrives=true&fields=id%2CwebViewLink', [
                    'name' => $name,
                    'mimeType' => 'application/vnd.google-apps.folder',
                    'parents' => [$parentFolderId],
                ])
                ->throw();

            $fileId = $response->json('id');
            if (!$fileId) {
                return null;
            }

            // Deliberately pace writes into a per-card Shared Drive - see the
            // note in ensureCardDriveFolder() for why. This runs in a
            // background job, so the extra time is invisible to users.
            usleep(500000);

            return [
                'id' => $fileId,
                'link' => $response->json('webViewLink'),
            ];
        } catch (\Throwable $exception) {
            $this->lastError = $exception->getMessage();
            Log::error('Google Drive folder creation failed', [
                'name' => $name,
                'parent' => $parentFolderId,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Find a direct child of $parentFolderId with the exact given name
     * (folder or file, unless $foldersOnly). Used to make uploads/creates
     * idempotent - safe to call again after a retry without risking
     * duplicates.
     */
    private function findChildByName(string $parentFolderId, string $name, bool $foldersOnly = false): ?array
    {
        try {
            $escapedName = str_replace("'", "\\'", $name);

            $query = "'{$parentFolderId}' in parents and name='{$escapedName}' and trashed=false";
            if ($foldersOnly) {
                $query .= " and mimeType='application/vnd.google-apps.folder'";
            }

            $response = $this->oauthClient()
                ->get('/files', [
                    'q' => $query,
                    'corpora' => 'allDrives',
                    'includeItemsFromAllDrives' => 'true',
                    'supportsAllDrives' => 'true',
                    'fields' => 'files(id,webViewLink)',
                    'pageSize' => 1,
                ])
                ->throw();

            $id = $response->json('files.0.id');
            if (!$id) {
                return null;
            }

            return ['id' => $id, 'link' => $response->json('files.0.webViewLink')];
        } catch (\Throwable $exception) {
            Log::error('Google Drive child lookup failed', [
                'parent' => $parentFolderId,
                'name' => $name,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Upload a local file into a Drive folder. Idempotent: if a file with
     * the same name already exists directly inside $parentFolderId, that
     * one is returned instead of uploading again.
     * Returns ['id' => ..., 'link' => ...] on success (whether uploaded now
     * or already present) or null on genuine failure/if disabled - callers
     * that need to detect real failures (to retry) rely on that distinction.
     */
    public function uploadFile(string $localPath, string $parentFolderId, string $name): ?array
    {
        if (!$this->isOAuthEnabled()) {
            return null;
        }

        if (!is_file($localPath)) {
            Log::error('Google Drive file upload: local source file missing', ['path' => $localPath]);

            return null;
        }

        $existing = $this->findChildByName($parentFolderId, $name);
        if ($existing) {
            return $existing;
        }

        $bodyStream = null;
        $sourceHandle = null;

        try {
            $token = $this->oauthAccessToken();
            $mimeType = mime_content_type($localPath) ?: 'application/octet-stream';

            $boundary = 'drive-' . bin2hex(random_bytes(16));
            $metadata = json_encode(['name' => $name, 'parents' => [$parentFolderId]]);

            // Stream the multipart body through a temp resource (spills to
            // disk past 2MB) instead of buffering the whole file as one PHP
            // string - the largest template files run tens of MB, which blew
            // PHP's 128MB memory limit in production (file_get_contents()
            // plus the string concatenation needed two full copies in memory
            // at once).
            $bodyStream = fopen('php://temp/maxmemory:2097152', 'r+');
            fwrite($bodyStream, "--{$boundary}\r\n");
            fwrite($bodyStream, "Content-Type: application/json; charset=UTF-8\r\n\r\n");
            fwrite($bodyStream, $metadata . "\r\n");
            fwrite($bodyStream, "--{$boundary}\r\n");
            fwrite($bodyStream, "Content-Type: {$mimeType}\r\n\r\n");

            $sourceHandle = fopen($localPath, 'rb');
            stream_copy_to_stream($sourceHandle, $bodyStream);
            fclose($sourceHandle);
            $sourceHandle = null;

            fwrite($bodyStream, "\r\n--{$boundary}--");
            rewind($bodyStream);

            // Default 30s HTTP timeout is too short for the largest template
            // files (scanned PSDs/PDFs run tens of MB) - this runs in a
            // background job, so a generous timeout costs nothing.
            $response = Http::withToken($token)
                ->timeout(300)
                ->withBody($bodyStream, "multipart/related; boundary={$boundary}")
                ->post(self::UPLOAD_URL . '/files?uploadType=multipart&supportsAllDrives=true&fields=id%2CwebViewLink')
                ->throw();

            usleep(500000);

            return [
                'id' => $response->json('id'),
                'link' => $response->json('webViewLink'),
            ];
        } catch (\Throwable $exception) {
            $this->lastError = $exception->getMessage();
            Log::error('Google Drive file upload failed', [
                'name' => $name,
                'parent' => $parentFolderId,
                'error' => $exception->getMessage(),
            ]);

            return null;
        } finally {
            if (is_resource($sourceHandle)) {
                fclose($sourceHandle);
            }
            if (is_resource($bodyStream)) {
                fclose($bodyStream);
            }
        }
    }

    /**
     * Resolve a chain of folder names (relative to $rootFolderId) down to the
     * id of the deepest folder, walking one level at a time. Returns null if
     * any segment along the way can't be found.
     */
    public function resolveFolderPath(string $rootFolderId, array $pathSegments): ?string
    {
        $currentId = $rootFolderId;

        foreach ($pathSegments as $segment) {
            $child = $this->findChildByName($currentId, $segment, foldersOnly: true);
            if (!$child) {
                return null;
            }
            $currentId = $child['id'];
        }

        return $currentId;
    }

    /**
     * Create a brand new Shared Drive. Requires OAuth (isOAuthEnabled()) - an
     * external service account cannot create Shared Drives.
     */
    public function createSharedDrive(string $name): ?array
    {
        if (!$this->isOAuthEnabled()) {
            return null;
        }

        try {
            $requestId = (string) \Illuminate\Support\Str::uuid();

            $response = $this->oauthClient()
                ->post('/drives?requestId=' . $requestId, [
                    'name' => $name,
                ])
                ->throw();

            $driveId = $response->json('id');
            if (!$driveId) {
                return null;
            }

            return [
                'id' => $driveId,
                'link' => 'https://drive.google.com/drive/folders/' . $driveId,
            ];
        } catch (\Throwable $exception) {
            $this->lastError = $exception->getMessage();
            Log::error('Google Shared Drive creation failed', [
                'name' => $name,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Add someone as an actual member of a Shared Drive (not just an item
     * share) - this is what unlocks real Google Drive for Desktop local sync
     * and the ability to add new files from a synced local folder. Role:
     * reader|commenter|writer|fileOrganizer|organizer.
     */
    public function addSharedDriveMember(string $driveId, string $email, string $role = 'fileOrganizer'): bool
    {
        if (empty($driveId) || empty($email)) {
            return false;
        }

        try {
            $this->oauthClient()
                ->post("/files/{$driveId}/permissions?supportsAllDrives=true", [
                    'type' => 'user',
                    'role' => $role,
                    'emailAddress' => $email,
                ])
                ->throw();

            return true;
        } catch (\Throwable $exception) {
            $this->lastError = $exception->getMessage();
            Log::error('Google Shared Drive member add failed', [
                'drive_id' => $driveId,
                'email' => $email,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Add several members to a Shared Drive concurrently (one round-trip's
     * worth of latency instead of one per person). Used right after creating
     * a per-card Shared Drive, where every admin needs to become a member
     * immediately - a member-less Shared Drive appears to get garbage
     * collected by Google after a few minutes, so this can't wait.
     */
    public function addSharedDriveMembersConcurrently(string $driveId, array $emails, string $role = 'organizer'): void
    {
        $emails = array_values(array_filter(array_unique($emails)));
        if (empty($driveId) || empty($emails)) {
            return;
        }

        try {
            $token = $this->oauthAccessToken();

            Http::pool(fn ($pool) => collect($emails)->map(
                fn (string $email) => $pool->as($email)
                    ->withToken($token)
                    ->baseUrl(self::BASE_URL)
                    ->acceptJson()
                    ->post("/files/{$driveId}/permissions?supportsAllDrives=true", [
                        'type' => 'user',
                        'role' => $role,
                        'emailAddress' => $email,
                    ])
            )->all());
        } catch (\Throwable $exception) {
            $this->lastError = $exception->getMessage();
            Log::error('Google Shared Drive concurrent member add failed', [
                'drive_id' => $driveId,
                'emails' => $emails,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * Sync a Shared Drive's members to exactly match the given email => role
     * map (add missing, remove anyone not in the map). Takes a role per
     * email - rather than a single role for a flat email list - because
     * calling this twice with two different partial lists/roles would have
     * each call delete the other's members (this is one merged pass instead).
     */
    public function syncSharedDriveMembers(string $driveId, array $emailToRole): void
    {
        if (empty($driveId)) {
            return;
        }

        try {
            $wanted = collect($emailToRole)
                ->filter(fn ($role, $email) => !empty($email))
                ->mapWithKeys(fn ($role, $email) => [strtolower(trim($email)) => $role]);

            $existingByEmail = collect($this->listUserPermissions($driveId))
                ->keyBy(fn ($permission) => strtolower($permission['emailAddress']));

            $connectedEmail = strtolower((string) $this->getOAuthConnectedEmail());

            foreach ($existingByEmail as $email => $permission) {
                if ($wanted->has($email)) {
                    continue;
                }

                // Never remove the OAuth-connected account's own access to a
                // Shared Drive it manages - doing so orphans the drive from
                // our own perspective (no accessible organizer left), which
                // makes it immediately inaccessible/gone. A caller should
                // always include this email in $emailToRole, but this is a
                // hard safety net regardless of what's passed in.
                if ($email === $connectedEmail && $connectedEmail !== '') {
                    continue;
                }

                try {
                    $this->oauthClient()
                        ->delete("/files/{$driveId}/permissions/{$permission['id']}?supportsAllDrives=true")
                        ->throw();
                } catch (\Throwable $exception) {
                    Log::error('Google Shared Drive member removal failed', [
                        'drive_id' => $driveId,
                        'email' => $email,
                        'error' => $exception->getMessage(),
                    ]);
                }
            }

            foreach ($wanted as $email => $role) {
                if (!$existingByEmail->has($email)) {
                    $this->addSharedDriveMember($driveId, $email, $role);
                }
            }
        } catch (\Throwable $exception) {
            Log::error('Google Shared Drive member sync failed', [
                'drive_id' => $driveId,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * Grant a user access to a folder by email. Role: reader|commenter|writer.
     */
    public function shareFolder(string $folderId, string $email, ?string $role = null): bool
    {
        if (empty($folderId) || empty($email) || !$this->isOAuthEnabled()) {
            return false;
        }

        try {
            $this->oauthClient()
                ->post("/files/{$folderId}/permissions?supportsAllDrives=true", [
                    'type' => 'user',
                    'role' => $role ?: 'writer',
                    'emailAddress' => $email,
                ])
                ->throw();

            return true;
        } catch (\Throwable $exception) {
            $this->lastError = $exception->getMessage();
            Log::error('Google Drive share failed', [
                'folder_id' => $folderId,
                'email' => $email,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    private function listUserPermissions(string $folderId): array
    {
        $response = $this->oauthClient()
            ->get("/files/{$folderId}/permissions", [
                'supportsAllDrives' => 'true',
                'fields' => 'permissions(id, emailAddress, type, role, permissionDetails)',
            ])
            ->throw();

        return collect($response->json('permissions', []))
            ->filter(function ($permission) {
                if (($permission['type'] ?? null) !== 'user' || empty($permission['emailAddress'])) {
                    return false;
                }
                if (($permission['role'] ?? null) === 'owner') {
                    return false;
                }
                // Permissions inherited from a parent folder can't be removed on the
                // child directly (the API rejects the delete) - only permissions set
                // directly on this file are ours to manage.
                $details = $permission['permissionDetails'] ?? [];
                foreach ($details as $detail) {
                    if (!empty($detail['inherited'])) {
                        return false;
                    }
                }
                return true;
            })
            ->values()
            ->all();
    }

    /**
     * Revoke a user's access to a folder by email.
     */
    public function revokeAccess(string $folderId, string $email): bool
    {
        if (!$this->isOAuthEnabled() || empty($folderId) || empty($email)) {
            return false;
        }

        try {
            foreach ($this->listUserPermissions($folderId) as $permission) {
                if (strcasecmp((string) $permission['emailAddress'], $email) === 0) {
                    $this->oauthClient()
                        ->delete("/files/{$folderId}/permissions/{$permission['id']}?supportsAllDrives=true")
                        ->throw();
                }
            }

            return true;
        } catch (\Throwable $exception) {
            Log::error('Google Drive revoke access failed', [
                'folder_id' => $folderId,
                'email' => $email,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Sync a folder's user-type permissions to exactly match the given list of emails.
     * Emails not in the list are removed; emails in the list not yet shared are added.
     */
    public function syncFolderMembers(string $folderId, array $emails, ?string $role = null): void
    {
        if (empty($folderId) || !$this->isOAuthEnabled()) {
            return;
        }

        try {
            $wanted = collect($emails)
                ->filter(fn ($email) => !empty($email))
                ->map(fn ($email) => strtolower(trim($email)))
                ->unique()
                ->values();

            $existingByEmail = collect($this->listUserPermissions($folderId))
                ->keyBy(fn ($permission) => strtolower($permission['emailAddress']));

            foreach ($existingByEmail as $email => $permission) {
                if ($wanted->contains($email)) {
                    continue;
                }

                try {
                    $this->oauthClient()
                        ->delete("/files/{$folderId}/permissions/{$permission['id']}?supportsAllDrives=true")
                        ->throw();
                } catch (\Throwable $exception) {
                    Log::error('Google Drive permission removal failed', [
                        'folder_id' => $folderId,
                        'email' => $email,
                        'error' => $exception->getMessage(),
                    ]);
                }
            }

            foreach ($wanted as $email) {
                if (!$existingByEmail->has($email)) {
                    $this->shareFolder($folderId, $email, $role);
                }
            }
        } catch (\Throwable $exception) {
            Log::error('Google Drive member sync failed', [
                'folder_id' => $folderId,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
