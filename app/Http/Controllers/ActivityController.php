<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Card;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityController extends Controller
{
    public function indexForCard(Card $card)
    {
        $activities = Activity::where('card_id', $card->id)
            ->latest()
            ->get();

        return response()->json($activities);
    }

    public function storeComment(Request $request, Card $card)
    {
        $request->validate([
            'details' => 'required|string|max:2000',
        ]);

        $activity = Activity::create([
            'user_id'    => Auth::id(),
            'user_name'  => Auth::user()?->name ?? 'Guest',
            'card_id'    => $card->id,
            'action'     => 'commented',
            'details'    => $request->details,
        ]);

        return response()->json($activity, 201);
    }

    // General logging helper (called from other controllers)
    public function store(array $data)
    {
        return Activity::create($data);
    }
}