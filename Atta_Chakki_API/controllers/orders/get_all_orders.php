<?php
// get_all_orders.php - Server-Side Pagination + Filters + Aggregate Stats
include __DIR__ . '/../../config/connect.php';

if (!ob_start("ob_gzhandler")) ob_start();
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Read query params
    $returnAll     = isset($_GET['all']) && $_GET['all'] == '1';
    $page          = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit         = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
    $offset        = ($page - 1) * $limit;

    $search        = isset($_GET['search']) ? trim($_GET['search']) : '';
    $statusFilter  = isset($_GET['status']) ? trim($_GET['status']) : 'all';
    $sourceFilter  = isset($_GET['source']) ? trim($_GET['source']) : 'all';
    $typeFilter    = isset($_GET['type'])   ? trim($_GET['type'])   : 'all';
    $dateFrom      = isset($_GET['date_from']) ? trim($_GET['date_from']) : '';
    $dateTo        = isset($_GET['date_to'])   ? trim($_GET['date_to'])   : '';
    $advanceOnly   = isset($_GET['advance_only']) && $_GET['advance_only'] == '1';
    $unpaidOnly    = isset($_GET['unpaid_only'])  && $_GET['unpaid_only']  == '1';

    // Build dynamic WHERE clause safely with bound params
    $where  = [];
    $params = [];
    $types  = '';

    if ($search !== '') {
        $where[]  = "(u.full_name LIKE ? OR u.phone LIKE ? OR o.id LIKE ?)";
        $like     = "%{$search}%";
        $params[] = $like; $params[] = $like; $params[] = $like;
        $types   .= 'sss';
    }

    if ($statusFilter !== 'all' && $statusFilter !== '') {
        $where[]  = "o.status = ?";
        $params[] = $statusFilter;
        $types   .= 's';
    }

    if ($sourceFilter === 'manual') {
        $where[] = "(o.source = 'manual' OR o.user_id = 1 OR o.user_id IS NULL)";
    } elseif ($sourceFilter === 'online') {
        $where[] = "(o.source IS NULL OR (o.source <> 'manual' AND o.user_id IS NOT NULL AND o.user_id <> 1))";
    }

    if ($typeFilter === 'pickup') {
        $where[] = "(o.order_type = 'pickup' OR LOWER(COALESCE(o.shipping_address,'')) LIKE '%pickup%' OR LOWER(COALESCE(o.shipping_address,'')) LIKE '%store%' OR LOWER(COALESCE(o.shipping_address,'')) LIKE '%self%')";
    } elseif ($typeFilter === 'delivery') {
        $where[] = "(o.order_type <> 'pickup' OR o.order_type IS NULL) AND LOWER(COALESCE(o.shipping_address,'')) NOT LIKE '%pickup%'";
    }

    if ($dateFrom !== '') {
        $where[]  = "o.created_at >= ?";
        $params[] = $dateFrom . ' 00:00:00';
        $types   .= 's';
    }
    if ($dateTo !== '') {
        $where[]  = "o.created_at <= ?";
        $params[] = $dateTo . ' 23:59:59';
        $types   .= 's';
    }

    if ($advanceOnly) {
        $where[] = "COALESCE(o.amount_paid, 0) > 0";
    }

    if ($unpaidOnly) {
        $where[] = "(o.payment_status IN ('pending','partial') OR COALESCE(o.amount_paid,0) < o.total_amount) AND o.status <> 'cancelled'";
    }

    $whereSql = count($where) > 0 ? ('WHERE ' . implode(' AND ', $where)) : '';

    // 1. Total count of filtered rows (for pagination)
    $countSql = "SELECT COUNT(*) AS c
                 FROM orders o
                 LEFT JOIN users u ON o.user_id = u.id
                 {$whereSql}";
    $stmt = $conn->prepare($countSql);
    if ($types !== '') { $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $totalFiltered = (int)$stmt->get_result()->fetch_assoc()['c'];
    $stmt->close();

    // 2. Aggregate stats across the ENTIRE orders table (not affected by filters)
    $statsSql = "SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
                    SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready,
                    SUM(CASE WHEN status = 'out-for-delivery' THEN 1 ELSE 0 END) AS out_for_delivery,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
                    SUM(CASE WHEN status = 'completed' THEN COALESCE(total_amount,0) ELSE 0 END) AS total_revenue,
                    SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
                    SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) AS unpaid_orders,
                    SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) AS partial_orders
                 FROM orders";
    $statsRes = $conn->query($statsSql);
    $statsRow = $statsRes ? $statsRes->fetch_assoc() : [];

    // 3. Filtered summary (sum of paid amounts across all filtered rows — for the "Filtered Summary" card)
    $sumSql = "SELECT COALESCE(SUM(
                    CASE
                        WHEN o.status <> 'cancelled' AND o.payment_status = 'paid' THEN COALESCE(o.total_amount, 0)
                        WHEN o.status <> 'cancelled' THEN COALESCE(o.amount_paid, 0)
                        ELSE 0
                    END
                ), 0) AS filtered_paid
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                {$whereSql}";
    $stmt = $conn->prepare($sumSql);
    if ($types !== '') { $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $filteredPaid = (float)$stmt->get_result()->fetch_assoc()['filtered_paid'];
    $stmt->close();

    // 4. Fetch orders (paginated, unless all=1 for export)
    $ordersSql = "SELECT o.*,
                        COALESCE(u.full_name, 'Unknown Customer') AS customer_name,
                        COALESCE(u.phone, 'No Phone') AS customer_phone
                  FROM orders o
                  LEFT JOIN users u ON o.user_id = u.id
                  {$whereSql}
                  ORDER BY o.created_at DESC";

    if (!$returnAll) {
        $ordersSql .= " LIMIT ? OFFSET ?";
        $pageParams = $params;
        $pageTypes  = $types . 'ii';
        $pageParams[] = $limit;
        $pageParams[] = $offset;
    } else {
        // Safety cap even for export
        $ordersSql .= " LIMIT 5000";
        $pageParams = $params;
        $pageTypes  = $types;
    }

    $stmt = $conn->prepare($ordersSql);
    if ($pageTypes !== '') { $stmt->bind_param($pageTypes, ...$pageParams); }
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

    // 5. Batch fetch items for the returned order IDs only
    if (!empty($orderIds)) {
        $idList  = implode(',', array_map('intval', $orderIds));
        $itemSql = "SELECT oi.order_id, oi.quantity, oi.product_id, oi.price_at_purchase,
                           oi.is_cleaning, oi.is_grinding, p.name AS prod_name
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id IN ($idList)";
        $itemRes = $conn->query($itemSql);
        while ($i = $itemRes->fetch_assoc()) {
            $orderId  = (int)$i['order_id'];
            $i['name'] = $i['prod_name'] ?? "Item #{$i['product_id']}";
            if (isset($ordersMap[$orderId])) {
                $ordersMap[$orderId]['items'][] = $i;
            }
        }
    }

    $orders = array_values($ordersMap);

    echo json_encode([
        "success"        => true,
        "orders"         => $orders,
        "total"          => $totalFiltered,
        "page"           => $page,
        "limit"          => $limit,
        "filtered_paid"  => $filteredPaid,
        "stats"          => [
            "total"            => (int)($statsRow['total'] ?? 0),
            "pending"          => (int)($statsRow['pending'] ?? 0),
            "processing"       => (int)($statsRow['processing'] ?? 0),
            "ready"            => (int)($statsRow['ready'] ?? 0),
            "out_for_delivery" => (int)($statsRow['out_for_delivery'] ?? 0),
            "completed"        => (int)($statsRow['completed'] ?? 0),
            "cancelled"        => (int)($statsRow['cancelled'] ?? 0),
            "total_revenue"    => (float)($statsRow['total_revenue'] ?? 0),
            "paid_orders"      => (int)($statsRow['paid_orders'] ?? 0),
            "unpaid_orders"    => (int)($statsRow['unpaid_orders'] ?? 0),
            "partial_orders"   => (int)($statsRow['partial_orders'] ?? 0),
        ],
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
