<?php

namespace App\Http\Controllers;

use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class CityController extends Controller
{
    private function isSuperAdmin(): bool
    {
        $user = auth()->user();
        return $user && $user->role?->name === 'superadmin';
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
            $query->whereIn('id', $user->cities->pluck('id'))
                  ->with(['boards' => function ($q) use ($user) {
                      $q->whereIn('id', $user->boards->pluck('id'))
                        ->with('lists');
                  }]);
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
            'boards.*' => 'string|max:255',
        ]);

        try {
            $city->update(['name' => $validated['name']]);

            // Safer approach: sync board names (delete missing, keep existing, add new)
            if (array_key_exists('boards', $validated)) {
                $currentNames = $city->boards->pluck('name')->toArray();
                $newNames     = $validated['boards'] ?? [];

                // Remove boards that are no longer in the list
                $toDelete = $city->boards->whereNotIn('name', $newNames);
                $city->boards()->whereIn('id', $toDelete->pluck('id'))->delete();

                // Add new boards
                $toAdd = array_diff($newNames, $currentNames);
                if (!empty($toAdd)) {
                    $city->boards()->createMany(
                        collect($toAdd)->map(fn($name) => ['name' => $name])
                    );
                }
            }

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

        try {
            $city->delete(); // assumes cascade or manual cleanup if needed
            return response()->json(['message' => 'City and associated boards deleted']);
        } catch (\Exception $e) {
            Log::error('City deletion failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to delete city'], 500);
        }
    }
}