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
                AND TRIM(LOWER(o.status)) != 'split_parent'
                AND o.total_weight_kg > 0
            )
            ORDER BY o.created_at ASC, o.id ASC";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $tomorrow);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $ordersMap = [];
    $orderIds = [];
    $parentIds = [];

    while ($row = $result->fetch_assoc()) {
        $id = (int)$row['id'];
        $row['items'] = [];
        $row['total'] = $row['total_amount'];
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
                    foreach ($itemsByOrder as $oId => $itemList) {
                        foreach ($itemList as $idx => $item) {
                            $itemId = (int)$item['id'];
                            if (isset($custsByItem[$itemId])) {
                                $itemsByOrder[$oId][$idx]['customizations'] = $custsByItem[$itemId];
                            }
                        }
                    }
                }
            } catch (Throwable $t) {
                // Ignore if table initializing
            }
        }

        // 4. Batch fetch split order siblings and parent orders
        if (!empty($parentIds)) {
            $parentList = implode(',', array_unique(array_map('intval', $parentIds)));
            try {
                // Fetch sibling batches
                $sibRes = $conn->query("SELECT id, parent_order_id, status, batch_index, total_batches, assigned_date, total_weight_kg FROM orders WHERE parent_order_id IN ($parentList) ORDER BY batch_index ASC");
                $sibsByParent = [];
                if ($sibRes) {
                    while ($sib = $sibRes->fetch_assoc()) {
                        $sibsByParent[(int)$sib['parent_order_id']][] = $sib;
                    }
                }

                // Fetch parent orders details
                $parentsRes = $conn->query("SELECT o.*, 
                                                   COALESCE(u.full_name, 'Unknown Customer') as customer_name, 
                                                   COALESCE(u.phone, 'No Phone') as customer_phone 
                                            FROM orders o 
                                            LEFT JOIN users u ON o.user_id = u.id 
                                            WHERE o.id IN ($parentList)");
                $parentsMap = [];
                if ($parentsRes) {
                    while ($pRow = $parentsRes->fetch_assoc()) {
                        $pRow['items'] = [];
                        $pRow['total'] = $pRow['total_amount'];
                        $parentsMap[(int)$pRow['id']] = $pRow;
                    }
                }

                // Fetch parent order items
                if (!empty($parentsMap)) {
                    $pItemRes = $conn->query("SELECT oi.id, oi.order_id, oi.quantity, oi.product_id, oi.price_at_purchase, 
                                                     oi.is_cleaning, oi.is_grinding, p.name as prod_name, p.unit as prod_unit
                                              FROM order_items oi
                                              LEFT JOIN products p ON oi.product_id = p.id
                                              WHERE oi.order_id IN ($parentList)");
                    if ($pItemRes) {
                        while ($pi = $pItemRes->fetch_assoc()) {
                            $pOrderId = (int)$pi['order_id'];
                            $pi['name'] = $pi['prod_name'] ?? "Item #{$pi['product_id']}";
                            $pi['unit'] = $pi['prod_unit'] ?? 'kg';
                            if (isset($parentsMap[$pOrderId])) {
                                $parentsMap[$pOrderId]['items'][] = $pi;
                            }
                        }
                    }
                }

                foreach ($ordersMap as $id => &$oRef) {
                    $pId = intval($oRef['parent_order_id'] ?? 0);
                    if ($pId > 0) {
                        if (isset($sibsByParent[$pId])) {
                            $sibs = $sibsByParent[$pId];
                            $oRef['siblings'] = $sibs;
                            $notReady = array_filter($sibs, fn($s) => $s['id'] != $id && !in_array(strtolower(trim($s['status'])), ['ready', 'batch_ready', 'completed', 'delivered']));
                            $oRef['all_siblings_ready'] = (count($sibs) > 0 && count($notReady) === 0);
                        }
                        if (isset($parentsMap[$pId])) {
                            $oRef['parent_order'] = $parentsMap[$pId];
                        }
                    }
                }
            } catch (Throwable $t) {
                // Ignore if column missing
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
