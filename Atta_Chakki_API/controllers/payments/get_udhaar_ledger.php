<?php
include __DIR__ . '/../../config/cors.php';
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

// Fetch all unpaid orders grouped by customer
// KEY FIX: Subtract payments already made from each order's outstanding balance
$sql = "SELECT o.id as order_id, o.total_amount, o.status, o.payment_status, o.created_at,
               u.id as user_id, u.full_name, u.phone,
               COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0) as amount_paid
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.payment_status IN ('pending', 'partial') AND o.status != 'cancelled'
        ORDER BY o.created_at ASC";

$result = $conn->query($sql);

$customerMap = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $phone = $row['phone'];
        
        if (!isset($customerMap[$phone])) {
            $customerMap[$phone] = [
                "user_id" => $row['user_id'],
                "name" => $row['full_name'],
                "phone" => $phone,
                "totalDebt" => 0,
                "orderCount" => 0,
                "lastOrderDate" => $row['created_at'],
                "orders" => []
            ];
        }

        $orderAmount = floatval($row['total_amount']);
        $amountPaid = floatval($row['amount_paid']);
        $outstanding = $orderAmount - $amountPaid;
        
        // Only count as debt if there's still money owed
        if ($outstanding > 0) {
            $customerMap[$phone]['totalDebt'] += $outstanding;
            $customerMap[$phone]['orderCount'] += 1;
            
            if ($row['created_at'] > $customerMap[$phone]['lastOrderDate']) {
                $customerMap[$phone]['lastOrderDate'] = $row['created_at'];
            }

            $customerMap[$phone]['orders'][] = [
                "order_id" => $row['order_id'],
                "total" => $orderAmount,
                "amount_paid" => $amountPaid,
                "outstanding" => $outstanding,
                "status" => $row['status'],
                "payment_status" => $row['payment_status'],
                "created_at" => $row['created_at']
            ];
        }
    }
}

// Remove customers with zero debt (all paid off)
$customerMap = array_filter($customerMap, function($c) {
    return $c['totalDebt'] > 0;
});

// Convert map to array and sort by totalDebt descending
$ledgers = array_values($customerMap);
usort($ledgers, function($a, $b) {
    return $b['totalDebt'] - $a['totalDebt'];
});

$totalOutstanding = array_sum(array_column($ledgers, 'totalDebt'));

echo json_encode([
    "success" => true,
    "ledgers" => $ledgers,
    "totalOutstanding" => $totalOutstanding
]);
