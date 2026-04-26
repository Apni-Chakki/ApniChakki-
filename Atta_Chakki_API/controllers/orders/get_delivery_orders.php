<?php
// get delivery orders for a specific driver
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if (!isset($_GET['driver_phone'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Driver phone is required"]);
    exit;
}

$driver_phone = $_GET['driver_phone'];

// Only fetch orders explicitly assigned to this driver by their phone number.
// No OR fallback — that was causing all unassigned 'ready' orders to leak to every driver.
$sql = "SELECT o.*, u.full_name as customer_name, u.phone as customer_phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.driver_phone = ?
        AND o.status IN ('out-for-delivery', 'pickup_assigned', 'coming_for_pickup', 'arrived_at_shop', 'ready')
        ORDER BY 
            CASE o.status
                WHEN 'out-for-delivery' THEN 1
                WHEN 'coming_for_pickup' THEN 2
                WHEN 'arrived_at_shop' THEN 3
                WHEN 'ready' THEN 4
                WHEN 'pickup_assigned' THEN 5
                ELSE 6
            END ASC,
            o.created_at ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $driver_phone);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];
while ($row = $result->fetch_assoc()) {
    $orders[] = $row;
}

$stmt->close();

echo json_encode([
    "success" => true,
    "orders" => $orders
]);
