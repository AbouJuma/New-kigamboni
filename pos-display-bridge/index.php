<?php
/**
 * Main entry point - handles all requests
 */

// Log all requests for debugging
$debugLog = __DIR__ . '/debug.log';
$requestInfo = [
    'time' => date('Y-m-d H:i:s'),
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
    'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
];
file_put_contents($debugLog, json_encode($requestInfo) . "\n", FILE_APPEND);

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

function acquireLock($lockFile, $timeout = 5) {
    $startTime = time();
    while (file_exists($lockFile) && (time() - $startTime) < $timeout) {
        usleep(100000);
    }
    return !file_exists($lockFile) && touch($lockFile);
}

function releaseLock($lockFile) {
    if (file_exists($lockFile)) {
        unlink($lockFile);
    }
}

function logRequest($data) {
    $logFile = __DIR__ . '/display.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] " . json_encode($data) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

function getCurrentDisplayData($displayFile) {
    if (file_exists($displayFile)) {
        $json = file_get_contents($displayFile);
        return json_decode($json, true) ?: [];
    }
    return [];
}

function saveDisplayData($displayFile, $data) {
    $data['timestamp'] = time();
    $data['server_time'] = date('Y-m-d H:i:s');
    $json = json_encode($data);
    return file_put_contents($displayFile, $json, LOCK_EX) !== false;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
            exit();
        }
        
        if (!isset($data['action'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Action required']);
            exit();
        }
        
        if (!acquireLock($lockFile)) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => 'Service busy']);
            exit();
        }
        
        try {
            $currentData = getCurrentDisplayData($displayFile);
            $newData = array_merge($currentData, $data);
            
            if (saveDisplayData($displayFile, $newData)) {
                logRequest($data);
                echo json_encode([
                    'success' => true,
                    'message' => 'Display data updated',
                    'data' => $newData
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Save failed']);
            }
        } finally {
            releaseLock($lockFile);
        }
    } else {
        // GET request - return status
        $data = getCurrentDisplayData($displayFile);
        echo json_encode([
            'success' => true,
            'data' => $data,
            'server_info' => [
                'php_version' => PHP_VERSION,
                'server_time' => date('Y-m-d H:i:s'),
                'method' => $_SERVER['REQUEST_METHOD'],
                'uri' => $_SERVER['REQUEST_URI']
            ]
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
