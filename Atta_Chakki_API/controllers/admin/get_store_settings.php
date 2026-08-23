<?php
// get store settings
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cache_helper.php';

header('Content-Type: application/json');
header('Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600');

try {
    $cache_key = 'store_settings';
    $cached = get_api_cache($cache_key, 600);
    if ($cached !== false) {
        http_response_code(200);
        echo $cached;
        exit;
    }

    $sql = "SELECT setting_key, setting_value FROM store_settings";
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Database query failed");
    }
    
    // default settings
    $settings = [
        "storeName" => "Suchi Chakki",
        "logo" => "",
        "phone" => "+92 3228483029",
        "email" => "suchichakki@gmail.com",
        "address" => "Thokar Niaz Baig, Near Canal Road, Lahore, Pakistan",
        "openingTime" => "08:00",
        "closingTime" => "20:00",
        "deliveryAreas" => "Surrounding areas",
        "deliveryCharge" => "50",
        "minOrderForFreeDelivery" => "500",
        "announcement" => ""
    ];
    
    while ($row = $result->fetch_assoc()) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    $response_data = json_encode([
        "success" => true,
        "settings" => $settings
    ]);

    set_api_cache($cache_key, $response_data);
    
    echo $response_data;
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error fetching settings: " . $e->getMessage()
    ]);
}
