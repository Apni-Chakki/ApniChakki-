<?php
// api to get driver location
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Only GET allowed"]);
        exit;
    }

    $order_id = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;

    if ($order_id > 0) {
        // getting location for specific order
        $stmt = $conn->prepare(
            "SELECT dt.*, o.shipping_address, o.status as order_status, 
                    o.total_amount, u.full_name as customer_name, u.phone as customer_phone
             FROM delivery_tracking dt
             JOIN orders o ON o.id = dt.order_id
             JOIN users u ON u.id = o.user_id
             WHERE dt.order_id = ?
             ORDER BY dt.created_at DESC
             LIMIT 1"
        );
        $stmt->bind_param("i", $order_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $latest = $result->fetch_assoc();

        if (!$latest) {
            echo json_encode(["success" => false, "message" => "No tracking data for this order"]);
            exit;
        }

        // getting trail points for the map line
        $trail_stmt = $conn->prepare(
            "SELECT latitude, longitude, speed, heading, created_at 
             FROM delivery_tracking 
             WHERE order_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50"
        );
        $trail_stmt->bind_param("i", $order_id);
        $trail_stmt->execute();
        $trail_result = $trail_stmt->get_result();
        $trail = [];
        while ($row = $trail_result->fetch_assoc()) {
            $trail[] = $row;
        }

        echo json_encode([
            "success"  => true,
            "location" => $latest,
            "trail"    => array_reverse($trail)
        ]);

    } else {
        // getting all active drivers
        $sql = "SELECT dt1.*, o.shipping_address, o.status as order_status,
                       o.total_amount, u.full_name as customer_name, u.phone as customer_phone
                FROM delivery_tracking dt1
                INNER JOIN (
                    SELECT order_id, MAX(created_at) as max_time
                    FROM delivery_tracking
                    WHERE status IN ('started', 'in_transit')
                    GROUP BY order_id
                ) dt2 ON dt1.order_id = dt2.order_id AND dt1.created_at = dt2.max_time
                JOIN orders o ON o.id = dt1.order_id
                JOIN users u ON u.id = o.user_id
                WHERE o.status = 'out-for-delivery'
                ORDER BY dt1.created_at DESC";

        $result = $conn->query($sql);

        $drivers = [];
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $drivers[] = $row;
            }
        }

        echo json_encode([
            "success" => true,
            "drivers" => $drivers,
            "count"   => count($drivers)
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    error_log("get_driver_location.php error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}
?>
