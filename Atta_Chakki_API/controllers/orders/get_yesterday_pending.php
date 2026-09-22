<?php
// get_yesterday_pending controller logic
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();


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
            ORDER BY o.assigned_date ASC, o.created_at ASC, o.id ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $today, $today);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $ordersMap = [];
    $orderIds = [];
    $userIds = [];
    
    while ($row = $result->fetch_assoc()) {
        $id = (int)$row['id'];
        $row['items'] = [];
        $row['customer_name'] = 'Unknown Customer';
        $row['customer_phone'] = 'No Phone';
        $totalWeight += floatval($row['total_weight_kg'] ?? 0);
        $totalMinutes += intval($row['processing_time_minutes'] ?? 0);
        $ordersMap[$id] = $row;
        $orderIds[] = $id;
        if (!empty($row['user_id'])) {
            $userIds[] = (int)$row['user_id'];
        }
    }
    $stmt->close();

    // 1. Batch fetch customer names
    if (!empty($userIds)) {
        $uList = implode(',', array_unique($userIds));
        $uRes = $conn->query("SELECT id, full_name, phone FROM users WHERE id IN ($uList)");
        if ($uRes) {
            $users = [];
            while ($u = $uRes->fetch_assoc()) {
                $users[(int)$u['id']] = $u;
            }
            foreach ($ordersMap as &$ord) {
                $uid = (int)($ord['user_id'] ?? 0);
                if (isset($users[$uid])) {
                    $ord['customer_name'] = $users[$uid]['full_name'];
                    $ord['customer_phone'] = $users[$uid]['phone'];
                }
            }
            unset($ord);
        }
    }

    // 2. Batch fetch items with product names
    if (!empty($orderIds)) {
        $oList = implode(',', $orderIds);
        $itemSql = "SELECT oi.order_id, oi.quantity, oi.product_id, oi.price_at_purchase,
                           COALESCE(p.name, CONCAT('Item #', oi.product_id)) as name,
                           COALESCE(p.unit, 'kg') as unit
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id IN ($oList)
                    ORDER BY oi.id ASC";
        $itemRes = $conn->query($itemSql);
        if ($itemRes) {
            while ($i = $itemRes->fetch_assoc()) {
                $oid = (int)$i['order_id'];
                $rawUnit = strtolower(trim($i['unit']));
                if ($rawUnit === 'trip' && floatval($i['price_at_purchase']) > 0) {
                    $i['unit'] = 'kg';
                }
                if (isset($ordersMap[$oid])) {
                    $ordersMap[$oid]['items'][] = $i;
                }
            }
        }
    }

    $orders = array_values($ordersMap);
    
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
?>
