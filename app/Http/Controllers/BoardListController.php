<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardList;
use Illuminate\Http\Request;

class BoardListController extends Controller
{
    private function assertCanAccessBoard(Board $board): void
    {
        $user = auth()->user();

        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        // Superadmin can access everything.
        if ((int) $user->role_id === 1) {
            return;
        }

        if (!$user->boards()->whereKey($board->id)->exists()) {
            abort(403, 'Forbidden');
        }
    }

    public function index(Board $board)
    {
        $this->assertCanAccessBoard($board);

        return response()->json(
            $board->lists()->with('cards')->get()
        );
    }

    public function store(Request $request, Board $board)
    {
        $this->assertCanAccessBoard($board);

        $validated = $request->validate([
            'title'    => 'required|string|max:255',
            'position' => 'nullable|integer|min:0',
        ]);

        $maxPosition = $board->lists()->max('position') ?? 0;
        $list = $board->lists()->create([
            'title'    => $validated['title'],
            'position' => $validated['position'] ?? $maxPosition + 10000,
        ]);

        return response()->json($list->load('cards'), 201);
    }

    public function update(Request $request, Board $board, BoardList $boardList)
    {
        if ($boardList->board_id !== $board->id) {
            abort(404);
        }

        $this->assertCanAccessBoard($board);

        $validated = $request->validate([
            'title'    => 'sometimes|required|string|max:255',
            'position' => 'sometimes|integer|min:0',
        ]);

        $boardList->update($validated);

        return response()->json($boardList->load('cards'));
    }

    public function destroy(Board $board, BoardList $boardList)
    {
        if ($boardList->board_id !== $board->id) {
            abort(404);
        }

        $this->assertCanAccessBoard($board);

        $boardList->delete();
        return response()->json(['message' => 'List deleted']);
    }
}
