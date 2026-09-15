<?php
// Main API router
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

// Refactor Phase 1: autoloader for AttaChakki\Core, \Repositories, \Services classes.
// Safe no-op for controllers that don't use those classes yet.
require_once __DIR__ . '/core/autoload.php';

$allowed_origins = [
    'https://suchi-chakki.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLocalOrigin = (
    in_array($origin, $allowed_origins) ||
    preg_match('/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?$/i', $origin)
);

if ($isLocalOrigin && !empty($origin)) {
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
// url se base path nikal rahe
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
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    if (!empty($action)) {
        $path = trim($action);
    } else {
        echo json_encode(["message" => "Welcome to Suchi Chakki API MVC"]);
        exit;
    }
}

if (substr($path, -4) !== '.php' && !str_contains($path, '/')) {
    $path .= '.php';
}

// core endpoints ka mapping
$mapping = [
    'login.php' => 'controllers/auth/login.php',
    'google_login.php' => 'controllers/auth/google_login.php',
    'register.php' => 'controllers/auth/register.php',
    'forgot_password.php' => 'controllers/auth/forgot_password.php',
    'reset_password.php' => 'controllers/auth/reset_password.php',
    'update_user_profile.php' => 'controllers/users/update_user_profile.php',
    'admin_stats.php' => 'controllers/dashboard/admin_stats.php',
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
    'update_order_status.php' => 'controllers/orders/update_order_status.php',
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
    'update_product_status.php' => 'controllers/products/update_product_status.php',
    'update_category_status.php' => 'controllers/products/update_category_status.php',
    'update_inventory.php' => 'controllers/inventory/update_inventory.php',
    'toggle_driver_status.php' => 'controllers/delivery/toggle_driver_status.php',
    'get_udhaar_ledger.php' => 'controllers/payments/get_udhaar_ledger.php',
    'record_udhaar_payment.php' => 'controllers/payments/record_udhaar_payment.php',
    'get_driver_cash_settlement.php' => 'controllers/payments/get_driver_cash_settlement.php',
    'get_driver_settlements.php' => 'controllers/payments/get_driver_cash_settlement.php',
    'record_driver_settlement.php' => 'controllers/payments/record_driver_settlement.php',
    'get_rental_history.php' => 'controllers/rentals/get_rental_history.php',
    'get_scheduled_orders.php' => 'controllers/orders/get_scheduled_orders.php',
    'get_tomorrows_orders.php' => 'controllers/orders/get_scheduled_orders.php',
    'get_processing_orders.php' => 'controllers/orders/get_processing_orders.php',
    'get_schedule_capacity.php' => 'controllers/orders/get_schedule_capacity.php',
    'assign_driver.php' => 'controllers/orders/assign_driver.php',
    'manage_delivery.php' => 'controllers/delivery/manage_delivery.php',
    'override_order_schedule.php' => 'controllers/orders/override_order_schedule.php',
    'split_order_batch.php' => 'controllers/orders/split_order_batch.php',
];

if (isset($mapping[$path])) {
    require_once __DIR__ . '/' . $mapping[$path];
    exit;
}

// agar utils ka call ho
if (strpos($path, 'utils/') === 0) {
    $util_path = str_replace('utils/', '', $path);
    $target = __DIR__ . "/utils/$util_path";
    if (file_exists($target)) {
        require_once $target;
        exit;
    }
}

// controllers check kar rahe domain k hisab se
$domains = ['admin', 'auth', 'orders', 'delivery', 'products', 'reviews', 'expenses', 'inventory', 'payments', 'cart', 'users', 'coupons', 'dashboard', 'rentals'];

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

// direct domain me check
foreach ($domains as $domain) {
    $target = __DIR__ . "/controllers/$domain/$path";
    if (file_exists($target)) {
        require_once $target;
        exit;
    }
}

// root controllers folder check
$root_target = __DIR__ . "/controllers/$path";
if (file_exists($root_target)) {
    require_once $root_target;
    exit;
}

// controllers subfolders me search
$it = new RecursiveDirectoryIterator(__DIR__ . "/controllers");
foreach (new RecursiveIteratorIterator($it) as $file) {
    if ($file->getFilename() === $path) {
        require_once $file->getPathname();
        exit;
    }
}

// route na mile tou 404
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(["success" => false, "message" => "Endpoint not found: $path"]);
