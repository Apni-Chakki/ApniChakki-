<?php
// get_udhaar_ledger.php - Server-Side Pagination + Search
include __DIR__ . '/../../config/cors.php';
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

$page   = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
$limit  = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
$offset = ($page - 1) * $limit;
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

// Build per-customer aggregate (with outstanding > 0)
$searchSql = '';
$searchParams = [];
$searchTypes = '';
if ($search !== '') {
    $searchSql = " AND (u.full_name LIKE ? OR u.phone LIKE ?)";
    $like = "%{$search}%";
    $searchParams = [$like, $like];
    $searchTypes = 'ss';
}

$aggSql = "
    SELECT
        u.id AS user_id,
        u.full_name AS name,
        u.phone AS phone,
        SUM(GREATEST(o.total_amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0), 0)) AS total_debt,
        SUM(CASE WHEN (o.total_amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0)) > 0 THEN 1 ELSE 0 END) AS order_count,
        MAX(o.created_at) AS last_order_date
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.payment_status IN ('pending','partial') AND o.status <> 'cancelled'
    {$searchSql}
    GROUP BY u.id, u.full_name, u.phone
    HAVING total_debt > 0
    ORDER BY total_debt DESC
";

// Count all matching customers + grand total
$countStmt = $conn->prepare("SELECT COUNT(*) AS c, COALESCE(SUM(total_debt),0) AS s FROM ({$aggSql}) AS t");
if ($searchTypes !== '') { $countStmt->bind_param($searchTypes, ...$searchParams); }
$countStmt->execute();
$agg = $countStmt->get_result()->fetch_assoc();
$totalCustomers   = (int)$agg['c'];
$totalOutstanding = (float)$agg['s'];
$countStmt->close();

// Paginated slice
$pagedSql = $aggSql . " LIMIT ? OFFSET ?";
$pageParams = $searchParams;
$pageTypes  = $searchTypes . 'ii';
$pageParams[] = $limit;
$pageParams[] = $offset;

$stmt = $conn->prepare($pagedSql);
$stmt->bind_param($pageTypes, ...$pageParams);
$stmt->execute();
$result = $stmt->get_result();

$customerMap = [];
$userIds = [];
while ($row = $result->fetch_assoc()) {
    $uid = (int)$row['user_id'];
    $customerMap[$uid] = [
        "user_id"       => $uid,
        "name"          => $row['name'],
        "phone"         => $row['phone'],
        "totalDebt"     => (float)$row['total_debt'],
        "orderCount"    => (int)$row['order_count'],
        "lastOrderDate" => $row['last_order_date'],
        "orders"        => [],
    ];
    $userIds[] = $uid;
}
$stmt->close();

// Fetch outstanding orders for these customers only
if (!empty($userIds)) {
    $idList = implode(',', array_map('intval', $userIds));
    $ordersSql = "
        SELECT
            o.id AS order_id, o.user_id, o.total_amount, o.status, o.payment_status, o.created_at,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0) AS amount_paid
        FROM orders o
        WHERE o.user_id IN ($idList)
          AND o.payment_status IN ('pending','partial')
          AND o.status <> 'cancelled'
        ORDER BY o.created_at ASC
    ";
    $ordersRes = $conn->query($ordersSql);
    while ($row = $ordersRes->fetch_assoc()) {
        $uid = (int)$row['user_id'];
        $orderAmount = (float)$row['total_amount'];
        $amountPaid  = (float)$row['amount_paid'];
        $outstanding = $orderAmount - $amountPaid;
        if ($outstanding <= 0) continue;
        if (!isset($customerMap[$uid])) continue;
        $customerMap[$uid]['orders'][] = [
            "order_id"       => (int)$row['order_id'],
            "total"          => $orderAmount,
            "amount_paid"    => $amountPaid,
            "outstanding"    => $outstanding,
            "status"         => $row['status'],
            "payment_status" => $row['payment_status'],
            "created_at"     => $row['created_at'],
        ];
    }
}

$ledgers = array_values($customerMap);

echo json_encode([
    "success"          => true,
    "ledgers"          => $ledgers,
    "total"            => $totalCustomers,
    "totalOutstanding" => $totalOutstanding,
    "page"             => $page,
    "limit"            => $limit,
]);
