<?php
// get store settings
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $sql = "SELECT setting_key, setting_value FROM store_settings";
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Database query failed");
    }
    
    // default settings
    $settings = [
        "storeName" => "Apni Chakki",
        "phone" => "+92 300 1234567",
        "email" => "info@example.com",
        "address" => "Lahore, Pakistan",
        "openingTime" => "08:00",
        "closingTime" => "20:00",
        "deliveryAreas" => "Surrounding areas",
        "deliveryCharge" => "50",
        "minOrderForFreeDelivery" => "500",
        "announcement" => ""
    ];
    
    // overriding with db values (accept any key from db)
    while ($row = $result->fetch_assoc()) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    
    echo json_encode([
        "success" => true,
        "settings" => $settings
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error fetching settings: " . $e->getMessage()
    ]);
}
