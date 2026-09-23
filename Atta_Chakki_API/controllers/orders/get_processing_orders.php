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
                (o.assigned_date IS NULL OR CHAR_LENGTH(o.assigned_date) = 0 OR o.assigned_date <= ? OR o.total_weight_kg = 0)
                AND TRIM(LOWER(o.status)) IN ('pending', 'processing')
                AND TRIM(LOWER(o.status)) != 'split_parent'
            )
            ORDER BY o.created_at ASC, o.id ASC";
            
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
                           oi.is_cleaning, oi.is_grinding, oi.is_weight_pending, 
                           p.name as prod_name, p.unit as prod_unit, p.is_grinding_service
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
            $i['is_weight_pending'] = intval($i['is_weight_pending'] ?? 0);
            $i['is_grinding_service'] = intval($i['is_grinding_service'] ?? 0);
            $i['is_grinding'] = intval($i['is_grinding'] ?? 0);
            $i['is_cleaning'] = intval($i['is_cleaning'] ?? 0);
            
            $isPending = $i['is_weight_pending'];
            if ($rawUnit === 'trip' && floatval($i['price_at_purchase']) > 0 && !$isPending) {
                $i['unit'] = 'kg';
            } else {
                $i['unit'] = $i['prod_unit'] ?? 'kg';
            }

            // Identify grinding / pickup items vs initial delivery items
            $i['is_grinding_item'] = ($rawUnit === 'trip' || 
                                     $i['is_grinding_service'] === 1 || 
                                     $i['is_grinding'] === 1 || 
                                     $i['is_cleaning'] === 1);

            if ($rawUnit === 'trip' || $i['is_grinding_item']) {
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

        // Assign items & filter out initial pickup requests
        foreach ($ordersMap as $id => &$oRef) {
            $allItems = $itemsByOrder[$id] ?? [];
            
            $oFee = floatval($oRef['delivery_fee'] ?? 0);
            if ($oFee <= 0 && strtolower(trim($oRef['order_type'] ?? 'delivery')) !== 'pickup') {
                try {
                    $dsRes = $conn->query("SELECT base_fare FROM delivery_settings LIMIT 1");
                    if ($dsRes && $dsRow = $dsRes->fetch_assoc()) {
                        $oFee = floatval($dsRow['base_fare'] ?? 0);
                    }
                } catch (Throwable $t) {}
            }
            $oRef['delivery_fee'] = $oFee;

            $isCombined = intval($oRef['is_combined_order'] ?? 0);
            $stage = strtolower(trim($oRef['hybrid_stage'] ?? ''));
            
            if ($isCombined === 1 && $stage === 'grinding') {
                // Filter items to show & bill ONLY grinding/pickup items for stage 2 (ready goods were delivered in stage 1)
                $grindingItems = array_values(array_filter($allItems, function($item) {
                    return !empty($item['is_grinding_item']) || !empty($item['is_weight_pending']) || strtolower(trim($item['unit'] ?? '')) === 'trip';
                }));
                
                $stage1Items = array_values(array_filter($allItems, function($item) {
                    return empty($item['is_grinding_item']) && empty($item['is_weight_pending']) && strtolower(trim($item['unit'] ?? '')) !== 'trip';
                }));
                
                if (!empty($grindingItems)) {
                    $oRef['items'] = $grindingItems;
                    $oRef['all_items'] = $grindingItems;
                    
                    // Recalculate total_amount for grinding items only + delivery fee
                    $grindingSubtotal = 0;
                    foreach ($grindingItems as $gIt) {
                        $grindingSubtotal += (floatval($gIt['quantity']) * floatval($gIt['price_at_purchase']));
                    }
                    
                    $stage1Subtotal = 0;
                    foreach ($stage1Items as $s1It) {
                        $stage1Subtotal += (floatval($s1It['quantity']) * floatval($s1It['price_at_purchase']));
                    }
                    
                    $couponDiscount = floatval($oRef['coupon_discount'] ?? 0);
                    $oRef['total_amount'] = max(0, round($grindingSubtotal + $oFee - $couponDiscount));
                    $oRef['total'] = $oRef['total_amount'];

                    // Stage 1 payment covered stage 1 items. Deduct stage 1 items cost from amount_paid
                    $rawPaid = floatval($oRef['amount_paid'] ?? 0);
                    $stage2Paid = max(0, round($rawPaid - $stage1Subtotal));
                    
                    // If rawPaid was equal or close to stage 1 items total + fee, stage 2 advance is 0
                    if ($rawPaid > 0 && abs($rawPaid - $stage1Subtotal) <= 100 && $stage1Subtotal > 0) {
                        $stage2Paid = 0;
                    }

                    $oRef['amount_paid'] = $stage2Paid;
                    $oRef['advancePayment'] = $stage2Paid;
                    
                    if ($stage2Paid >= $oRef['total_amount'] && $oRef['total_amount'] > 0) {
                        $oRef['payment_status'] = 'paid';
                    } elseif ($stage2Paid > 0) {
                        $oRef['payment_status'] = 'partial';
                    } else {
                        $oRef['payment_status'] = 'pending';
                    }
                } else {
                    $oRef['items'] = $allItems;
                    $oRef['all_items'] = $allItems;
                }
            } else {
                $oRef['items'] = $allItems;
                $oRef['all_items'] = $allItems;
            }
            
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
