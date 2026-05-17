<?php
// Test Cloudinary connectivity
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

$cloudName = 'dy4k5rbuf';
$url = 'https://api.cloudinary.com/v1_1/' . $cloudName . '/image/upload';

echo json_encode([
    'test' => 'Cloudinary connection test',
    'url' => $url,
    'timestamp' => date('Y-m-d H:i:s')
]);

// Try a simple curl test
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => ['test' => 'value'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 5,
    CURLOPT_CONNECTTIMEOUT => 5
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo json_encode([
    'curl_test' => [
        'http_code' => $httpCode,
        'error' => $error,
        'response_first_100' => substr($response, 0, 100)
    ]
]);
?>
