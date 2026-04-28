<?php
// get_yesterday_pending.php - Returns detailed pending orders from previous days
// Used by the EOD rollover flow to let admin select which orders are completed
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

try {
    $today = date('Y-m-d');
    
    // Find orders from previous days that are still pending/processing
    $sql = "SELECT o.id, o.status, o.assigned_date, o.total_weight_kg, 
                   o.processing_time_minutes, o.total_amount, o.created_at,
                   o.payment_method, o.shipping_address, o.user_id,
                   o.queue_position, o.estimated_completion_time
            FROM orders o
            WHERE TRIM(LOWER(o.status)) IN ('pending', 'processing')
            AND (
                (o.assigned_date IS NOT NULL AND o.assigned_date < ?)
                OR (o.assigned_date IS NULL AND DATE(o.created_at) < ?)
            )
            ORDER BY o.assigned_date ASC, o.queue_position ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $today, $today);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $orders = [];
    $totalWeight = 0;
    $totalMinutes = 0;
    
    while ($row = $result->fetch_assoc()) {
        // Get customer info
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
        
        // Get order items
        $order_id = $row['id'];
        $items = [];
        $item_res = $conn->query("SELECT quantity, product_id, price_at_purchase FROM order_items WHERE order_id = '$order_id'");
        while ($i = $item_res->fetch_assoc()) {
            $pid = $i['product_id'];
            $prod_res = $conn->query("SELECT name, unit FROM products WHERE id = '$pid'");
            if ($p = $prod_res->fetch_assoc()) {
                $i['name'] = $p['name'];
                $rawUnit = strtolower(trim($p['unit']));
                if ($rawUnit === 'trip' && floatval($i['price_at_purchase']) > 0) {
                    $i['unit'] = 'kg';
                } else {
                    $i['unit'] = $p['unit'];
                }
            } else {
                $i['name'] = "Item #$pid";
                $i['unit'] = 'kg';
            }
            $items[] = $i;
        }
        
        $row['items'] = $items;
        $totalWeight += floatval($row['total_weight_kg'] ?? 0);
        $totalMinutes += intval($row['processing_time_minutes'] ?? 0);
        $orders[] = $row;
    }
    $stmt->close();
    
    echo json_encode([
        "success" => true,
        "orders" => $orders,
        "count" => count($orders),
        "total_weight_kg" => round($totalWeight, 1),
        "total_minutes" => $totalMinutes
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
