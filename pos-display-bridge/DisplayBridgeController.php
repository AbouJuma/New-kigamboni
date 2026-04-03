<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class DisplayBridgeController extends Controller
{
    private $displayFile;
    private $lockFile;
    private $logFile;

    public function __construct()
    {
        $this->displayFile = storage_path('app/display_data.json');
        $this->lockFile = storage_path('app/display.lock');
        $this->logFile = storage_path('logs/display_bridge.log');
    }

    /**
     * Handle display updates from POS
     */
    public function updateDisplay(Request $request): JsonResponse
    {
        try {
            $data = $request->all();
            
            if (!isset($data['action'])) {
                return response()->json([
                    'success' => false,
                    'error' => 'Action is required'
                ], 400);
            }

            // Validate action
            $validActions = ['total', 'item', 'clear'];
            if (!in_array($data['action'], $validActions)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid action. Use: ' . implode(', ', $validActions)
                ], 400);
            }

            // Acquire lock with timeout
            if (!$this->acquireLock()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Service busy, please try again'
                ], 503);
            }

            try {
                // Get current data
                $currentData = $this->getCurrentData();
                
                // Merge with new data
                $newData = array_merge($currentData, $data);
                $newData['timestamp'] = time();
                $newData['server_time'] = now()->toDateTimeString();
                $newData['updated_at'] = now()->toIso8601String();

                // Save to file
                $saved = $this->saveData($newData);
                
                if ($saved) {
                    $this->logRequest($data);
                    
                    return response()->json([
                        'success' => true,
                        'message' => 'Display data updated successfully',
                        'data' => $newData,
                        'action' => $data['action']
                    ]);
                } else {
                    return response()->json([
                        'success' => false,
                        'error' => 'Failed to save display data'
                    ], 500);
                }
            } finally {
                $this->releaseLock();
            }

        } catch (\Exception $e) {
            \Log::error('Display bridge error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current display status
     */
    public function getStatus(): JsonResponse
    {
        try {
            $data = $this->getCurrentData();
            
            return response()->json([
                'success' => true,
                'data' => $data,
                'server_info' => [
                    'php_version' => PHP_VERSION,
                    'server_time' => now()->toDateTimeString(),
                    'laravel_version' => app()->version(),
                    'storage_path' => storage_path('app'),
                    'file_exists' => file_exists($this->displayFile),
                    'file_writable' => is_writable(storage_path('app'))
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear display data
     */
    public function clearDisplay(): JsonResponse
    {
        try {
            if ($this->acquireLock()) {
                try {
                    $this->saveData(['action' => 'clear', 'cleared_at' => now()->toDateTimeString()]);
                    return response()->json([
                        'success' => true,
                        'message' => 'Display cleared'
                    ]);
                } finally {
                    $this->releaseLock();
                }
            }
            
            return response()->json([
                'success' => false,
                'error' => 'Could not acquire lock'
            ], 503);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Log display requests
     */
    private function logRequest(array $data): void
    {
        try {
            $timestamp = now()->toDateTimeString();
            $logEntry = "[$timestamp] " . json_encode($data) . "\n";
            file_put_contents($this->logFile, $logEntry, FILE_APPEND | LOCK_EX);
        } catch (\Exception $e) {
            \Log::warning('Failed to write to display log: ' . $e->getMessage());
        }
    }

    /**
     * Get current display data
     */
    private function getCurrentData(): array
    {
        if (file_exists($this->displayFile)) {
            $content = file_get_contents($this->displayFile);
            return json_decode($content, true) ?: [];
        }
        return [];
    }

    /**
     * Save display data
     */
    private function saveData(array $data): bool
    {
        $json = json_encode($data, JSON_PRETTY_PRINT);
        return file_put_contents($this->displayFile, $json, LOCK_EX) !== false;
    }

    /**
     * Acquire file lock
     */
    private function acquireLock(int $timeout = 5): bool
    {
        $startTime = time();
        
        while (file_exists($this->lockFile)) {
            if ((time() - $startTime) >= $timeout) {
                return false;
            }
            usleep(100000); // 100ms
        }
        
        return touch($this->lockFile);
    }

    /**
     * Release file lock
     */
    private function releaseLock(): void
    {
        if (file_exists($this->lockFile)) {
            unlink($this->lockFile);
        }
    }
}
