<?php
// Simple test to send data to display bridge

$url = 'https://client.ecofieldgroup.com/delight/display-bridge.php';

$data = [
    'type' => 'total',
    'total' => 1500.00,
    'timestamp' => date('c')
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo "Sent: " . json_encode($data) . "<br>";
echo "Response: " . $response;
