<?php
// get tomorrow's scheduled orders with scheduling info - Optimized Batch Query
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/order_scheduler.php';

if (!ob_start("ob_gzhandler")) ob_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    
    // 1. Fetch all scheduled orders with user info in a single JOIN query
    $sql = "SELECT o.*, 
                   COALESCE(u.full_name, 'Unknown Customer') as customer_name, 
                   COALESCE(u.phone, 'No Phone') as customer_phone 
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE (
                (o.assigned_date IS NULL OR CHAR_LENGTH(o.assigned_date) = 0 OR o.assigned_date >= ?)
                AND TRIM(LOWER(o.status)) IN ('pending', 'processing')
            )
            ORDER BY o.queue_position ASC, o.created_at ASC";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $tomorrow);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $ordersMap = [];
    $orderIds = [];

    while ($row = $result->fetch_assoc()) {
        $id = (int)$row['id'];
        $row['items'] = [];
        $row['total'] = $row['total_amount'];
        $ordersMap[$id] = $row;
        $orderIds[] = $id;
    }
    $stmt->close();

    if (!empty($orderIds)) {
        // 2. Batch fetch ALL items for ALL orders in 1 query
        $idList = implode(',', array_map('intval', $orderIds));
        $itemSql = "SELECT oi.id, oi.order_id, oi.quantity, oi.product_id, oi.price_at_purchase, 
                           oi.is_cleaning, oi.is_grinding, p.name as prod_name, p.unit as prod_unit
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id IN ($idList)";
        $itemRes = $conn->query($itemSql);

        $orderItemIds = [];
        $itemsByOrder = [];

        while ($i = $itemRes->fetch_assoc()) {
            $itemId = (int)$i['id'];
            $orderId = (int)$i['order_id'];
            $orderItemIds[] = $itemId;

            $rawUnit = strtolower(trim($i['prod_unit'] ?? ''));
            $i['name'] = $i['prod_name'] ?? "Item #{$i['product_id']}";
            
            if ($rawUnit === 'trip' && floatval($i['price_at_purchase']) > 0) {
                $i['unit'] = 'kg';
            } else {
                $i['unit'] = $i['prod_unit'] ?? 'kg';
            }
            $i['customizations'] = [];
            $itemsByOrder[$orderId][] = $i;
        }

        // 3. Batch fetch ALL customizations for ALL items in 1 query
        if (!empty($orderItemIds)) {
            $itemIdList = implode(',', array_map('intval', $orderItemIds));
            try {
                $custRes = $conn->query("SELECT order_item_id, option_name, option_price FROM order_item_customizations WHERE order_item_id IN ($itemIdList)");
                if ($custRes) {
                    $custsByItem = [];
                    while ($c = $custRes->fetch_assoc()) {
                        $custsByItem[(int)$c['order_item_id']][] = [
                            'option_name' => $c['option_name'],
                            'option_price' => $c['option_price']
                        ];
                    }
                    foreach ($itemsByOrder as $orderId => &$itemList) {
                        foreach ($itemList as &$itemRef) {
                            $itemId = (int)$itemRef['id'];
                            if (isset($custsByItem[$itemId])) {
                                $itemRef['customizations'] = $custsByItem[$itemId];
                            }
                        }
                    }
                }
            } catch (Throwable $t) {
                // Ignore if table initializing
            }
        }

        // Assign items back to orders
        foreach ($itemsByOrder as $orderId => $itemList) {
            if (isset($ordersMap[$orderId])) {
                $ordersMap[$orderId]['items'] = $itemList;
            }
        }
    }

    $orders = array_values($ordersMap);
    
    // Capacity info calculation
    $capacity = getCapacityInfo($conn, $tomorrow);

    echo json_encode([
        "success" => true, 
        "orders" => $orders,
        "capacity" => $capacity
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
