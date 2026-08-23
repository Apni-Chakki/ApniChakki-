<?php
// get_completed_orders.php - Server-Side Pagination + Search + Source Filter
include __DIR__ . '/../../config/connect.php';

if (!ob_start("ob_gzhandler")) ob_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $page   = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit  = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 9));
    $offset = ($page - 1) * $limit;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $source = isset($_GET['source']) ? trim($_GET['source']) : 'all';

    $where  = ["TRIM(LOWER(o.status)) = 'completed'"];
    $params = [];
    $types  = '';

    if ($search !== '') {
        $where[] = "(u.full_name LIKE ? OR u.phone LIKE ? OR CAST(o.id AS CHAR) LIKE ?)";
        $like = "%{$search}%";
        $params[] = $like; $params[] = $like; $params[] = $like;
        $types .= 'sss';
    }

    if ($source === 'manual') {
        $where[] = "(o.source = 'manual' OR o.user_id = 1 OR o.user_id IS NULL)";
    } elseif ($source === 'online') {
        $where[] = "(o.source IS NULL OR (o.source <> 'manual' AND o.user_id IS NOT NULL AND o.user_id <> 1))";
    }

    $whereSql = 'WHERE ' . implode(' AND ', $where);

    // Total count
    $countSql = "SELECT COUNT(*) AS c FROM orders o LEFT JOIN users u ON o.user_id = u.id {$whereSql}";
    $stmt = $conn->prepare($countSql);
    if ($types !== '') { $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $totalFiltered = (int)$stmt->get_result()->fetch_assoc()['c'];
    $stmt->close();

    // Fetch page
    $sql = "SELECT o.*,
                   COALESCE(u.full_name, 'Unknown Customer') AS customer_name,
                   COALESCE(u.phone, 'No Phone') AS customer_phone
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            {$whereSql}
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?";
    $pageParams = $params;
    $pageTypes  = $types . 'ii';
    $pageParams[] = $limit;
    $pageParams[] = $offset;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($pageTypes, ...$pageParams);
    $stmt->execute();
    $result = $stmt->get_result();

    $ordersMap = [];
    $orderIds  = [];
    while ($row = $result->fetch_assoc()) {
        $id = (int)$row['id'];
        $row['items'] = [];
        $row['total'] = $row['total_amount'];
        $ordersMap[$id] = $row;
        $orderIds[] = $id;
    }
    $stmt->close();

    if (!empty($orderIds)) {
        $idList = implode(',', array_map('intval', $orderIds));
        $itemSql = "SELECT oi.order_id, oi.quantity, oi.product_id, oi.price_at_purchase, p.name AS prod_name
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
    echo json_encode([
        "success" => true,
        "orders"  => $orders,
        "total"   => $totalFiltered,
        "page"    => $page,
        "limit"   => $limit,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
