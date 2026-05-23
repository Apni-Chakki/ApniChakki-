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
// URL me se base path nikal rahay hain (case-insensitive)
$base_path = '/atta_chakki_api/';
$pos = stripos($request_uri, $base_path);
if ($pos !== false) {
    $path = substr($request_uri, $pos + strlen($base_path));
} else {
    $path = $request_uri;
}
$path = explode('?', $path)[0];
$path = trim($path, '/');

if (empty($path)) {
    echo json_encode(["message" => "Welcome to Apni Chakki API MVC"]);
    exit;
}

// purani files ko redirect karne k liye mapping
$mapping = [
    'login.php' => 'controllers/auth/login.php',
    'google_login.php' => 'controllers/auth/google_login.php',
    'register.php' => 'controllers/auth/register.php',
    'update_user_profile.php' => 'controllers/users/update_user_profile.php',
    'admin_stats.php' => 'controllers/admin/admin_stats.php',
    'get_products.php' => 'controllers/products/get_products.php',
    'get_all_products.php' => 'controllers/products/get_all_products.php',
    'get_categories.php' => 'controllers/products/get_categories.php',
    'get_comments.php' => 'controllers/reviews/get_comments.php',
    'get_store_settings.php' => 'controllers/admin/get_store_settings.php',
    'update_store_settings.php' => 'controllers/admin/update_store_settings.php',
    'submit_contact.php' => 'controllers/admin/submit_contact.php',
    'admin_orders.php' => 'controllers/admin/admin_orders.php',
    'get_financial_analytics.php' => 'controllers/admin/get_financial_analytics.php',
    'get_contact_messages.php' => 'controllers/admin/get_contact_messages.php',
    'delete_contact_message.php' => 'controllers/admin/delete_contact_message.php',
    'reply_contact_message.php' => 'controllers/admin/reply_contact_message.php',
    'get_custom_mix_requests.php' => 'controllers/admin/get_custom_mix_requests.php',
    'update_custom_mix_request.php' => 'controllers/admin/update_custom_mix_request.php',
    'admin_create_order.php' => 'controllers/orders/admin_create_order.php',
    'place_order.php' => 'controllers/orders/place_order.php',
    'track_order.php' => 'controllers/orders/track_order.php',
    'get_user_orders.php' => 'controllers/orders/get_user_orders.php',
    'cancel_order.php' => 'controllers/orders/cancel_order.php',
    'add_product.php' => 'controllers/products/add_product.php',
    'delete_product.php' => 'controllers/products/delete_product.php',
    'update_product.php' => 'controllers/products/update_product.php',
];

if (isset($mapping[$path])) {
    require_once __DIR__ . '/' . $mapping[$path];
    exit;
}

// utils folder k liye alag se check
if (strpos($path, 'utils/') === 0) {
    $util_path = str_replace('utils/', '', $path);
    $target = __DIR__ . "/utils/$util_path";
    if (file_exists($target)) {
        require_once $target;
        exit;
    }
}

// domain folders me file dhund rahay hain
$domains = ['admin', 'auth', 'orders', 'delivery', 'products', 'reviews', 'expenses', 'inventory', 'payments', 'cart', 'users', 'coupons', 'dashboard'];

// Pehle check karo agar path me domain prefix hai (e.g. "products/upload_image.php")
foreach ($domains as $domain) {
    $prefix = $domain . '/';
    if (stripos($path, $prefix) === 0) {
        $sub_path = substr($path, strlen($prefix));
        $target = __DIR__ . "/controllers/$domain/$sub_path";
        if (file_exists($target)) {
            require_once $target;
            exit;
        }
    }
}

// Phir plain filename se match karo
foreach ($domains as $domain) {
    $target = __DIR__ . "/controllers/$domain/$path";
    if (file_exists($target)) {
        require_once $target;
        exit;
    }
}

// controllers k main folder me check
$root_target = __DIR__ . "/controllers/$path";
if (file_exists($root_target)) {
    require_once $root_target;
    exit;
}

// agar kahin nahi mili to puray folder me search kar rahay hain
$it = new RecursiveDirectoryIterator(__DIR__ . "/controllers");
foreach (new RecursiveIteratorIterator($it) as $file) {
    if ($file->getFilename() === $path) {
        require_once $file->getPathname();
        exit;
    }
}

// 404
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(["success" => false, "message" => "Endpoint not found: $path"]);
