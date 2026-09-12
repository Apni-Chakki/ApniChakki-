<?php
// get store settings with pre-connect caching
require_once __DIR__ . '/../../utils/cache_helper.php';

header('Content-Type: application/json');
header('Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600');

$cache_key = 'store_settings';
$cached = get_api_cache($cache_key, 300);
if ($cached !== false) {
    http_response_code(200);
    echo $cached;
    exit;
}

require_once __DIR__ . '/../../config/connect.php';

try {
    $sql = "SELECT setting_key, setting_value FROM store_settings";
    $result = @$conn->query($sql);
    
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

    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
    }
    
    $response_data = json_encode([
        "success" => true,
        "settings" => $settings
    ]);

    set_api_cache($cache_key, $response_data);
    
    echo $response_data;
    
} catch (Exception $e) {
    echo json_encode([
        "success" => true,
        "settings" => [
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
        ]
    ]);
}
?>
