<?php
// cors setup
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../error_log.txt');

// Allowed origins list — add karo jitni chahiye
$allowed_origins = [
    'https://suchi-chakki.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    // Specific origin set karo (wildcard * credentials ke saath kaam nahi karta)
    header("Access-Control-Allow-Origin: $origin", true);
    header('Access-Control-Allow-Credentials: true', true);
} else {
    // Unknown origin — bina credentials ke allow karo
    header('Access-Control-Allow-Origin: *', true);
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With', true);
header('Access-Control-Max-Age: 86400', true);

// handling preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit('OK');
}
?>
