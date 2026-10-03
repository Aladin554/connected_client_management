<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardList;
use App\Models\City;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Editing a city used to sync boards by name: any board missing from the
 * submitted list was deleted, cascading away all of its lists and cards.
 * Renaming a board in the city form therefore wiped it (2026-09-30 incident).
 */
class CityBoardSyncSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_renaming_a_board_keeps_it_and_its_lists(): void
    {
        [$city, $board, $list] = $this->cityWithBusyBoard();
        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/cities/{$city->id}", [
            'name' => 'Dhaka',
            'boards' => [['id' => $board->id, 'name' => 'Operations Board']],
        ])->assertOk();

        $this->assertSame('Operations Board', $board->fresh()->name);
        $this->assertNotNull($list->fresh());
        $this->assertSame(1, Board::count());
    }

    public function test_name_only_payload_dropping_a_busy_board_is_refused(): void
    {
        // Exactly what the old form sent on 2026-09-30: the busy board's name
        // replaced by a new one.
        [$city, $board, $list] = $this->cityWithBusyBoard();
        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/cities/{$city->id}", [
            'name' => 'Dhaka Renamed',
            'boards' => ['Operations Board'],
        ])->assertStatus(422);

        $this->assertNotNull($board->fresh());
        $this->assertNotNull($list->fresh());
        $this->assertSame('Dhaka', $city->fresh()->name, 'nothing is saved when the request is refused');
        $this->assertSame(1, Board::count());
    }

    public function test_removing_a_busy_board_by_id_is_refused(): void
    {
        [$city, $board] = $this->cityWithBusyBoard();
        $empty = $this->board($city, 'Empty Board');
        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/cities/{$city->id}", [
            'name' => 'Dhaka',
            'boards' => [['id' => $empty->id, 'name' => 'Empty Board']],
        ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'Not saved: Uttara Office still has lists and cards, so it can\'t be removed from the city. To rename a board, edit its name instead of removing it.']);

        $this->assertNotNull($board->fresh());
    }

    public function test_empty_boards_can_still_be_removed_and_new_ones_added(): void
    {
        [$city, $busy] = $this->cityWithBusyBoard();
        $empty = $this->board($city, 'Dhanmondi Office');
        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/cities/{$city->id}", [
            'name' => 'Dhaka',
            'boards' => [['id' => $busy->id, 'name' => 'Uttara Office'], ['name' => 'Gulshan Office']],
        ])->assertOk();

        $this->assertNull($empty->fresh());
        $this->assertNotNull($busy->fresh());
        $this->assertEqualsCanonicalizing(['Uttara Office', 'Gulshan Office'], $city->boards()->pluck('name')->all());
    }

    public function test_board_id_from_another_city_is_rejected(): void
    {
        [$city] = $this->cityWithBusyBoard();
        $otherBoard = $this->board(City::create(['name' => 'Commission']), 'Commission Board');
        Sanctum::actingAs($this->superAdmin());

        $this->putJson("/api/cities/{$city->id}", [
            'name' => 'Dhaka',
            'boards' => [['id' => $otherBoard->id, 'name' => 'Hijacked']],
        ])->assertStatus(422);

        $this->assertSame('Commission Board', $otherBoard->fresh()->name);
    }

    public function test_city_with_busy_boards_cannot_be_deleted(): void
    {
        [$city, $board, $list] = $this->cityWithBusyBoard();
        Sanctum::actingAs($this->superAdmin());

        $this->deleteJson("/api/cities/{$city->id}")->assertStatus(422);

        $this->assertNotNull($city->fresh());
        $this->assertNotNull($list->fresh());
    }

    public function test_city_with_only_empty_boards_can_be_deleted(): void
    {
        $city = City::create(['name' => 'Chittagong']);
        $this->board($city, 'Empty Board');
        Sanctum::actingAs($this->superAdmin());

        $this->deleteJson("/api/cities/{$city->id}")->assertOk();

        $this->assertNull($city->fresh());
    }

    private function cityWithBusyBoard(): array
    {
        $city = City::create(['name' => 'Dhaka']);
        $board = $this->board($city, 'Uttara Office');
        $list = BoardList::create(['board_id' => $board->id, 'title' => 'New Customers', 'position' => 1]);

        return [$city, $board, $list];
    }

    private function board(City $city, string $name): Board
    {
        return Model::unguarded(fn () => Board::create(['name' => $name, 'city_id' => $city->id]));
    }

    private function superAdmin(): User
    {
        return User::create([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'super-' . Str::lower((string) Str::uuid()) . '@example.com',
            'password' => bcrypt('password'),
            'role_id' => 1,
            'allowed_ips' => [],
        ]);
    }
}
