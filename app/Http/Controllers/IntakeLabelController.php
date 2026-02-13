<?php

namespace App\Http\Controllers;

use App\Models\IntakeLabel;
use Illuminate\Http\Request;

class IntakeLabelController extends Controller
{
    public function index()
    {
        return response()->json(IntakeLabel::all(), 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:intake_labels,name',
        ]);

        $intakeLabel = IntakeLabel::create([
            'name' => $request->name,
        ]);

        return response()->json($intakeLabel, 201);
    }

    public function show($id)
    {
        $intakeLabel = IntakeLabel::find($id);
        if (!$intakeLabel) {
            return response()->json(['message' => 'Not found'], 404);
        }
        return response()->json($intakeLabel, 200);
    }

    public function update(Request $request, $id)
    {
        $intakeLabel = IntakeLabel::find($id);
        if (!$intakeLabel) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate([
            'name' => 'required|string|unique:intake_labels,name,' . $id,
        ]);

        $intakeLabel->update([
            'name' => $request->name,
        ]);

        return response()->json($intakeLabel, 200);
    }

    public function destroy($id)
    {
        $intakeLabel = IntakeLabel::find($id);
        if (!$intakeLabel) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $intakeLabel->delete();
        return response()->json(['message' => 'Deleted successfully'], 200);
    }
}
