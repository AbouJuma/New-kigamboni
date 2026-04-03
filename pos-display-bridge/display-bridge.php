<?php
/**
 * PHP Display Bridge - Works with local Node.js service
 * Receives display requests from POS and writes to JSON file
 * Local Node.js service reads this file and updates customer display
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Display data file path
$displayFile = __DIR__ . '/display_data.json';
$lockFile = __DIR__ . '/display.lock';

/**
 * Acquire file lock to prevent concurrent writes
 */
function acquireLock($lockFile, $timeout = 5) {
    $startTime = time();
    while (file_exists($lockFile) && (time() - $startTime) < $timeout) {
        usleep(100000); // Sleep 100ms
    }
    
    if (!file_exists($lockFile)) {
        return touch($lockFile);
    }
    return false;
}

/**
 * Release file lock
 */
function releaseLock($lockFile) {
    if (file_exists($lockFile)) {
        unlink($lockFile);
    }
}

/**
 * Log display requests for debugging
 */
function logRequest($data) {
    $logFile = __DIR__ . '/display.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] " . json_encode($data) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

/**
 * Get current display data
 */
function getCurrentDisplayData($displayFile) {
    if (file_exists($displayFile)) {
        $json = file_get_contents($displayFile);
        return json_decode($json, true) ?: [];
    }
    return [];
}

/**
 * Save display data with timestamp
 */
function saveDisplayData($displayFile, $data) {
    $data['timestamp'] = time();
    $data['server_time'] = date('Y-m-d H:i:s');
    $json = json_encode($data);
    
    $result = file_put_contents($displayFile, $json, LOCK_EX);
    return $result !== false;
}

// Main request handling
try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get POST data
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid JSON data'
            ]);
            exit();
        }
        
        // Validate required fields
        if (!isset($data['action'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Action is required'
            ]);
            exit();
        }
        
        // Acquire lock
        if (!acquireLock($lockFile)) {
            http_response_code(503);
            echo json_encode([
                'success' => false,
                'error' => 'Service busy, please try again'
            ]);
            exit();
        }
        
        try {
            // Get current data
            $currentData = getCurrentDisplayData($displayFile);
            
            // Update with new data
            $newData = array_merge($currentData, $data);
            
            // Save updated data
            if (saveDisplayData($displayFile, $newData)) {
                // Log the request
                logRequest($data);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Display data updated',
                    'data' => $newData
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to save display data'
                ]);
            }
        } finally {
            // Always release lock
            releaseLock($lockFile);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Return current display data
        $data = getCurrentDisplayData($displayFile);
        
        echo json_encode([
            'success' => true,
            'data' => $data,
            'server_info' => [
                'php_version' => PHP_VERSION,
                'server_time' => date('Y-m-d H:i:s'),
                'file_exists' => file_exists($displayFile),
                'file_writable' => is_writable(__DIR__)
            ]
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
