<?php
// get expenses api
include __DIR__ . '/../../config/connect.php';

// todays total
$today_sql = "SELECT SUM(amount) as total FROM expenses WHERE DATE(expense_time) = CURDATE()";
$today_res = $conn->query($today_sql);
$today_row = $today_res->fetch_assoc();
$today_total = $today_row['total'] ? $today_row['total'] : 0;

// this months total
$month_sql = "SELECT SUM(amount) as total FROM expenses WHERE YEAR(expense_time) = YEAR(CURDATE()) AND MONTH(expense_time) = MONTH(CURDATE())";
$month_res = $conn->query($month_sql);
$month_row = $month_res->fetch_assoc();
$month_total = $month_row['total'] ? $month_row['total'] : 0;

// getting all expense records
$records_sql = "SELECT e.id, e.category, e.amount, e.description, e.expense_time, u.full_name as recorded_by
                FROM expenses e
                JOIN users u ON e.user_id = u.id
                ORDER BY e.expense_time DESC";

$records_res = $conn->query($records_sql);
$records = [];

if ($records_res) {
    while ($row = $records_res->fetch_assoc()) {
        $records[] = $row;
    }
}

echo json_encode([
    "success" => true,
    "totals" => [
        "today" => $today_total,
        "month" => $month_total
    ],
    "records" => $records
]);
