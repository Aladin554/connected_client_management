<?php

namespace App\Http\Controllers;

use App\Models\CountryLabel;
use Illuminate\Http\Request;

class CountryLabelController extends Controller
{
    public function index()
    {
        return response()->json(CountryLabel::all(), 200);
    }

    // Store a new country label
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:country_labels,name',
        ]);

        $countryLabel = CountryLabel::create([
            'name' => $request->name,
        ]);

        return response()->json($countryLabel, 201);
    }

    // Show a single country label
    public function show($id)
    {
        $countryLabel = CountryLabel::find($id);
        if (!$countryLabel) {
            return response()->json(['message' => 'Not found'], 404);
        }
        return response()->json($countryLabel, 200);
    }

    // Update a country label
    public function update(Request $request, $id)
    {
        $countryLabel = CountryLabel::find($id);
        if (!$countryLabel) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate([
            'name' => 'required|string|unique:country_labels,name,' . $id,
        ]);

        $countryLabel->update([
            'name' => $request->name,
        ]);

        return response()->json($countryLabel, 200);
    }

    // Delete a country label
    public function destroy($id)
    {
        $countryLabel = CountryLabel::find($id);
        if (!$countryLabel) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $countryLabel->delete();
        return response()->json(['message' => 'Deleted successfully'], 200);
    }
}
