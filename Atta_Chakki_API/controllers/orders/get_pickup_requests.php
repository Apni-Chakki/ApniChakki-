<?php
// get pickup requests (orders in pickup statuses OR containing a 'trip' unit item)
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $page   = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit  = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
    $offset = ($page - 1) * $limit;

    // Whitelist orders in SQL so pagination is consistent with the count
    $baseWhere = "(TRIM(LOWER(o.status)) IN ('pickup_pending','arrived_at_shop'))
                  OR EXISTS (
                     SELECT 1 FROM order_items oi2
                     JOIN products p2 ON p2.id = oi2.product_id
                     WHERE oi2.order_id = o.id
                       AND LOWER(TRIM(p2.unit)) = 'trip'
                       AND TRIM(LOWER(o.status)) IN ('pending','pickup_assigned','coming_for_pickup','arrived_at_shop')
                  )";

    $totalRes = $conn->query("SELECT COUNT(*) AS c FROM orders o WHERE {$baseWhere}");
    $total    = $totalRes ? (int)$totalRes->fetch_assoc()['c'] : 0;

    $sql = "SELECT o.* FROM orders o WHERE {$baseWhere} ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();

    $ordersMap = [];
    $orderIds  = [];
    $userIds   = [];
    while ($row = $result->fetch_assoc()) {
        $id = (int)$row['id'];
        $row['items'] = [];
        $row['total'] = $row['total_amount'];
        $ordersMap[$id] = $row;
        $orderIds[] = $id;
        if ((int)$row['user_id'] > 0) { $userIds[(int)$row['user_id']] = true; }
    }
    $stmt->close();

    // Batch fetch items
    if (!empty($orderIds)) {
        $idList = implode(',', array_map('intval', $orderIds));
        $itemSql = "SELECT oi.order_id, oi.id, oi.quantity, oi.product_id, oi.price_at_purchase,
                           p.name AS prod_name, p.unit AS prod_unit, p.price AS prod_price
                    FROM order_items oi
                    LEFT JOIN products p ON p.id = oi.product_id
                    WHERE oi.order_id IN ({$idList})";
        $itemRes = $conn->query($itemSql);
        while ($i = $itemRes->fetch_assoc()) {
            $oid = (int)$i['order_id'];
            $rawUnit = strtolower(trim($i['prod_unit'] ?? ''));
            $item = [
                'id'                => (int)$i['id'],
                'quantity'          => $i['quantity'],
                'product_id'        => (int)$i['product_id'],
                'price_at_purchase' => $i['price_at_purchase'],
                'name'              => $i['prod_name'] ?? ('Item #' . (int)$i['product_id']),
                'price_per_kg'      => (float)($i['prod_price'] ?? 0),
                'unit'              => ($rawUnit === 'trip' && (float)$i['price_at_purchase'] > 0) ? 'kg' : ($i['prod_unit'] ?? 'kg'),
            ];
            if (isset($ordersMap[$oid])) {
                $ordersMap[$oid]['items'][] = $item;
            }
        }
    }

    // Batch fetch users
    if (!empty($userIds)) {
        $uidList = implode(',', array_map('intval', array_keys($userIds)));
        $uRes = $conn->query("SELECT id, full_name, phone FROM users WHERE id IN ({$uidList})");
        $userMap = [];
        while ($u = $uRes->fetch_assoc()) {
            $userMap[(int)$u['id']] = $u;
        }
        foreach ($ordersMap as $oid => &$row) {
            $uid = (int)$row['user_id'];
            if ($uid > 0 && isset($userMap[$uid])) {
                $row['customer_name']  = $userMap[$uid]['full_name'];
                $row['customer_phone'] = $userMap[$uid]['phone'];
            } else {
                $row['customer_name']  = 'Unknown Customer';
                $row['customer_phone'] = 'Unknown';
            }
        }
        unset($row);
    } else {
        foreach ($ordersMap as $oid => &$row) {
            $row['customer_name']  = 'Unknown Customer';
            $row['customer_phone'] = 'Unknown';
        }
        unset($row);
    }

    echo json_encode([
        "success" => true,
        "orders"  => array_values($ordersMap),
        "total"   => $total,
        "page"    => $page,
        "limit"   => $limit,
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
