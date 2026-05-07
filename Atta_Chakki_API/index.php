<?php
// sari requests yahan se guzar kar jati hain
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error_log.txt');
error_reporting(E_ALL);
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$request_uri = $_SERVER['REQUEST_URI'];
// URL me se faltu cheezain nikal rahay hain
$base_path = '/atta_chakki_api/';
$path = str_replace($base_path, '', $request_uri);
$path = explode('?', $path)[0];
$path = trim($path, '/');

if (empty($path)) {
    echo json_encode(["message" => "Welcome to Apni Chakki API MVC"]);
    exit;
}

// purani files ko redirect karne k liye mapping
$mapping = [
    'login.php' => 'api/Controllers/Auth/login.php',
    'register.php' => 'api/Controllers/Auth/register.php',
    'update_user_profile.php' => 'api/Controllers/Auth/update_user_profile.php',
    'admin_stats.php' => 'api/Controllers/Admin/admin_stats.php',
    'get_products.php' => 'api/Controllers/Products/get_products.php',
    'place_order.php' => 'api/Controllers/Orders/place_order.php',
    'track_order.php' => 'api/Controllers/Orders/track_order.php',
];

if (isset($mapping[$path])) {
    require_once __DIR__ . '/' . $mapping[$path];
    exit;
}

// utils folder k liye alag se check
if (strpos($path, 'utils/') === 0) {
    $util_path = str_replace('utils/', '', $path);
    $target = __DIR__ . "/api/Utils/$util_path";
    if (file_exists($target)) {
        require_once $target;
        exit;
    }
}

// domain folders me file dhund rahay hain
$domains = ['Admin', 'Auth', 'Orders', 'Delivery', 'Products', 'Reviews', 'Expenses', 'Inventory', 'Payments', 'Cart', 'Users'];
foreach ($domains as $domain) {
    $target = __DIR__ . "/api/Controllers/$domain/$path";
    if (file_exists($target)) {
        require_once $target;
        exit;
    }
}

// controllers k main folder me check
$root_target = __DIR__ . "/api/Controllers/$path";
if (file_exists($root_target)) {
    require_once $root_target;
    exit;
}

// agar kahin nahi mili to puray folder me search kar rahay hain
$it = new RecursiveDirectoryIterator(__DIR__ . "/api/Controllers");
foreach (new RecursiveIteratorIterator($it) as $file) {
    if ($file->getFilename() === $path) {
        require_once $file->getPathname();
        exit;
    }
}

// 404
header("HTTP/1.1 404 Not Found");
header('Content-Type: application/json');
echo json_encode(["success" => false, "message" => "Endpoint not found: $path"]);
