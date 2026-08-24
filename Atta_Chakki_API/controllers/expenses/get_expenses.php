<?php
// get expenses api - Server-Side Pagination + Date Range Filter
include __DIR__ . '/../../config/connect.php';

$returnAll = isset($_GET['all']) && $_GET['all'] == '1';
$page      = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
$limit     = max(1, min(500, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
$offset    = ($page - 1) * $limit;
$dateFrom  = isset($_GET['date_from']) ? trim($_GET['date_from']) : '';
$dateTo    = isset($_GET['date_to'])   ? trim($_GET['date_to'])   : '';

$where  = [];
$params = [];
$types  = '';

if ($dateFrom !== '') {
    $where[]  = "e.expense_time >= ?";
    $params[] = $dateFrom . ' 00:00:00';
    $types   .= 's';
}
if ($dateTo !== '') {
    $where[]  = "e.expense_time <= ?";
    $params[] = $dateTo . ' 23:59:59';
    $types   .= 's';
}
$whereSql = count($where) > 0 ? ('WHERE ' . implode(' AND ', $where)) : '';

// today total (unfiltered)
$today_total = (float)$conn->query("SELECT COALESCE(SUM(amount),0) AS t FROM expenses WHERE DATE(expense_time)=CURDATE()")->fetch_assoc()['t'];
// month total (unfiltered)
$month_total = (float)$conn->query("SELECT COALESCE(SUM(amount),0) AS t FROM expenses WHERE YEAR(expense_time)=YEAR(CURDATE()) AND MONTH(expense_time)=MONTH(CURDATE())")->fetch_assoc()['t'];

// Filtered total row count + amount (respects date range)
$aggSql = "SELECT COUNT(*) AS c, COALESCE(SUM(amount),0) AS s FROM expenses e {$whereSql}";
$stmt = $conn->prepare($aggSql);
if ($types !== '') { $stmt->bind_param($types, ...$params); }
$stmt->execute();
$agg = $stmt->get_result()->fetch_assoc();
$totalFiltered = (int)$agg['c'];
$filteredAmount = (float)$agg['s'];
$stmt->close();

// Records (paginated or all)
$sql = "SELECT e.id, e.category, e.amount, e.description, e.expense_time, u.full_name AS recorded_by
        FROM expenses e
        JOIN users u ON e.user_id = u.id
        {$whereSql}
        ORDER BY e.expense_time DESC";
$pageParams = $params;
$pageTypes  = $types;
if (!$returnAll) {
    $sql .= " LIMIT ? OFFSET ?";
    $pageParams[] = $limit;
    $pageParams[] = $offset;
    $pageTypes   .= 'ii';
} else {
    $sql .= " LIMIT 5000";
}

$stmt = $conn->prepare($sql);
if ($pageTypes !== '') { $stmt->bind_param($pageTypes, ...$pageParams); }
$stmt->execute();
$result = $stmt->get_result();

$records = [];
while ($row = $result->fetch_assoc()) {
    $records[] = $row;
}
$stmt->close();

echo json_encode([
    "success" => true,
    "totals" => [
        "today" => $today_total,
        "month" => $month_total,
    ],
    "records"          => $records,
    "total"            => $totalFiltered,
    "filtered_amount"  => $filteredAmount,
    "page"             => $page,
    "limit"            => $limit,
]);
