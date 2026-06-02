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

class BoardListAndCardMemberVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_subadmin_can_read_all_lists_but_only_member_cards_on_board_show(): void
    {
        $user = $this->makeUser(roleId: 3);
        [$board, $assignedList, $unassignedList, $assignedCard, $hiddenCard] = $this->makeBoardWithCards($user);

        Sanctum::actingAs($user);

        $response = $this->getJson("/api/boards/{$board->id}")
            ->assertOk();

        $lists = collect($response->json('data.lists'));
        $this->assertEqualsCanonicalizing(
            [$assignedList->id, $unassignedList->id],
            $lists->pluck('id')->all()
        );

        $cardIds = $lists
            ->flatMap(fn (array $list) => collect($list['cards'] ?? [])->pluck('id'))
            ->all();

        $this->assertContains($assignedCard->id, $cardIds);
        $this->assertNotContains($hiddenCard->id, $cardIds);
    }

    public function test_subadmin_can_read_all_cards_in_new_customers_and_member_assigned_lists(): void
    {
        $user = $this->makeUser(roleId: 3);
        $city = City::create(['name' => 'Dhaka']);

        $board = Model::unguarded(fn () => Board::create([
            'name' => 'Admissions Board',
            'city_id' => $city->id,
        ]));

        $board->users()->attach($user->id);

        $newCustomersList = BoardList::create([
            'board_id' => $board->id,
            'title' => 'New Customers',
            'position' => 1,
        ]);

        $memberAssignedList = BoardList::create([
            'board_id' => $board->id,
            'title' => 'Member Assigned',
            'position' => 2,
        ]);

        $normalList = BoardList::create([
            'board_id' => $board->id,
            'title' => 'Visa Follow Up',
            'position' => 3,
        ]);

        $newCustomerCard = BoardCard::create([
            'board_list_id' => $newCustomersList->id,
            'invoice' => 'INV-' . Str::upper(Str::random(10)),
            'first_name' => 'Visible',
            'last_name' => 'New Customer',
            'position' => 1,
        ]);

        $memberAssignedCard = BoardCard::create([
            'board_list_id' => $memberAssignedList->id,
            'invoice' => 'INV-' . Str::upper(Str::random(10)),
            'first_name' => 'Visible',
            'last_name' => 'Member Assigned',
            'position' => 1,
        ]);

        $normalHiddenCard = BoardCard::create([
            'board_list_id' => $normalList->id,
            'invoice' => 'INV-' . Str::upper(Str::random(10)),
            'first_name' => 'Hidden',
            'last_name' => 'Normal',
            'position' => 1,
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson("/api/boards/{$board->id}")
            ->assertOk();

        $cardIds = collect($response->json('data.lists'))
            ->flatMap(fn (array $list) => collect($list['cards'] ?? [])->pluck('id'))
            ->all();

        $this->assertContains($newCustomerCard->id, $cardIds);
        $this->assertContains($memberAssignedCard->id, $cardIds);
        $this->assertNotContains($normalHiddenCard->id, $cardIds);

        $this->getJson("/api/board-lists/{$newCustomersList->id}/cards")
            ->assertOk()
            ->assertJsonFragment(['id' => $newCustomerCard->id]);

        $this->getJson("/api/board-lists/{$memberAssignedList->id}/cards/{$memberAssignedCard->id}")
            ->assertOk();

        $this->putJson("/api/cards/{$newCustomerCard->id}/description", [
            'description' => 'Subadmin can save this open visibility card.',
        ])->assertOk();

        $this->putJson("/api/board-lists/{$memberAssignedList->id}/cards/{$memberAssignedCard->id}", [
            'invoice' => $memberAssignedCard->invoice,
            'first_name' => 'Saved',
            'last_name' => 'Member Assigned',
        ])->assertOk();

        $this->assertDatabaseHas('board_cards', [
            'id' => $newCustomerCard->id,
            'description' => 'Subadmin can save this open visibility card.',
        ]);

        $this->assertDatabaseHas('board_cards', [
            'id' => $memberAssignedCard->id,
            'first_name' => 'Saved',
        ]);
    }

    public function test_subadmin_member_card_counts_include_hidden_counsellor_cards(): void
    {
        $subadmin = $this->makeUser(roleId: 3);
        $counsellor = $this->makeUser(roleId: 4);
        [$board, , $list, $visibleCard, $hiddenCard] = $this->makeBoardWithCards($subadmin);

        $board->users()->attach($counsellor->id);

        $visibleCard->members()->attach($counsellor->id);
        $hiddenCard->members()->attach($counsellor->id);

        Sanctum::actingAs($subadmin);

        $this->getJson("/api/boards/{$board->id}/member-card-counts")
            ->assertOk()
            ->assertJsonFragment([
                'user_id' => $counsellor->id,
                'card_count' => 2,
            ]);

        $response = $this->getJson("/api/boards/{$board->id}")
            ->assertOk();

        $visibleCardIds = collect($response->json('data.lists'))
            ->flatMap(fn (array $list) => collect($list['cards'] ?? [])->pluck('id'))
            ->all();

        $this->assertContains($visibleCard->id, $visibleCardIds);
        $this->assertNotContains($hiddenCard->id, $visibleCardIds);
    }

    public function test_counsellor_can_read_all_lists_but_only_member_cards_on_board_show(): void
    {
        $user = $this->makeUser(roleId: 4);
        [$board, $assignedList, $unassignedList, $assignedCard, $hiddenCard] = $this->makeBoardWithCards($user);

        Sanctum::actingAs($user);

        $response = $this->getJson("/api/boards/{$board->id}")
            ->assertOk();

        $lists = collect($response->json('data.lists'));
        $this->assertEqualsCanonicalizing(
            [$assignedList->id, $unassignedList->id],
            $lists->pluck('id')->all()
        );

        $cardIds = $lists
            ->flatMap(fn (array $list) => collect($list['cards'] ?? [])->pluck('id'))
            ->all();

        $this->assertContains($assignedCard->id, $cardIds);
        $this->assertNotContains($hiddenCard->id, $cardIds);
    }

    public function test_subadmin_can_read_unassigned_list_cards_endpoint_with_member_filter(): void
    {
        $user = $this->makeUser(roleId: 3);
        [, , $unassignedList, $assignedCard, $hiddenCard] = $this->makeBoardWithCards($user);

        Sanctum::actingAs($user);

        $this->getJson("/api/board-lists/{$unassignedList->id}/cards")
            ->assertOk()
            ->assertJsonFragment(['id' => $assignedCard->id])
            ->assertJsonMissing(['id' => $hiddenCard->id]);
    }

    public function test_subadmin_can_open_assigned_card_without_list_permission_but_not_unassigned_card(): void
    {
        $user = $this->makeUser(roleId: 3);
        [, , $unassignedList, $assignedCard, $hiddenCard] = $this->makeBoardWithCards($user);

        Sanctum::actingAs($user);

        $this->getJson("/api/board-lists/{$unassignedList->id}/cards/{$assignedCard->id}")
            ->assertOk();

        $this->getJson("/api/board-lists/{$unassignedList->id}/cards/{$hiddenCard->id}")
            ->assertForbidden();
    }

    public function test_subadmin_can_move_member_card_to_visible_list_without_list_permission(): void
    {
        $user = $this->makeUser(roleId: 3);
        [, $targetList, $sourceList, $assignedCard] = $this->makeBoardWithCards($user);

        Sanctum::actingAs($user);

        $this->postJson('/api/cards/move', [
            'card_id' => $assignedCard->id,
            'to_list_id' => $targetList->id,
            'position' => 1,
        ])->assertOk();

        $this->assertDatabaseHas('board_cards', [
            'id' => $assignedCard->id,
            'board_list_id' => $targetList->id,
            'position' => 1,
        ]);

        $this->assertDatabaseMissing('board_list_user', [
            'board_list_id' => $targetList->id,
            'user_id' => $user->id,
        ]);

        $this->assertDatabaseMissing('board_list_user', [
            'board_list_id' => $sourceList->id,
            'user_id' => $user->id,
        ]);
    }

    public function test_counsellor_can_move_member_card_to_visible_list_without_list_permission(): void
    {
        $user = $this->makeUser(roleId: 4);
        [, $targetList, , $assignedCard] = $this->makeBoardWithCards($user);

        Sanctum::actingAs($user);

        $this->postJson('/api/cards/move', [
            'card_id' => $assignedCard->id,
            'to_list_id' => $targetList->id,
            'position' => 1,
        ])->assertOk();

        $this->assertDatabaseHas('board_cards', [
            'id' => $assignedCard->id,
            'board_list_id' => $targetList->id,
        ]);
    }

    public function test_subadmin_cannot_move_card_they_cannot_see(): void
    {
        $user = $this->makeUser(roleId: 3);
        [, $targetList, , , $hiddenCard] = $this->makeBoardWithCards($user);

        Sanctum::actingAs($user);

        $this->postJson('/api/cards/move', [
            'card_id' => $hiddenCard->id,
            'to_list_id' => $targetList->id,
            'position' => 1,
        ])->assertForbidden();
    }

    public function test_subadmin_can_save_member_card_after_moving_to_visible_list_without_list_permission(): void
    {
        $user = $this->makeUser(roleId: 3);
        [, $targetList, , $assignedCard] = $this->makeBoardWithCards($user);
        $country = CountryLabel::create(['name' => 'Canada']);
        $intake = IntakeLabel::create(['name' => 'Fall 2026']);
        $serviceArea = ServiceArea::create(['name' => 'Priority Service']);

        Sanctum::actingAs($user);

        $this->postJson('/api/cards/move', [
            'card_id' => $assignedCard->id,
            'to_list_id' => $targetList->id,
            'position' => 1,
        ])->assertOk();

        $this->putJson("/api/cards/{$assignedCard->id}/labels", [
            'country_label_id' => $country->id,
            'country_label_ids' => [$country->id],
            'intake_label_id' => $intake->id,
            'service_area_id' => $serviceArea->id,
            'service_area_ids' => [$serviceArea->id],
        ])->assertOk();

        $this->putJson("/api/cards/{$assignedCard->id}/description", [
            'description' => 'Saved after moving to a visible list.',
        ])->assertOk();

        $this->putJson("/api/cards/{$assignedCard->id}/due-date", [
            'due_date' => '2026-05-01',
        ])->assertOk();

        $this->postJson("/api/cards/{$assignedCard->id}/activities", [
            'details' => 'Comment after move.',
        ])->assertCreated();

        $assignedCard->refresh();

        $this->assertSame($targetList->id, (int) $assignedCard->board_list_id);
        $this->assertSame([$country->id], $assignedCard->country_label_ids);
        $this->assertSame($country->id, $assignedCard->country_label_id);
        $this->assertSame($intake->id, $assignedCard->intake_label_id);
        $this->assertSame([$serviceArea->id], $assignedCard->service_area_ids);
        $this->assertSame($serviceArea->id, $assignedCard->service_area_id);
        $this->assertSame('Saved after moving to a visible list.', $assignedCard->description);
        $this->assertSame('2026-05-01', $assignedCard->due_date?->toDateString());

        $this->assertDatabaseHas('activities', [
            'card_id' => $assignedCard->id,
            'action' => 'commented',
            'details' => 'Comment after move.',
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

    private function makeBoardWithCards(User $user): array
    {
        $city = City::create(['name' => 'Dhaka']);

        $board = Model::unguarded(fn () => Board::create([
            'name' => 'Admissions Board',
            'city_id' => $city->id,
        ]));

        $board->users()->attach($user->id);

        $assignedList = BoardList::create([
            'board_id' => $board->id,
            'title' => 'Assigned List',
            'position' => 1,
        ]);

        $unassignedList = BoardList::create([
            'board_id' => $board->id,
            'title' => 'Unassigned List',
            'position' => 2,
        ]);

        $assignedCard = BoardCard::create([
            'board_list_id' => $unassignedList->id,
            'invoice' => 'INV-' . Str::upper(Str::random(10)),
            'first_name' => 'Assigned',
            'last_name' => 'Student',
            'position' => 1,
        ]);

        $hiddenCard = BoardCard::create([
            'board_list_id' => $unassignedList->id,
            'invoice' => 'INV-' . Str::upper(Str::random(10)),
            'first_name' => 'Hidden',
            'last_name' => 'Student',
            'position' => 2,
        ]);

        $assignedCard->members()->attach($user->id);

        return [$board, $assignedList, $unassignedList, $assignedCard, $hiddenCard];
    }
}
