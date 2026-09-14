<?php
// get_customers.php - Server-Side Pagination + Search + Aggregate Stats
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

try {
    // Read query params
    $page   = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit  = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
    $offset = ($page - 1) * $limit;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    // Build dynamic WHERE clause
    $whereParts = ["u.role = 'customer'"];
    $params     = [];
    $types      = '';

    if ($search !== '') {
        $whereParts[] = "(u.full_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)";
        $like = "%{$search}%";
        $params[] = $like; $params[] = $like; $params[] = $like;
        $types   .= 'sss';
    }

    $whereSql = 'WHERE ' . implode(' AND ', $whereParts);

    // 1. Total filtered count
    $countSql = "SELECT COUNT(*) AS c FROM users u {$whereSql}";
    $stmt = $conn->prepare($countSql);
    if ($types !== '') { $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $totalFiltered = (int)$stmt->get_result()->fetch_assoc()['c'];
    $stmt->close();

    // 2. Aggregate stats across ALL customers (unaffected by search)
    $statsSql = "SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN is_vip    = 1 THEN 1 ELSE 0 END) AS vip
                 FROM users
                 WHERE role = 'customer'";
    $statsRow = $conn->query($statsSql)->fetch_assoc();

    // Total spent across all customer orders
    $spentSql = "SELECT COALESCE(SUM(o.total_amount), 0) AS total_spent
                 FROM orders o
                 INNER JOIN users u ON o.user_id = u.id
                 WHERE u.role = 'customer'";
    $totalSpent = (float)$conn->query($spentSql)->fetch_assoc()['total_spent'];

    // 3. Fetch paginated customers with aggregates
    $sql = "SELECT
                u.id, u.full_name, u.email, u.phone, u.role,
                u.is_active, u.is_vip, u.vip_discount, u.vip_free_shipping,
                (SELECT GROUP_CONCAT(privilege_id) FROM user_vip_privileges WHERE user_id = u.id) AS privilege_ids,
                COUNT(o.id) AS total_orders,
                IFNULL(SUM(o.total_amount), 0) AS total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            {$whereSql}
            GROUP BY u.id
            ORDER BY u.id DESC
            LIMIT ? OFFSET ?";

    $pageParams = $params;
    $pageTypes  = $types . 'ii';
    $pageParams[] = $limit;
    $pageParams[] = $offset;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($pageTypes, ...$pageParams);
    $stmt->execute();
    $result = $stmt->get_result();

    $customers = [];
    while ($row = $result->fetch_assoc()) {
        $customers[] = [
            'id'                => intval($row['id']),
            'full_name'         => $row['full_name'],
            'email'             => $row['email'],
            'phone'             => $row['phone'],
            'role'              => $row['role'],
            'is_active'         => intval($row['is_active']) === 1,
            'is_vip'            => intval($row['is_vip']) === 1,
            'vip_discount'      => intval($row['vip_discount']) === 1,
            'vip_free_shipping' => intval($row['vip_free_shipping']) === 1,
            'privilege_ids'     => $row['privilege_ids'] ? array_map('intval', explode(',', $row['privilege_ids'])) : [],
            'total_orders'      => intval($row['total_orders']),
            'total_spent'       => floatval($row['total_spent']),
        ];
    }
    $stmt->close();

    echo json_encode([
        'success'   => true,
        'customers' => $customers,
        'total'     => $totalFiltered,
        'page'      => $page,
        'limit'     => $limit,
        'stats'     => [
            'total'        => (int)($statsRow['total'] ?? 0),
            'active'       => (int)($statsRow['active'] ?? 0),
            'vip'          => (int)($statsRow['vip'] ?? 0),
            'total_spent'  => $totalSpent,
        ],
    ]);

} catch (Exception $e) {
    error_log('Get Customers Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}

$conn->close();
?>
