<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CityController extends Controller
{
    private function isSuperAdmin(): bool
    {
        $user = auth()->user();
        return $user && ((int) $user->role_id === 1 || $user->role?->name === 'superadmin');
        // Alternative if you still want ID check as fallback:
        // return $user && ($user->role?->name === 'superadmin' || $user->id === 1);
    }

    /**
     * List cities – superadmin sees all, others see only permitted ones
     */
    public function index(): JsonResponse
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $query = City::query()->with(['boards.lists']); // ← crucial fix for frontend lists

        if (!$this->isSuperAdmin()) {
            // Effective access comes from city + board + list permissions.
            $directCityIds = $user->cities()->pluck('cities.id')->map(fn ($id) => (int) $id)->all();
            $boardIdsFromBoardPerm = $user->boards()->pluck('boards.id')->map(fn ($id) => (int) $id)->all();
            $boardIdsFromListPerm = $user->boardLists()->pluck('board_lists.board_id')->map(fn ($id) => (int) $id)->all();

            $allowedBoardIds = array_values(array_unique(array_merge($boardIdsFromBoardPerm, $boardIdsFromListPerm)));
            $cityIdsFromBoards = !empty($allowedBoardIds)
                ? Board::whereIn('id', $allowedBoardIds)->pluck('city_id')->map(fn ($id) => (int) $id)->all()
                : [];

            $allowedCityIds = array_values(array_unique(array_merge($directCityIds, $cityIdsFromBoards)));

            $query->whereIn('id', $allowedCityIds)
                ->with([
                    'boards' => function ($q) use ($allowedBoardIds) {
                        if (empty($allowedBoardIds)) {
                            $q->whereRaw('0 = 1');
                            return;
                        }

                        $q->whereIn('id', $allowedBoardIds)->with('lists');
                    }
                ]);
        }

        $cities = $query->latest()->get();

        return response()->json($cities);
    }

    /**
     * Create new city (superadmin only)
     */
    public function store(Request $request): JsonResponse
    {
        if (!$this->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized – superadmin only'], 403);
        }

        $validated = $request->validate([
            'name'   => 'required|string|max:255|unique:cities,name',
            'boards' => 'nullable|array',
            'boards.*' => 'string|max:255|distinct',
        ]);

        try {
            $city = City::create(['name' => $validated['name']]);

            if (!empty($validated['boards'])) {
                $city->boards()->createMany(
                    collect($validated['boards'])->map(fn($name) => ['name' => $name])
                );
            }

            return response()->json([
                'message' => 'City created successfully',
                'city'    => $city->load('boards.lists'),
            ], 201);

        } catch (\Exception $e) {
            Log::error('City creation failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to create city'], 500);
        }
    }

    /**
     * Show single city
     */
    public function show(City $city): JsonResponse
    {
        $user = auth()->user();

        if (!$this->isSuperAdmin() && !$user->cities->contains($city->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(
            $city->load(['boards.lists']) // ← nested lists
        );
    }

    /**
     * Update city – superadmin only
     * (now safer – only adds/removes changed boards)
     */
    public function update(Request $request, City $city): JsonResponse
    {
        if (!$this->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized – superadmin only'], 403);
        }

        $validated = $request->validate([
            'name'   => 'required|string|max:255|unique:cities,name,' . $city->id,
            'boards' => 'nullable|array',
            // Each entry is {id?, name} (current frontend) or a plain name (older clients).
            'boards.*' => 'required',
        ]);

        $syncBoards = array_key_exists('boards', $validated);
        $existing = $city->boards()->withCount('lists')->get()->keyBy('id');
        $entries = collect();

        if ($syncBoards) {
            foreach ($validated['boards'] ?? [] as $entry) {
                $id = is_array($entry) && isset($entry['id']) ? (int) $entry['id'] : null;
                $name = trim((string) (is_array($entry) ? ($entry['name'] ?? '') : $entry));

                if ($name === '') {
                    continue;
                }
                if (mb_strlen($name) > 255) {
                    return response()->json(['message' => 'Board names may not be longer than 255 characters.'], 422);
                }
                if ($id !== null && !$existing->has($id)) {
                    return response()->json(['message' => "Board #{$id} does not belong to this city."], 422);
                }
                // Plain names from older clients: match an existing board by name
                // so it is kept rather than treated as removed.
                if ($id === null) {
                    $id = $existing->first(fn ($board) => $board->name === $name)?->id;
                }

                $entries->push(['id' => $id, 'name' => $name]);
            }

            $keptIds = $entries->pluck('id')->filter()->all();
            if (count($keptIds) !== count(array_unique($keptIds))) {
                return response()->json(['message' => 'The same board is listed more than once.'], 422);
            }

            // A board missing from the submitted list is only ever removed when it
            // is empty. Deleting a board cascades to all of its lists, cards,
            // members and card assignments, so a board holding work is refused
            // outright instead of being silently wiped (renames keep the board id).
            $blocked = $existing->except($keptIds)->filter(fn ($board) => $board->lists_count > 0);
            if ($blocked->isNotEmpty()) {
                return response()->json([
                    'message' => 'Not saved: ' . $blocked->pluck('name')->implode(', ')
                        . ' still has lists and cards, so it can\'t be removed from the city. '
                        . 'To rename a board, edit its name instead of removing it.',
                ], 422);
            }
        }

        try {
            DB::transaction(function () use ($city, $validated, $syncBoards, $existing, $entries) {
                $city->update(['name' => $validated['name']]);

                if (!$syncBoards) {
                    return;
                }

                foreach ($entries as $entry) {
                    if ($entry['id'] === null) {
                        $city->boards()->create(['name' => $entry['name']]);
                    } elseif ($existing[$entry['id']]->name !== $entry['name']) {
                        $existing[$entry['id']]->update(['name' => $entry['name']]);
                    }
                }

                // Only empty boards can reach this point (checked above).
                // pluck('id'), not keys(): Eloquent's except() re-indexes the collection.
                $removedIds = $existing->except($entries->pluck('id')->filter()->all())->pluck('id');
                if ($removedIds->isNotEmpty()) {
                    $city->boards()->whereIn('id', $removedIds)->doesntHave('lists')->delete();
                }
            });

            return response()->json([
                'message' => 'City updated successfully',
                'city'    => $city->load('boards.lists'),
            ]);

        } catch (\Exception $e) {
            Log::error('City update failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to update city'], 500);
        }
    }

    /**
     * Delete city – superadmin only
     */
    public function destroy(City $city): JsonResponse
    {
        if (!$this->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized – superadmin only'], 403);
        }

        // Deleting a city cascades to its boards and from there to every list and
        // card on them, so refuse while any of its boards still holds work.
        $busyBoards = $city->boards()->has('lists')->pluck('name');
        if ($busyBoards->isNotEmpty()) {
            return response()->json([
                'message' => 'This city can\'t be deleted while these boards still have lists and cards: '
                    . $busyBoards->implode(', ') . '.',
            ], 422);
        }

        try {
            $city->delete();
            return response()->json(['message' => 'City and associated boards deleted']);
        } catch (\Exception $e) {
            Log::error('City deletion failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to delete city'], 500);
        }
    }
}
