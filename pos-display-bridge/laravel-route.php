<?php
/**
 * Laravel-compatible display bridge
 * Place this in your Laravel routes/web.php or create a controller
 */

// Add this to routes/web.php:
Route::prefix('pos-display-bridge')->group(function () {
    Route::post('/display', [DisplayBridgeController::class, 'handleDisplay']);
    Route::get('/display', [DisplayBridgeController::class, 'getStatus']);
    Route::get('/', [DisplayBridgeController::class, 'getStatus']);
});

// Or create this controller at app/Http/Controllers/DisplayBridgeController.php:

/*
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DisplayBridgeController extends Controller
{
    private $displayFile;
    private $lockFile;
    private $logFile;

    public function __construct()
    {
        $this->displayFile = storage_path('app/display_data.json');
        $this->lockFile = storage_path('app/display.lock');
        $this->logFile = storage_path('logs/display.log');
    }

    public function handleDisplay(Request $request)
    {
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');

        if ($request->method() === 'OPTIONS') {
            return response('', 200);
        }

        try {
            $data = $request->all();
            
            if (!isset($data['action'])) {
                return response()->json([
                    'success' => false,
                    'error' => 'Action is required'
                ], 400);
            }

            // Acquire lock
            $timeout = 5;
            $startTime = time();
            while (file_exists($this->lockFile) && (time() - $startTime) < $timeout) {
                usleep(100000);
            }
            
            if (!file_exists($this->lockFile)) {
                touch($this->lockFile);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Service busy, please try again'
                ], 503);
            }

            try {
                // Get current data
                $currentData = [];
                if (file_exists($this->displayFile)) {
                    $json = file_get_contents($this->displayFile);
                    $currentData = json_decode($json, true) ?: [];
                }
                
                // Update with new data
                $newData = array_merge($currentData, $data);
                $newData['timestamp'] = time();
                $newData['server_time'] = date('Y-m-d H:i:s');
                
                // Save updated data
                $json = json_encode($newData);
                file_put_contents($this->displayFile, $json, LOCK_EX);
                
                // Log the request
                $logEntry = "[" . date('Y-m-d H:i:s') . "] " . json_encode($data) . "\n";
                file_put_contents($this->logFile, $logEntry, FILE_APPEND | LOCK_EX);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Display data updated',
                    'data' => $newData
                ]);
                
            } finally {
                // Always release lock
                if (file_exists($this->lockFile)) {
                    unlink($this->lockFile);
                }
            }
            
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStatus()
    {
        $data = [];
        if (file_exists($this->displayFile)) {
            $json = file_get_contents($this->displayFile);
            $data = json_decode($json, true) ?: [];
        }
        
        return response()->json([
            'success' => true,
            'data' => $data,
            'server_info' => [
                'php_version' => PHP_VERSION,
                'server_time' => date('Y-m-d H:i:s'),
                'file_exists' => file_exists($this->displayFile),
                'laravel_version' => app()->version()
            ]
        ]);
    }
}

*/

?>
