<?php

namespace App\Http\Controllers;

use App\Models\BoardCard;
use App\Models\BoardList;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class BoardCardController extends Controller
{
    private function assertCanAccessBoardId(int $boardId): void
    {
        $user = Auth::user();

        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        // Superadmin can access everything.
        if ((int) $user->role_id === 1) {
            return;
        }

        if (!$user->boards()->whereKey($boardId)->exists()) {
            abort(403, 'Forbidden');
        }
    }

    private function assertCanAccessBoardList(BoardList $boardList): void
    {
        $this->assertCanAccessBoardId((int) $boardList->board_id);
    }

    private function assertCanAccessBoardCard(BoardCard $boardCard): void
    {
        $boardCard->loadMissing('boardList');

        $boardList = $boardCard->boardList;
        if (!$boardList) {
            abort(404);
        }

        $this->assertCanAccessBoardId((int) $boardList->board_id);
    }

    // Helper to get logged user full name
    private function userFullName()
    {
        $user = Auth::user();

        return trim(
            ($user->first_name ?? '') . ' ' . ($user->last_name ?? '')
        ) ?: 'Guest';
    }

    // GET all cards in a list
    public function index(BoardList $boardList)
    {
        $this->assertCanAccessBoardList($boardList);

        return response()->json(
            $boardList->cards()->orderBy('position')->get()
        );
    }

    // CREATE card + log activity
    public function store(Request $request, BoardList $boardList)
    {
        $this->assertCanAccessBoardList($boardList);

        $validated = $request->validate([
            'first_name'   => 'nullable|string|max:255',
            'last_name'    => 'nullable|string|max:255',
            'description'  => 'nullable|string',
            'position'     => 'nullable|integer|min:0',
            'checked'      => 'nullable|boolean',
        ]);

        // Auto invoice
        $yearShort = Carbon::now()->format('y');

        $lastCard = BoardCard::whereYear('created_at', Carbon::now()->year)
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastCard && $lastCard->invoice
            ? intval(substr($lastCard->invoice, -4)) + 1
            : 1;

        $invoice = sprintf("INV%s%04d", $yearShort, $sequence);

        // Auto position
        $maxPosition = $boardList->cards()->max('position') ?? 0;

        $card = $boardList->cards()->create([
            'invoice'     => $invoice,
            'first_name'  => $validated['first_name'] ?? null,
            'last_name'   => $validated['last_name'] ?? null,
            'description' => $validated['description'] ?? null,
            'position'    => $validated['position'] ?? $maxPosition + 10000,
            'checked'     => $validated['checked'] ?? false,
        ]);

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $card->id,
            'list_id'   => $boardList->id,
            'action'    => 'created card',
            'details'   => trim(($card->first_name ?? '') . ' ' . ($card->last_name ?? '')),
        ]);

        return response()->json($card, 201);
    }

    // UPDATE card (general)
    public function update(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $validated = $request->validate([
            'invoice'       => 'sometimes|string|max:255',
            'first_name'    => 'sometimes|nullable|string|max:255',
            'last_name'     => 'sometimes|nullable|string|max:255',
            'description'   => 'sometimes|nullable|string',
            'position'      => 'sometimes|integer|min:0',
            'checked'       => 'sometimes|boolean',
            'board_list_id' => 'sometimes|exists:board_lists,id',
        ]);

        $boardCard->update($validated);

        if ($request->has('description')) {
            Activity::create([
                'user_id'   => Auth::id(),
                'user_name' => $this->userFullName(),
                'card_id'   => $boardCard->id,
                'action'    => 'updated description',
                'details'   => 'Description was modified',
            ]);
        }

        return response()->json($boardCard);
    }

    // MOVE card + log activity
    public function move(Request $request)
    {
        $validated = $request->validate([
            'card_id'    => 'required|exists:board_cards,id',
            'to_list_id' => 'required|exists:board_lists,id',
            'position'   => 'required|integer|min:0',
        ]);

        $card = BoardCard::findOrFail($validated['card_id']);

        $card->loadMissing('boardList');
        $oldList = $card->boardList;
        if (!$oldList) {
            abort(404);
        }

        $newList = BoardList::findOrFail($validated['to_list_id']);

        // Prevent cross-board moves and enforce board access.
        if ((int) $newList->board_id !== (int) $oldList->board_id) {
            return response()->json(['message' => 'Cards cannot be moved across boards'], 422);
        }

        $this->assertCanAccessBoardId((int) $oldList->board_id);

        $oldTitle = $oldList->title ?? 'Previous List';
        $newTitle = $newList->title ?? 'New List';

        $card->update([
            'board_list_id' => $validated['to_list_id'],
            'position'      => $validated['position'],
        ]);

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $card->id,
            'list_id'   => $newList->id,
            'action'    => 'moved card',
            'details'   => "from \"$oldTitle\" to \"$newTitle\"",
        ]);

        return response()->json([
            'message' => 'Card moved successfully',
            'card'    => $card
        ]);
    }

    // DELETE card
    public function destroy(BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $boardCard->delete();

        return response()->json(['message' => 'Card deleted']);
    }

    // Update labels + log
    public function updateLabel(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $validated = $request->validate([
            'country_label_id' => 'nullable|exists:country_labels,id',
            'intake_label_id'  => 'nullable|exists:intake_labels,id',
        ]);

        $boardCard->update($validated);

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'updated labels',
            'details'   => 'Country/Intake labels changed',
        ]);

        return response()->json(
            $boardCard->fresh(['countryLabel', 'intakeLabel'])
        );
    }

    // Update description
    public function updateDescription(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $validated = $request->validate([
            'description' => 'nullable|string|max:2000',
        ]);

        $boardCard->update($validated);

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'updated description',
            'details'   => 'Description updated',
        ]);

        return response()->json($boardCard->fresh());
    }

    // Update due date
    public function updateDueDate(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $validated = $request->validate([
            'due_date' => 'nullable|date',
        ]);

        $oldDate = $boardCard->due_date;
        $newDate = $validated['due_date'];

        $boardCard->update($validated);

        $detail = $oldDate
            ? "changed from " . Carbon::parse($oldDate)->format('M d, Y') . " to " . ($newDate ? Carbon::parse($newDate)->format('M d, Y') : 'unset')
            : ($newDate ? "set to " . Carbon::parse($newDate)->format('M d, Y') : 'removed');

        Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'updated due date',
            'details'   => $detail,
        ]);

        return response()->json($boardCard->fresh());
    }

    // GET activities for a card
    public function activities(BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        return response()->json(
            Activity::where('card_id', $boardCard->id)->latest()->get()
        );
    }

    // POST comment
    public function storeComment(Request $request, BoardCard $boardCard)
    {
        $this->assertCanAccessBoardCard($boardCard);

        $validated = $request->validate([
            'details' => 'required|string|max:2000',
        ]);

        $activity = Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            'card_id'   => $boardCard->id,
            'action'    => 'commented',
            'details'   => $validated['details'],
        ]);

        return response()->json($activity, 201);
    }

    // General activity logger
    public function logActivity(Request $request)
    {
        $validated = $request->validate([
            'card_id'   => 'nullable|exists:board_cards,id',
            'list_id'   => 'nullable|exists:board_lists,id',
            'action'    => 'required|string|max:100',
            'details'   => 'nullable|string',
        ]);

        if (!empty($validated['card_id'])) {
            $card = BoardCard::findOrFail($validated['card_id']);
            $this->assertCanAccessBoardCard($card);
        }

        if (!empty($validated['list_id'])) {
            $list = BoardList::findOrFail($validated['list_id']);
            $this->assertCanAccessBoardList($list);
        }

        $activity = Activity::create([
            'user_id'   => Auth::id(),
            'user_name' => $this->userFullName(),
            ...$validated,
        ]);

        return response()->json($activity, 201);
    }
}
