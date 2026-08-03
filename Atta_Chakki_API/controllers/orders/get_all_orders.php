<?php
// get_all_orders.php - High Performance Batch Query
include __DIR__ . '/../../config/connect.php';

if (!ob_start("ob_gzhandler")) ob_start();
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // 1. Single JOIN query to get all orders with customer details
    $sql = "SELECT o.*, 
                   COALESCE(u.full_name, 'Unknown Customer') as customer_name, 
                   COALESCE(u.phone, 'No Phone') as customer_phone 
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC 
            LIMIT 1000";
            
    $result = $conn->query($sql);
    $ordersMap = [];
    $orderIds = [];

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $id = (int)$row['id'];
            $row['items'] = [];
            $row['total'] = $row['total_amount'];
            $ordersMap[$id] = $row;
            $orderIds[] = $id;
        }
    }

    // 2. Batch fetch ALL items for ALL orders in 1 query
    if (!empty($orderIds)) {
        $idList = implode(',', array_map('intval', $orderIds));
        $itemSql = "SELECT oi.order_id, oi.quantity, oi.product_id, oi.price_at_purchase, 
                           oi.is_cleaning, oi.is_grinding, p.name as prod_name
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id IN ($idList)";
        $itemRes = $conn->query($itemSql);

        while ($i = $itemRes->fetch_assoc()) {
            $orderId = (int)$i['order_id'];
            $i['name'] = $i['prod_name'] ?? "Item #{$i['product_id']}";
            if (isset($ordersMap[$orderId])) {
                $ordersMap[$orderId]['items'][] = $i;
            }
        }
    }

    $orders = array_values($ordersMap);
    echo json_encode(["success" => true, "orders" => $orders, "total" => count($orders)]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
