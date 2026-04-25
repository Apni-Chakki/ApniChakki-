<?php
// get scheduling capacity info for today and tomorrow
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';
require_once __DIR__ . '/controllers/orders/order_scheduler.php';

header('Content-Type: application/json');

try {
    $today = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    
    $today_capacity = getCapacityInfo($conn, $today);
    $tomorrow_capacity = getCapacityInfo($conn, $tomorrow);
    $hours = getOperationalHours($conn);
    
    echo json_encode([
        "success" => true,
        "operational_hours" => $hours,
        "today" => $today_capacity,
        "tomorrow" => $tomorrow_capacity
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
