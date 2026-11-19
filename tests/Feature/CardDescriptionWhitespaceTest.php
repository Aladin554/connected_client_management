<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Board;
use App\Models\BoardCard;
use App\Models\BoardList;
use App\Models\City;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CardDescriptionWhitespaceTest extends TestCase
{
    use RefreshDatabase;

    private const STORED = 'Bank: BDT 40,13,000<br> Refusal: Australia, USA<br> &nbsp;<br> ';

    public function test_whitespace_only_resave_is_ignored(): void
    {
        [$user, $card] = $this->makeCard(self::STORED);
        Sanctum::actingAs($user);

        $this->putJson("/api/cards/{$card->id}/description", [
            'description' => "Bank: BDT 40,13,000<br>Refusal:  Australia,\nUSA<br>&nbsp;<br>",
        ])->assertOk();

        $this->assertSame(self::STORED, $card->fresh()->description);
        $this->assertSame(0, Activity::where('card_id', $card->id)->count());
    }

    public function test_real_text_change_is_saved_and_logged(): void
    {
        [$user, $card] = $this->makeCard(self::STORED);
        Sanctum::actingAs($user);

        $next = 'Bank: BDT 40,13,000<br>Refusal: Australia, USA, UK<br>&nbsp;<br>';
        $this->putJson("/api/cards/{$card->id}/description", ['description' => $next])->assertOk();

        $this->assertSame($next, $card->fresh()->description);
        $this->assertSame(1, Activity::where('card_id', $card->id)->where('action', 'updated description')->count());
    }

    public function test_removing_a_space_between_words_is_saved_without_history(): void
    {
        [$user, $card] = $this->makeCard('Study Gap: No');
        Sanctum::actingAs($user);

        $this->putJson("/api/cards/{$card->id}/description", ['description' => 'StudyGap: No'])->assertOk();

        $this->assertSame('StudyGap: No', $card->fresh()->description);
        $this->assertSame(0, Activity::where('card_id', $card->id)->count());
    }

    public function test_adding_blank_lines_and_nbsp_is_saved_without_history(): void
    {
        [$user, $card] = $this->makeCard('Name: Ashraf<br>Phone: 0198');
        Sanctum::actingAs($user);

        $next = 'Name: Ashraf&nbsp;<br>&nbsp;<br>&nbsp;<br>Phone: 0198<br>&nbsp;';
        $this->putJson("/api/cards/{$card->id}/description", ['description' => $next])->assertOk();

        $this->assertSame($next, $card->fresh()->description);
        $this->assertSame(0, Activity::where('card_id', $card->id)->count());
    }

    public function test_plain_text_converted_to_html_lines_is_not_logged(): void
    {
        [$user, $card] = $this->makeCard("Grades & Stream: SSC\nGap: No");
        Sanctum::actingAs($user);

        $this->putJson("/api/cards/{$card->id}/description", [
            'description' => 'Grades &amp; Stream: SSC<br>Gap: No',
        ])->assertOk();

        $this->assertSame(0, Activity::where('card_id', $card->id)->count());
    }

    public function test_formatting_change_is_still_logged(): void
    {
        [$user, $card] = $this->makeCard('Gap: No');
        Sanctum::actingAs($user);

        $this->putJson("/api/cards/{$card->id}/description", ['description' => '<strong>Gap: No</strong>'])->assertOk();

        $this->assertSame(1, Activity::where('card_id', $card->id)->count());
    }

    private function makeCard(string $description): array
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

        $card = Model::unguarded(fn () => BoardCard::create([
            'board_list_id' => $list->id,
            'invoice' => 'INV-' . Str::upper(Str::random(10)),
            'first_name' => 'Test',
            'last_name' => 'Client',
            'position' => 1,
            'description' => $description,
        ]));

        return [$user, $card];
    }
}
