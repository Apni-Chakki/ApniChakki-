<?php
// api to update driver location
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Only POST allowed"]);
        exit;
    }

    $data = json_decode(file_get_contents("php://input"), true);

    // getting required fields
    $order_id    = isset($data['order_id'])    ? intval($data['order_id'])    : 0;
    $driver_name = isset($data['driver_name']) ? trim($data['driver_name'])  : '';
    $latitude    = isset($data['latitude'])    ? floatval($data['latitude']) : null;
    $longitude   = isset($data['longitude'])   ? floatval($data['longitude']): null;

    if (!$order_id || !$driver_name || $latitude === null || $longitude === null) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Missing required fields: order_id, driver_name, latitude, longitude"
        ]);
        exit;
    }

    // optional fields
    $driver_phone = isset($data['driver_phone']) ? trim($data['driver_phone']) : null;
    $accuracy     = isset($data['accuracy'])     ? floatval($data['accuracy']) : 0;
    $speed        = isset($data['speed'])        ? floatval($data['speed'])    : null;
    $heading      = isset($data['heading'])      ? floatval($data['heading'])  : null;
    $status       = isset($data['status'])       ? trim($data['status'])       : 'in_transit';

    // checking valid status
    $allowed_statuses = ['started', 'in_transit', 'arrived', 'completed'];
    if (!in_array($status, $allowed_statuses)) {
        $status = 'in_transit';
    }

    $tracking_started_at = null;
    if ($status === 'started') {
        $tracking_started_at = date('Y-m-d H:i:s');
    }

    // inserting gps data
    $stmt = $conn->prepare(
        "INSERT INTO delivery_tracking 
         (order_id, driver_name, driver_phone, latitude, longitude, accuracy, speed, heading, status, tracking_started_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param(
        "issdddddss",
        $order_id,
        $driver_name,
        $driver_phone,
        $latitude,
        $longitude,
        $accuracy,
        $speed,
        $heading,
        $status,
        $tracking_started_at
    );

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Location updated",
            "tracking_id" => $stmt->insert_id
        ]);
    } else {
        throw new Exception("Execute failed: " . $stmt->error);
    }

} catch (Exception $e) {
    http_response_code(500);
    error_log("update_driver_location.php error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}
?>
