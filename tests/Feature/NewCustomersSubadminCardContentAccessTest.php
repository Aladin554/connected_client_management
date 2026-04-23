<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardCard;
use App\Models\BoardList;
use App\Models\City;
use App\Models\CountryLabel;
use App\Models\IntakeLabel;
use App\Models\ServiceArea;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NewCustomersSubadminCardContentAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_subadmin_can_update_new_customers_card_content_without_list_assignment(): void
    {
        $user = $this->makeUser(roleId: 3);
        [, $card] = $this->makeBoardCardForUser($user, 'New Customers');

        $country = CountryLabel::create(['name' => 'Canada']);
        $intake = IntakeLabel::create(['name' => 'Fall 2026']);
        $serviceArea = ServiceArea::create(['name' => 'Priority Service']);

        Sanctum::actingAs($user);

        $this->putJson("/api/cards/{$card->id}/labels", [
            'country_label_id' => $country->id,
            'country_label_ids' => [$country->id],
            'intake_label_id' => $intake->id,
            'service_area_id' => $serviceArea->id,
            'service_area_ids' => [$serviceArea->id],
        ])->assertOk();

        $this->putJson("/api/cards/{$card->id}/description", [
            'description' => 'Passport received and profile updated.',
        ])->assertOk();

        $this->putJson("/api/cards/{$card->id}/due-date", [
            'due_date' => '2026-05-01',
        ])->assertOk();

        $this->postJson("/api/cards/{$card->id}/activities", [
            'details' => 'Waiting for final academic documents.',
        ])->assertCreated();

        $card->refresh();

        $this->assertSame([$country->id], $card->country_label_ids);
        $this->assertSame($country->id, $card->country_label_id);
        $this->assertSame($intake->id, $card->intake_label_id);
        $this->assertSame([$serviceArea->id], $card->service_area_ids);
        $this->assertSame($serviceArea->id, $card->service_area_id);
        $this->assertSame('Passport received and profile updated.', $card->description);
        $this->assertSame('2026-05-01', $card->due_date?->toDateString());

        $this->assertDatabaseHas('activities', [
            'card_id' => $card->id,
            'action' => 'updated labels',
        ]);

        $this->assertDatabaseHas('activities', [
            'card_id' => $card->id,
            'action' => 'updated description',
        ]);

        $this->assertDatabaseHas('activities', [
            'card_id' => $card->id,
            'action' => 'updated due date',
        ]);

        $this->assertDatabaseHas('activities', [
            'card_id' => $card->id,
            'action' => 'commented',
            'details' => 'Waiting for final academic documents.',
        ]);

        $this->assertFalse(
            $user->boardLists()->whereKey($card->board_list_id)->exists(),
            'The test should reflect the unassigned subadmin case.'
        );

        $this->assertFalse(
            $card->members()->whereKey($user->id)->exists(),
            'The test should reflect the non-member subadmin case.'
        );
    }

    public function test_subadmin_can_manage_new_customers_members_payment_and_archive_without_list_assignment(): void
    {
        $user = $this->makeUser(roleId: 3);
        $managedUser = $this->makeUser(roleId: 4);
        [$board, $card] = $this->makeBoardCardForUser($user, 'New Customers');

        Sanctum::actingAs($user);

        $this->getJson("/api/cards/{$card->id}/members")
            ->assertOk()
            ->assertJsonPath('can_manage', true);

        $this->putJson("/api/cards/{$card->id}/members", [
            'user_ids' => [$managedUser->id],
        ])->assertOk();

        $this->putJson("/api/cards/{$card->id}/payment", [
            'payment_done' => true,
        ])->assertOk();

        $this->putJson("/api/cards/{$card->id}/dependant-payment", [
            'dependant_payment_done' => true,
        ])->assertOk();

        $this->putJson("/api/cards/{$card->id}/archive", [
            'is_archived' => true,
        ])->assertOk();

        $card->refresh();

        $this->assertTrue((bool) $card->payment_done);
        $this->assertTrue((bool) $card->dependant_payment_done);
        $this->assertTrue((bool) $card->is_archived);

        $this->assertDatabaseHas('board_card_user', [
            'board_card_id' => $card->id,
            'user_id' => $managedUser->id,
        ]);

        $this->assertDatabaseHas('board_list_user', [
            'board_list_id' => $card->board_list_id,
            'user_id' => $managedUser->id,
        ]);

        $this->assertDatabaseHas('board_users', [
            'board_id' => $board->id,
            'user_id' => $managedUser->id,
        ]);

        $this->assertDatabaseHas('city_users', [
            'city_id' => $board->city_id,
            'user_id' => $managedUser->id,
        ]);

        $this->assertDatabaseHas('activities', [
            'card_id' => $card->id,
            'action' => 'updated members',
        ]);

        $this->assertDatabaseHas('activities', [
            'card_id' => $card->id,
            'action' => 'updated payment status',
        ]);

        $this->assertDatabaseHas('activities', [
            'card_id' => $card->id,
            'action' => 'updated dependant payment status',
        ]);

        $this->assertDatabaseHas('activities', [
            'card_id' => $card->id,
            'action' => 'archived card',
        ]);
    }

    public function test_subadmin_still_cannot_delete_new_customers_card_without_full_write_access(): void
    {
        $user = $this->makeUser(roleId: 3);
        [, $card] = $this->makeBoardCardForUser($user, 'New Customers');

        Sanctum::actingAs($user);

        $this->deleteJson("/api/board-lists/{$card->board_list_id}/cards/{$card->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('board_cards', [
            'id' => $card->id,
        ]);
    }

    private function makeUser(int $roleId): User
    {
        return User::create([
            'first_name' => 'Role',
            'last_name' => 'User',
            'email' => 'role-' . $roleId . '-' . Str::lower((string) Str::uuid()) . '@example.com',
            'password' => bcrypt('password'),
            'role_id' => $roleId,
            'allowed_ips' => [],
        ]);
    }

    private function makeBoardCardForUser(User $user, string $listTitle): array
    {
        $city = City::create(['name' => 'Dhaka']);

        $board = Model::unguarded(fn () => Board::create([
            'name' => 'Admissions Board',
            'city_id' => $city->id,
        ]));

        $board->users()->attach($user->id);

        $list = BoardList::create([
            'board_id' => $board->id,
            'title' => $listTitle,
            'position' => 1,
        ]);

        $card = BoardCard::create([
            'board_list_id' => $list->id,
            'invoice' => 'INV-' . Str::upper(Str::random(10)),
            'first_name' => 'New',
            'last_name' => 'Customer',
            'position' => 1,
        ]);

        return [$board, $card];
    }
}
