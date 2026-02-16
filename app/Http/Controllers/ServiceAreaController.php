<?php

namespace App\Http\Controllers;

use App\Models\ServiceArea;
use Illuminate\Http\Request;

class ServiceAreaController extends Controller
{
    public function index()
    {
        return response()->json(ServiceArea::all(), 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:service_areas,name',
        ]);

        $serviceArea = ServiceArea::create([
            'name' => $request->name,
        ]);

        return response()->json($serviceArea, 201);
    }

    public function show($id)
    {
        $serviceArea = ServiceArea::find($id);
        if (!$serviceArea) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json($serviceArea, 200);
    }

    public function update(Request $request, $id)
    {
        $serviceArea = ServiceArea::find($id);
        if (!$serviceArea) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate([
            'name' => 'required|string|unique:service_areas,name,' . $id,
        ]);

        $serviceArea->update([
            'name' => $request->name,
        ]);

        return response()->json($serviceArea, 200);
    }

    public function destroy($id)
    {
        $serviceArea = ServiceArea::find($id);
        if (!$serviceArea) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $serviceArea->delete();
        return response()->json(['message' => 'Deleted successfully'], 200);
    }
}
