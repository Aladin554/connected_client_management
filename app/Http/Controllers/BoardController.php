<?php

namespace App\Http\Controllers;

use App\Models\Board;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    /**
     * List all boards
     */
    public function index()
    {
        $user = auth()->user();

        if ($user->id === 1) {
            // Superadmin sees all boards
            $boards = Board::with('lists.cards')->latest()->get();
        } else {
            // Other users see only assigned boards
            $boards = $user->boards()->with('lists.cards')->get();
        }

        return response()->json(['data' => $boards]);
    }

    /**
     * Store a new board (Superadmin only)
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        if ($user->id !== 1) {
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

        if ($user->id !== 1 && !$user->boards()->whereKey($board->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $board->load('lists.cards')
        ]);
    }

    /**
     * Update board (Superadmin only)
     */
    public function update(Request $request, Board $board)
    {
        $user = auth()->user();

        if ($user->id !== 1) {
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

        if ($user->id !== 1) {
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

        if ($user->id === 1) {
            $boards = Board::latest()->get(['id', 'name']);
        } else {
            $boards = $user->boards()->get(['id', 'name']);
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
