<?php
// Main Front Controller and API Router - GZIP High Speed Enabled
if (!ob_start("ob_gzhandler")) ob_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error_log.txt');
error_reporting(E_ALL);

set_exception_handler(function ($e) {
    error_log("Uncaught Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine() . "\nStack trace:\n" . $e->getTraceAsString());
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code(500);
    }
    echo json_encode([
        "success" => false,
        "message" => "Server error occurred.",
        "error" => $e->getMessage(),
        "file" => $e->getFile(),
        "line" => $e->getLine()
    ]);
    exit;
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        error_log("Fatal Error: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line']);
        if (!headers_sent()) {
            header('Content-Type: application/json');
            http_response_code(500);
        }
        echo json_encode([
            "success" => false,
            "message" => "Fatal server error occurred.",
            "error" => $error['message']
        ]);
    }
});

$allowed_origins = [
    'https://suchi-chakki.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$request_uri = $_SERVER['REQUEST_URI'];
// Extract base API route path
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
    echo json_encode(["message" => "Welcome to Suchi Chakki API MVC"]);
    exit;
}

// Route mapping for core endpoints
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
    'submit_custom_mix_request.php' => 'controllers/products/submit_custom_mix_request.php',
    'admin_create_order.php' => 'controllers/orders/admin_create_order.php',
    'place_order.php' => 'controllers/orders/place_order.php',
    'track_order.php' => 'controllers/orders/track_order.php',
    'get_user_orders.php' => 'controllers/orders/get_user_orders.php',
    'cancel_order.php' => 'controllers/orders/cancel_order.php',
    'get_customers.php' => 'controllers/users/get_customers.php',
    'toggle_customer_status.php' => 'controllers/users/toggle_customer_status.php',
    'promote_to_vip.php' => 'controllers/users/promote_to_vip.php',
    'get_vip_privileges.php' => 'controllers/users/get_vip_privileges.php',
    'manage_vip_privilege.php' => 'controllers/users/manage_vip_privilege.php',
    'add_product.php' => 'controllers/products/add_product.php',
    'delete_product.php' => 'controllers/products/delete_product.php',
    'update_product.php' => 'controllers/products/update_product.php',
    'change_password.php' => 'controllers/users/change_password.php',
];

if (isset($mapping[$path])) {
    require_once __DIR__ . '/' . $mapping[$path];
    exit;
}

// Utility route handling
if (strpos($path, 'utils/') === 0) {
    $util_path = str_replace('utils/', '', $path);
    $target = __DIR__ . "/utils/$util_path";
    if (file_exists($target)) {
        require_once $target;
        exit;
    }
}

// Domain controller resolution
$domains = ['admin', 'auth', 'orders', 'delivery', 'products', 'reviews', 'expenses', 'inventory', 'payments', 'cart', 'users', 'coupons', 'dashboard'];

// Check for explicit domain prefix in route
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

// Fallback to domain search
foreach ($domains as $domain) {
    $target = __DIR__ . "/controllers/$domain/$path";
    if (file_exists($target)) {
        require_once $target;
        exit;
    }
}

// Check root controllers directory
$root_target = __DIR__ . "/controllers/$path";
if (file_exists($root_target)) {
    require_once $root_target;
    exit;
}

// Recursive search for unmapped controller files
$it = new RecursiveDirectoryIterator(__DIR__ . "/controllers");
foreach (new RecursiveIteratorIterator($it) as $file) {
    if ($file->getFilename() === $path) {
        require_once $file->getPathname();
        exit;
    }
}

// 404 Route Not Found
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(["success" => false, "message" => "Endpoint not found: $path"]);
