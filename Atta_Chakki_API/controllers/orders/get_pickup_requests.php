<?php
// get pickup requests (orders containing 'Trip' unit)
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
        // get orders that have at least one item with product.unit = 'trip'
        // and are in pickup-related statuses so admin Pickup Requests show them
        $sql = "SELECT DISTINCT o.* FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE (TRIM(LOWER(o.status)) IN ('pickup_pending', 'arrived_at_shop'))
                   OR (
                       TRIM(LOWER(o.status)) IN ('pending','pickup_assigned','coming_for_pickup','arrived_at_shop')
                       AND LOWER(TRIM(p.unit)) = 'trip'
                   )
                ORDER BY o.created_at DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
    $orders = [];

    while($row = $result->fetch_assoc()) {
        $order_id = $row['id'];
        $items = [];
        $has_trip_item = false;
        
        $item_res = $conn->query("SELECT id, quantity, product_id, price_at_purchase FROM order_items WHERE order_id = '$order_id'");
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
        
        // ONLY include if it has a trip item or if the order is explicitly a pickup request
        if (!$has_trip_item && !in_array(trim(strtolower($row['status'])), ['pickup_pending', 'arrived_at_shop'])) {
            continue;
        }

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

        $row['items'] = $items;
        $row['total'] = $row['total_amount'];
        $orders[] = $row;
    }
    $stmt->close();
    
    echo json_encode([
        "success" => true, 
        "orders" => $orders
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
