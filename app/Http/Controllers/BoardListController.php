<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardList;
use Illuminate\Http\Request;

class BoardListController extends Controller
{
    private function isCommissionBoardName(?string $name): bool
    {
        $normalized = strtolower(trim((string) $name));
        return str_contains($normalized, 'commission') || str_contains($normalized, 'comission');
    }

    private function isCommissionBoard(Board $board): bool
    {
        return $this->isCommissionBoardName($board->name ?? null);
    }

    private function canManageAllLists($user): bool
    {
        return (int) $user->role_id === 1;
    }

    private function assertCanAccessBoard(Board $board): void
    {
        $user = auth()->user();

        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        if ($this->isCommissionBoard($board) && (int) $user->role_id !== 1) {
            abort(403, 'Forbidden');
        }

        // Superadmin can access everything.
        if ((int) $user->role_id === 1) {
            return;
        }

        if (!$user->boards()->whereKey($board->id)->exists()) {
            abort(403, 'Forbidden');
        }
    }

    private function assertCanAccessList(BoardList $boardList): void
    {
        $user = auth()->user();

        if ($this->canManageAllLists($user)) {
            return;
        }

        $hasListAccess = $user->boardLists()->whereKey($boardList->id)->exists();
        if (!$hasListAccess) {
            abort(403, 'Forbidden');
        }
    }

    public function index(Board $board)
    {
        $this->assertCanAccessBoard($board);

        $query = $board->lists()->with([
            'cards' => function ($cardQuery) {
                $cardQuery
                    ->where('is_archived', false)
                    ->orderBy('position');
            },
        ]);

        if ($this->isCommissionBoard($board)) {
            $query->where('category', BoardList::CATEGORY_COMMISSION_BOARD);
        }

        if (!$this->canManageAllLists(auth()->user())) {
            $query->whereHas('users', function ($userQuery) {
                $userQuery->where('users.id', auth()->id());
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request, Board $board)
    {
        $this->assertCanAccessBoard($board);

        $validated = $request->validate([
            'title'    => 'required|string|max:255',
            'category' => 'nullable|integer|in:0,1,2,3,4',
            'position' => 'nullable|integer|min:0',
        ]);

        $requestedCategory = array_key_exists('category', $validated)
            ? (int) $validated['category']
            : null;

        if ($this->isCommissionBoard($board)) {
            if (
                $requestedCategory !== null &&
                $requestedCategory !== BoardList::CATEGORY_COMMISSION_BOARD
            ) {
                return response()->json([
                    'message' => 'Only Commission Board category is allowed for this board',
                ], 422);
            }
            $finalCategory = BoardList::CATEGORY_COMMISSION_BOARD;
        } else {
            if ($requestedCategory === BoardList::CATEGORY_COMMISSION_BOARD) {
                return response()->json([
                    'message' => 'Commission Board category can only be used in Commission Board',
                ], 422);
            }
            $finalCategory = $requestedCategory ?? BoardList::CATEGORY_ADMISSION;
        }

        $maxPosition = $board->lists()->max('position') ?? 0;
        $list = $board->lists()->create([
            'title'    => $validated['title'],
            'category' => $finalCategory,
            'position' => $validated['position'] ?? $maxPosition + 10000,
        ]);

        // Keep Cities & Access Control in sync:
        // when a new list is created, grant it to users already assigned to this board.
        $boardUserIds = $board->users()->pluck('users.id')->all();
        if (!empty($boardUserIds)) {
            $list->users()->syncWithoutDetaching($boardUserIds);
        }

        return response()->json($list->load([
            'cards' => function ($cardQuery) {
                $cardQuery
                    ->where('is_archived', false)
                    ->orderBy('position');
            },
        ]), 201);
    }

    public function update(Request $request, Board $board, BoardList $boardList)
    {
        if ($boardList->board_id !== $board->id) {
            abort(404);
        }

        $this->assertCanAccessBoard($board);
        $this->assertCanAccessList($boardList);

        // Only superadmin (role_id = 1) can rename list titles.
        if ($request->has('title') && (int) auth()->user()->role_id !== 1) {
            return response()->json(['message' => 'Only superadmin can edit list title'], 403);
        }

        // Only superadmin (role_id = 1) can reorder list positions.
        if ($request->has('position') && (int) auth()->user()->role_id !== 1) {
            return response()->json(['message' => 'Only superadmin can reorder lists'], 403);
        }

        $validated = $request->validate([
            'title'    => 'sometimes|required|string|max:255',
            'category' => 'sometimes|integer|in:0,1,2,3,4',
            'position' => 'sometimes|integer|min:0',
        ]);

        if (array_key_exists('category', $validated)) {
            $requestedCategory = (int) $validated['category'];
            if ($this->isCommissionBoard($board)) {
                if ($requestedCategory !== BoardList::CATEGORY_COMMISSION_BOARD) {
                    return response()->json([
                        'message' => 'Only Commission Board category is allowed for this board',
                    ], 422);
                }
            } elseif ($requestedCategory === BoardList::CATEGORY_COMMISSION_BOARD) {
                return response()->json([
                    'message' => 'Commission Board category can only be used in Commission Board',
                ], 422);
            }
        }

        $boardList->update($validated);

        return response()->json($boardList->load([
            'cards' => function ($cardQuery) {
                $cardQuery
                    ->where('is_archived', false)
                    ->orderBy('position');
            },
        ]));
    }

    public function destroy(Board $board, BoardList $boardList)
    {
        if ($boardList->board_id !== $board->id) {
            abort(404);
        }

        $this->assertCanAccessBoard($board);

        if ((int) auth()->user()->role_id !== 1) {
            return response()->json(['message' => 'Only superadmin can delete lists'], 403);
        }

        $boardList->delete();
        return response()->json(['message' => 'List deleted']);
    }
}
