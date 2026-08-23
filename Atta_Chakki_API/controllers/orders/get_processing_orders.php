<?php
// get_processing_orders.php - High Speed Optimized Batch Query
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/order_scheduler.php';

if (!ob_start("ob_gzhandler")) ob_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $today = date('Y-m-d');
    
    // 1. Single JOIN query for today's orders + user details
    $sql = "SELECT o.*, 
                   COALESCE(u.full_name, 'Unknown Customer') as customer_name, 
                   COALESCE(u.phone, 'No Phone') as customer_phone 
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE (
                (o.assigned_date IS NULL OR CHAR_LENGTH(o.assigned_date) = 0 OR o.assigned_date <= ?)
                AND TRIM(LOWER(o.status)) IN ('pending', 'processing')
                AND TRIM(LOWER(o.status)) != 'split_parent'
            )
            ORDER BY o.queue_position ASC, o.created_at ASC";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $result = $stmt->get_result();

    $ordersMap = [];
    $orderIds = [];
    $parentIds = [];

    while ($row = $result->fetch_assoc()) {
        $id = (int)$row['id'];
        $row['items'] = [];
        $row['total'] = $row['total_amount'];
        $created_date = date('Y-m-d', strtotime($row['created_at']));
        $row['is_carried_forward'] = ($created_date < $today);
        $row['is_split_batch'] = false;
        $row['all_siblings_ready'] = false;
        $row['siblings'] = [];

        $parentId = intval($row['parent_order_id'] ?? 0);
        if ($parentId > 0) {
            $row['is_split_batch'] = true;
            $parentIds[] = $parentId;
        }

        $ordersMap[$id] = $row;
        $orderIds[] = $id;
    }
    $stmt->close();

    if (!empty($orderIds)) {
        $idList = implode(',', array_map('intval', $orderIds));

        // 2. Batch fetch ALL order_items across all orders
        $itemSql = "SELECT oi.id, oi.order_id, oi.quantity, oi.product_id, oi.price_at_purchase, 
                           oi.is_cleaning, oi.is_grinding, p.name as prod_name, p.unit as prod_unit
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id IN ($idList)";
        $itemRes = $conn->query($itemSql);

        $orderItemIds = [];
        $itemsByOrder = [];
        $hasTripMap = [];

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
            if ($rawUnit === 'trip') {
                $hasTripMap[$orderId] = true;
            }
            $i['customizations'] = [];
            $itemsByOrder[$orderId][] = $i;
        }

        // 3. Batch fetch ALL customizations
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

        // 4. Batch fetch split order siblings
        if (!empty($parentIds)) {
            $parentList = implode(',', array_unique(array_map('intval', $parentIds)));
            try {
                $sibRes = $conn->query("SELECT id, parent_order_id, status, batch_index, assigned_date, total_weight_kg FROM orders WHERE parent_order_id IN ($parentList) ORDER BY batch_index ASC");
                if ($sibRes) {
                    $sibsByParent = [];
                    while ($sib = $sibRes->fetch_assoc()) {
                        $sibsByParent[(int)$sib['parent_order_id']][] = $sib;
                    }
                    foreach ($ordersMap as $id => &$oRef) {
                        $pId = intval($oRef['parent_order_id'] ?? 0);
                        if ($pId > 0 && isset($sibsByParent[$pId])) {
                            $sibs = $sibsByParent[$pId];
                            $oRef['siblings'] = $sibs;
                            $notReady = array_filter($sibs, fn($s) => $s['id'] != $id && !in_array($s['status'], ['ready', 'batch_ready']));
                            $oRef['all_siblings_ready'] = (count($sibs) > 0 && count($notReady) === 0);
                        }
                    }
                }
            } catch (Throwable $t) {
                // Ignore if column missing
            }
        }

        // Assign items & filter out initial pickup requests
        foreach ($ordersMap as $id => &$oRef) {
            $oRef['items'] = $itemsByOrder[$id] ?? [];
            if (!empty($hasTripMap[$id])) {
                $st = strtolower(trim($oRef['status']));
                if (!in_array($st, ['awaiting_weight', 'pending', 'processing'])) {
                    unset($ordersMap[$id]);
                }
            }
        }
    }

    $orders = array_values($ordersMap);
    $capacity = getCapacityInfo($conn, $today);

    echo json_encode([
        "success" => true, 
        "orders" => $orders,
        "capacity" => $capacity
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
