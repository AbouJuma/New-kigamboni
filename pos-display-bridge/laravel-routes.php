<?php

/**
 * LARAVEL ROUTES SETUP INSTRUCTIONS
 * 
 * Add these routes to your Laravel application's routes/web.php file:
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DisplayBridgeController;

// Display Bridge Routes - Add these to routes/web.php
Route::prefix('pos-display-bridge')->group(function () {
    
    // Main endpoint - POST to update display, GET to check status
    Route::match(['get', 'post'], '/', [DisplayBridgeController::class, 'getStatus'])
        ->name('display-bridge.status');
    
    // Alternative endpoints
    Route::post('/display', [DisplayBridgeController::class, 'updateDisplay'])
        ->name('display-bridge.update');
    
    Route::get('/status', [DisplayBridgeController::class, 'getStatus'])
        ->name('display-bridge.status-get');
    
    Route::post('/clear', [DisplayBridgeController::class, 'clearDisplay'])
        ->name('display-bridge.clear');
});

/*
 * ============================================================================
 * ALTERNATIVE: If you want API routes instead (routes/api.php):
 * ============================================================================
 
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DisplayBridgeController;

Route::prefix('display-bridge')->group(function () {
    Route::get('/', [DisplayBridgeController::class, 'getStatus']);
    Route::post('/display', [DisplayBridgeController::class, 'updateDisplay']);
    Route::post('/clear', [DisplayBridgeController::class, 'clearDisplay']);
});

 * Then access via: /api/display-bridge
 */

?>
