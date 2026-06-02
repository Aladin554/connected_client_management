<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardList;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BoardController extends Controller
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

    private function canReadAllBoardLists($user): bool
    {
        return in_array((int) $user->role_id, [1, 2, 3, 4], true);
    }

    private function canBypassCardMemberVisibility($user): bool
    {
        return in_array((int) $user->role_id, [1, 2], true);
    }

    private function canReadAllCardsInOpenVisibilityLists($user): bool
    {
        return (int) ($user->role_id ?? 0) === 3;
    }

    private function requiresExplicitCardMembership($user): bool
    {
        return in_array((int) $user->role_id, [3, 4], true);
    }

    private function applyCardVisibilityScope($cardQuery, $user): void
    {
        if ($this->canBypassCardMemberVisibility($user)) {
            return;
        }

        if ($this->requiresExplicitCardMembership($user)) {
            $cardQuery->where(function ($visibleQuery) use ($user) {
                $visibleQuery->whereHas('members', function ($memberQuery) use ($user) {
                    $memberQuery->where('users.id', $user->id);
                });

                if ($this->canReadAllCardsInOpenVisibilityLists($user)) {
                    $visibleQuery->orWhereHas('boardList', function ($listQuery) {
                        $listQuery->whereIn(\DB::raw('LOWER(TRIM(title))'), [
                            'new customers',
                            'member assigned',
                        ]);
                    });
                }
            });
            return;
        }

        $cardQuery->where(function ($visibleQuery) use ($user) {
            $visibleQuery
                ->whereDoesntHave('members')
                ->orWhereHas('members', function ($memberQuery) use ($user) {
                    $memberQuery->where('users.id', $user->id);
                });
        });
    }

    private function applyBoardWithListsAndCards($query, $user, bool $commissionCategoryOnly = false)
    {
        return $query->with([
            'lists' => function ($listQuery) use ($user, $commissionCategoryOnly) {
                if ($commissionCategoryOnly) {
                    $listQuery->where('category', BoardList::CATEGORY_COMMISSION_BOARD);
                }

                if (!$this->canReadAllBoardLists($user)) {
                    $listQuery->where(function ($visibleListQuery) use ($user) {
                        $visibleListQuery->whereHas('users', function ($userQuery) use ($user) {
                            $userQuery->where('users.id', $user->id);
                        });
                    });
                }

                $listQuery->orderBy('position')->with([
                    'cards' => function ($cardQuery) use ($user) {
                        $cardQuery->where('is_archived', false);
                        $cardQuery->orderBy('position');
                        $this->applyCardVisibilityScope($cardQuery, $user);

                        $cardQuery->with([
                            'members' => function ($memberQuery) {
                                $memberQuery
                                    ->select('users.id', 'users.first_name', 'users.last_name', 'users.role_id')
                                    ->orderBy('users.first_name')
                                    ->orderBy('users.last_name');
                            },
                        ]);
                    },
                ]);
            },
        ]);
    }

    /**
     * List all boards
     */
    public function index()
    {
        $user = auth()->user();

        if ((int) $user->role_id === 1) {
            // Superadmin sees all boards
            $boards = $this->applyBoardWithListsAndCards(Board::query(), $user)->latest()->get();
        } else {
            // Other users see only assigned boards
            $boards = $this->applyBoardWithListsAndCards(
                $user->boards()->where(function ($query) {
                    $query
                        ->whereRaw('LOWER(name) NOT LIKE ?', ['%commission%'])
                        ->whereRaw('LOWER(name) NOT LIKE ?', ['%comission%']);
                }),
                $user
            )->get();
        }

        return response()->json(['data' => $boards]);
    }

    /**
     * Store a new board (Superadmin only)
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        if ((int) $user->role_id !== 1) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $board = Board::create($validated);

        return response()->json([
            'message' => 'Board created',
            'data' => $board->load('lists.cards'),
        ], 201);
    }

    /**
     * Show a single board
     */
    public function show(Board $board)
    {
        $user = auth()->user();

        if ($this->isCommissionBoard($board) && (int) $user->role_id !== 1) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ((int) $user->role_id !== 1 && !$user->boards()->whereKey($board->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $this->applyBoardWithListsAndCards(
                Board::query()->whereKey($board->id),
                $user,
                $this->isCommissionBoard($board)
            )->firstOrFail(),
        ]);
    }

    public function memberCardCounts(Board $board)
    {
        $user = auth()->user();

        if ($this->isCommissionBoard($board) && (int) $user->role_id !== 1) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ((int) $user->role_id !== 1 && !$user->boards()->whereKey($board->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $counts = DB::table('board_card_user')
            ->join('board_cards', 'board_card_user.board_card_id', '=', 'board_cards.id')
            ->join('board_lists', 'board_cards.board_list_id', '=', 'board_lists.id')
            ->where('board_lists.board_id', $board->id)
            ->where('board_cards.is_archived', false)
            ->select('board_card_user.user_id', DB::raw('COUNT(DISTINCT board_cards.id) as card_count'))
            ->groupBy('board_card_user.user_id')
            ->get()
            ->map(fn ($row) => [
                'user_id' => (int) $row->user_id,
                'card_count' => (int) $row->card_count,
            ]);

        return response()->json(['data' => $counts]);
    }

    /**
     * Update board (Superadmin only)
     */
    public function update(Request $request, Board $board)
    {
        $user = auth()->user();

        if ((int) $user->role_id !== 1) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $board->update($validated);

        return response()->json([
            'message' => 'Board updated',
            'data' => $board->load('lists.cards'),
        ]);
    }

    /**
     * Delete board (Superadmin only)
     */
    public function destroy(Board $board)
    {
        $user = auth()->user();

        if ((int) $user->role_id !== 1) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $board->delete();

        return response()->json(['message' => 'Board deleted']);
    }

    /**
     * Get boards (no branch, with gradients)
     */
    public function indexWithGradients()
    {
        $user = auth()->user();

        if ((int) $user->role_id === 1) {
            $boards = Board::latest()->get(['id', 'name']);
        } else {
            $boards = $user->boards()
                ->where(function ($query) {
                    $query
                        ->whereRaw('LOWER(name) NOT LIKE ?', ['%commission%'])
                        ->whereRaw('LOWER(name) NOT LIKE ?', ['%comission%']);
                })
                ->get(['id', 'name']);
        }

        $gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #89fffd 0%, #ef32d9 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
            'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
            'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
            'linear-gradient(135deg, #a6c0fe 0%, #f68084 100%)',
            'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
        ];

        $boards = $boards->map(function ($board) use ($gradients) {
            $board->background_gradient = $gradients[array_rand($gradients)];
            return $board;
        });

        return response()->json(['data' => $boards]);
    }
}
