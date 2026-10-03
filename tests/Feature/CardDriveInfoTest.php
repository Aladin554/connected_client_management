<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardCard;
use App\Models\BoardList;
use App\Models\City;
use App\Models\User;
use App\Services\GoogleDriveService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class CardDriveInfoTest extends TestCase
{
    use RefreshDatabase;

    public function test_card_without_folder_reports_has_folder_false_when_drive_enabled(): void
    {
        $this->mockDrive(oauthEnabled: true);
        [$user, $card] = $this->makeCard();

        Sanctum::actingAs($user);

        $this->getJson("/api/cards/{$card->id}/drive-info")
            ->assertOk()
            ->assertJson([
                'enabled' => true,
                'has_folder' => false,
                'ready' => false,
                'folder_link' => null,
            ]);
    }

    public function test_card_with_folder_not_yet_ready_reports_has_folder_true(): void
    {
        $this->mockDrive(oauthEnabled: true);
        [$user, $card] = $this->makeCard([
            'google_drive_folder_id' => 'drive-123',
            'google_drive_folder_link' => 'https://drive.google.com/drive/folders/drive-123',
            'google_drive_client_uploads_folder_id' => 'uploads-123',
        ]);

        Sanctum::actingAs($user);

        $this->getJson("/api/cards/{$card->id}/drive-info")
            ->assertOk()
            ->assertJson([
                'enabled' => true,
                'has_folder' => true,
            ]);
    }

    public function test_drive_disabled_reports_has_folder_false(): void
    {
        $this->mockDrive(oauthEnabled: false);
        [$user, $card] = $this->makeCard();

        Sanctum::actingAs($user);

        $this->getJson("/api/cards/{$card->id}/drive-info")
            ->assertOk()
            ->assertJson([
                'enabled' => false,
                'has_folder' => false,
            ]);
    }

    private function mockDrive(bool $oauthEnabled): void
    {
        $drive = Mockery::mock(GoogleDriveService::class)->shouldIgnoreMissing();
        $drive->shouldReceive('isOAuthEnabled')->andReturn($oauthEnabled);
        $drive->shouldReceive('getLastError')->andReturn(null);
        $drive->shouldReceive('getOAuthConnectedEmail')->andReturn(null);
        $this->app->instance(GoogleDriveService::class, $drive);
    }

    private function makeCard(array $attributes = []): array
    {
        $user = User::create([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'admin-' . Str::lower((string) Str::uuid()) . '@example.com',
            'password' => bcrypt('password'),
            'role_id' => 1,
            'allowed_ips' => [],
        ]);

        $city = City::create(['name' => 'Dhaka']);
        $board = Model::unguarded(fn () => Board::create([
            'name' => 'Admissions Board',
            'city_id' => $city->id,
        ]));
        $board->users()->attach($user->id);

        $list = BoardList::create([
            'board_id' => $board->id,
            'title' => 'New Customers',
            'position' => 1,
        ]);

        $card = Model::unguarded(fn () => BoardCard::create(array_merge([
            'board_list_id' => $list->id,
            'invoice' => 'INV-' . Str::upper(Str::random(10)),
            'first_name' => 'Test',
            'last_name' => 'Client',
            'position' => 1,
        ], $attributes)));

        return [$user, $card];
    }
}
