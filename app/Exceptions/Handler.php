<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Log;

class Handler extends ExceptionHandler
{
    public function render($request, Throwable $e)
    {
        if ($e instanceof \App\Exceptions\BusinessLogicException) {
            return response()->json([
                'status' => false,
                'message' => $e->getMessage(),
            ], 400);
        }

        if ($e instanceof ModelNotFoundException) {
            return response()->json([
                'status' => false,
                'message' => 'Resource not found.',
            ], 404);
        }

        if ($e instanceof ValidationException) {
            return response()->json([
                'status' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        }

        // Log unexpected errors
        Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);

        return response()->json([
            'status' => false,
            'message' => 'Unexpected error occurred.',
        ], 500);
    }
}
