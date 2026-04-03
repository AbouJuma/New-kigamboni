<?php
/**
 * Customer Display Bridge - Standalone Version
 * Place this in public_html/delight/ folder
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dataFile = __DIR__ . '/storage/app/display_data.json';
$lockFile = __DIR__ . '/storage/app/display.lock';

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

function getData($file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        return json_decode($content, true) ?: [];
    }
    return [];
}

function saveData($file, $data) {
    $data['updated_at'] = date('Y-m-d H:i:s');
    return file_put_contents($file, json_encode($data), LOCK_EX) !== false;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
            exit;
        }
        
        // Ensure storage directory exists
        $dir = dirname($dataFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        if (!acquireLock($lockFile)) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => 'Service busy']);
            exit;
        }
        
        try {
            $current = getData($dataFile);
            $newData = array_merge($current, $data);
            
            if (saveData($dataFile, $newData)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Updated',
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
        // GET request
        $data = getData($dataFile);
        echo json_encode([
            'success' => true,
            'data' => $data,
            'server_time' => date('Y-m-d H:i:s')
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
