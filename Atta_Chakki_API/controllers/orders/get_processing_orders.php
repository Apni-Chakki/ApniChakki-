<?php
// get today's processing orders with scheduling info
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/order_scheduler.php';

header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $today = date('Y-m-d');
    
    // get orders that are processing/pending for today (by assigned_date or by status for backward compat)
    $sql = "SELECT * FROM orders 
            WHERE (
                (assigned_date IS NULL OR assigned_date = '' OR assigned_date <= ?)
                AND TRIM(LOWER(status)) IN ('pending', 'processing')
            )
            ORDER BY queue_position ASC, created_at ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $today);
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
                 $rawUnit = strtolower(trim($p['unit']));
                 // Agar unit 'trip' tha lekin weight confirm ho gayi (price_at_purchase > 0) to 'kg' dikhao
                 if ($rawUnit === 'trip' && floatval($i['price_at_purchase']) > 0) {
                     $i['unit'] = 'kg';
                 } else {
                     $i['unit'] = $p['unit'];
                 }
                 if ($rawUnit === 'trip') {
                     $has_trip_item = true;
                 }
             } else {
                 $i['name'] = "Item #$pid";
                 $i['unit'] = 'kg';
             }
             $items[] = $i;
        }
        
        // If this is a pickup (trip) order, only include it in processing list when
        // it has been moved to admin (awaiting weight) or already scheduled/pending/processing
        if ($has_trip_item) {
            $st = strtolower(trim($row['status']));
            if (!in_array($st, ['awaiting_weight','pending','processing'])) {
                continue; // skip pickup requests that are still in initial pickup state
            }
        }
        
        $row['items'] = $items;
        $row['total'] = $row['total_amount'];
        $orders[] = $row;
    }
    $stmt->close();
    
    // get capacity info for today
    $capacity = getCapacityInfo($conn, $today);

    echo json_encode([
        "success" => true, 
        "orders" => $orders,
        "capacity" => $capacity
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
