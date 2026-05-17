<?php
// get_schedule_capacity.php - dukan ki capacity check kar rahe han yahan
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';
require_once __DIR__ . '/../Orders/order_scheduler.php';

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



