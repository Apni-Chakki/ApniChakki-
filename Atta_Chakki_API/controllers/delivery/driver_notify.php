<?php
// controller: driver 'I'm coming' notifications + location updates
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/connect.php';
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || !isset($data['order_id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "order_id required"]);
        exit;
    }

    $order_id = intval($data['order_id']);
    $driver_name = isset($data['driver_name']) ? $data['driver_name'] : null;
    $driver_phone = isset($data['driver_phone']) ? $data['driver_phone'] : null;
    $message = isset($data['message']) ? $data['message'] : null;
    $lat = isset($data['lat']) ? floatval($data['lat']) : null;
    $lng = isset($data['lng']) ? floatval($data['lng']) : null;

    // check if order exists
    $stmt = $conn->prepare("SELECT id FROM orders WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Order not found"]);
        exit;
    }
    $stmt->close();

    // check if this order contains any 'trip' items (pickup)
    $has_trip = false;
    $item_res = $conn->query("SELECT oi.id, p.unit FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = '$order_id'");
    while ($ir = $item_res->fetch_assoc()) {
        if (strtolower(trim($ir['unit'])) === 'trip') {
            $has_trip = true;
            break;
        }
    }

    // update driver info on order
    $upd = $conn->prepare("UPDATE orders SET driver_name = ?, driver_phone = ? WHERE id = ?");
    $upd->bind_param("ssi", $driver_name, $driver_phone, $order_id);
    $upd->execute();
    $upd->close();

    // ensure delivery_tracking table exists with expected schema (compatible with update_driver_location.php)
    $conn->query("CREATE TABLE IF NOT EXISTS delivery_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        driver_name VARCHAR(200) DEFAULT NULL,
        driver_phone VARCHAR(50) DEFAULT NULL,
        latitude DOUBLE DEFAULT NULL,
        longitude DOUBLE DEFAULT NULL,
        accuracy DOUBLE DEFAULT NULL,
        speed DOUBLE DEFAULT NULL,
        heading DOUBLE DEFAULT NULL,
        status VARCHAR(50) DEFAULT NULL,
        message TEXT DEFAULT NULL,
        tracking_started_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT current_timestamp()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Add message column if it doesn't exist (for existing tables)
    try {
        $conn->query("ALTER TABLE delivery_tracking ADD COLUMN message TEXT DEFAULT NULL");
    } catch (Exception $e) {
        // Ignore error if column already exists
    }

    if ($lat !== null || $lng !== null || $message) {
        $ins = $conn->prepare(
            "INSERT INTO delivery_tracking (order_id, driver_name, driver_phone, latitude, longitude, message) VALUES (?, ?, ?, ?, ?, ?)"
        );
        $ins->bind_param("issdds", $order_id, $driver_name, $driver_phone, $lat, $lng, $message);
        $ins->execute();
        $ins->close();
    }

    if ($has_trip) {
        // For pickup orders, instead of notifying customer, move order to admin queue awaiting weight
        $s = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $status = 'awaiting_weight';
        $s->bind_param("si", $status, $order_id);
        $s->execute();
        $s->close();

        echo json_encode(["success" => true, "message" => "Pickup order moved to admin for weight update"]);
        exit;
    } else {
        // For delivery orders, mark as out-for-delivery and (optionally) notify customer (placeholder)
        $s = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $status = 'out-for-delivery';
        $s->bind_param("si", $status, $order_id);
        $s->execute();
        $s->close();

        // TODO: integrate with SMS/push notification system to notify customer
        echo json_encode(["success" => true, "message" => "Driver is coming. Customer notified (placeholder)" ]);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
