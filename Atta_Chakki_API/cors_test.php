<?php
/**
 * CORS Test File
 * Open in browser: http://localhost/atta_chakki_api/cors_test.php
 */

require_once __DIR__ . '/config/cors.php';

// Get headers that were sent
$headers_list = headers_list();

echo json_encode([
    'status' => 'OK',
    'message' => 'CORS Headers are being sent correctly',
    'headers_sent' => $headers_list,
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT);