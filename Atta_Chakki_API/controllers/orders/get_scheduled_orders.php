<?php
// get tomorrow's scheduled orders with scheduling info
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/order_scheduler.php';

header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    
    // get orders scheduled for tomorrow
    $sql = "SELECT * FROM orders 
            WHERE (
                (assigned_date >= ?)
                AND TRIM(LOWER(status)) IN ('pending', 'processing')
            )
            ORDER BY queue_position ASC, created_at ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $tomorrow);
    $stmt->execute();
    $result = $stmt->get_result();
    $orders = [];

    while($row = $result->fetch_assoc()) {
        $user_id = $row['user_id'];
        if ($user_id > 0) {
            $user_res = $conn->query("SELECT full_name, phone FROM users WHERE id = '$user_id'");
            if ($user_row = $user_res->fetch_assoc()) {
                $row['customer_name'] = $user_row['full_name'];
                $row['customer_phone'] = $user_row['phone'];
            } else {
                $row['customer_name'] = "Unknown Customer";
                $row['customer_phone'] = "No Phone";
            }
        } else {
            $row['customer_name'] = "Unknown Customer";
            $row['customer_phone'] = "Unknown";
        }

        $order_id = $row['id'];
        $items = [];
        $has_trip_item = false;
        $item_res = $conn->query("SELECT quantity, product_id, price_at_purchase FROM order_items WHERE order_id = '$order_id'");
        while($i = $item_res->fetch_assoc()) {
             $pid = $i['product_id'];
             $prod_res = $conn->query("SELECT name, unit FROM products WHERE id = '$pid'");
             if ($p = $prod_res->fetch_assoc()) {
                 $i['name'] = $p['name'];
                 $i['unit'] = $p['unit'];
                 if (strtolower(trim($p['unit'])) === 'trip') {
                     $has_trip_item = true;
                 }
             } else {
                 $i['name'] = "Item #$pid";
                 $i['unit'] = 'kg';
             }
             $items[] = $i;
        }

        // include trip/pickup orders as well so pickups scheduled appear on Tomorrow's/Today's lists

        $row['items'] = $items;
        $row['total'] = $row['total_amount'];
        $orders[] = $row;
    }
    $stmt->close();
    
    // get capacity info for tomorrow
    $capacity = getCapacityInfo($conn, $tomorrow);

    echo json_encode([
        "success" => true, 
        "orders" => $orders,
        "capacity" => $capacity
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
