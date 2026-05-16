<?php
// Simple test file to verify upload endpoint works

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

echo json_encode([
    'status' => 'OK',
    'message' => 'Upload endpoint is reachable',
    'method' => $_SERVER['REQUEST_METHOD'],
    'files' => array_keys($_FILES),
    'post' => array_keys($_POST),
    'timestamp' => date('Y-m-d H:i:s')
]);
