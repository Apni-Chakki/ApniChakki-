<?php
// admin orders controller - Server-Side Pagination + Status Filter + Batched Item Fetch
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $status_filter = isset($_GET['status']) ? strtolower(trim($_GET['status'])) : '';
    $page          = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit         = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 20));
    $offset        = ($page - 1) * $limit;

    $whereSql = '';
    if ($status_filter === 'pending') {
        $whereSql = " WHERE TRIM(LOWER(status)) = 'pending' AND TRIM(LOWER(status)) != 'split_parent'";
    } elseif ($status_filter === 'ready') {
        $whereSql = " WHERE TRIM(LOWER(status)) = 'ready'";
    } elseif ($status_filter === 'active') {
        $whereSql = " WHERE TRIM(LOWER(status)) IN ('processing', 'ready', 'shipped')";
    } elseif ($status_filter === 'history') {
        $whereSql = " WHERE TRIM(LOWER(status)) IN ('completed', 'cancelled', 'split_parent')";
    }

    // Total for pagination
    $total = (int)$conn->query("SELECT COUNT(*) AS c FROM orders {$whereSql}")->fetch_assoc()['c'];

    // Paginated orders
    $sql = "SELECT * FROM orders {$whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();

    $orders    = [];
    $ordersMap = [];
    $orderIds  = [];
    $userIds   = [];

    while ($row = $result->fetch_assoc()) {
        $id  = (int)$row['id'];
        $uid = (int)$row['user_id'];
        $row['items'] = [];
        $orders[]        = &$ordersMap[$id];
        $ordersMap[$id]  = $row;
        $orderIds[]      = $id;
        if ($uid > 0) { $userIds[$uid] = true; }
        // rebind by reference
        $orders[count($orders) - 1] = &$ordersMap[$id];
    }
    $stmt->close();

    // Batch fetch users
    $users = [];
    if (!empty($userIds)) {
        $idList = implode(',', array_map('intval', array_keys($userIds)));
        $uRes   = $conn->query("SELECT id, full_name, phone FROM users WHERE id IN ({$idList})");
        while ($u = $uRes->fetch_assoc()) {
            $users[(int)$u['id']] = $u;
        }
    }

    // Batch fetch items + product names
    if (!empty($orderIds)) {
        $idList = implode(',', array_map('intval', $orderIds));
        $itemSql = "SELECT oi.order_id, oi.quantity, oi.product_id, p.name AS prod_name
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id IN ({$idList})";
        $itemRes = $conn->query($itemSql);
        while ($i = $itemRes->fetch_assoc()) {
            $oid = (int)$i['order_id'];
            $i['name'] = $i['prod_name'] ?? ("Item #" . (int)$i['product_id']);
            if (isset($ordersMap[$oid])) {
                $ordersMap[$oid]['items'][] = $i;
            }
        }
    }

    // Attach user info
    foreach ($ordersMap as $oid => &$row) {
        $uid = (int)$row['user_id'];
        if ($uid > 0 && isset($users[$uid])) {
            $row['customer_name']  = $users[$uid]['full_name'];
            $row['customer_phone'] = $users[$uid]['phone'];
        } else {
            $row['customer_name']  = 'Walk-in Customer';
            $row['customer_phone'] = 'No Phone';
        }
    }
    unset($row);

    $ordersOut = array_values($ordersMap);

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "orders"  => $ordersOut,
        "total"   => $total,
        "page"    => $page,
        "limit"   => $limit,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    $error_msg = $e->getMessage();
    error_log('admin_orders.php error: ' . $error_msg);
    echo json_encode(["success" => false, "message" => "Error: " . $error_msg]);
}
