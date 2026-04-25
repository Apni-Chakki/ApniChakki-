<?php
// api/get_financial_analytics.php
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $chartData = [];

    // 1. Generate the structure for the last 7 days (including today)
    for ($i = 6; $i >= 0; $i--) {
        $dateQuery = date('Y-m-d', strtotime("-$i days"));
        $displayDate = date('d M', strtotime("-$i days")); // e.g., '10 Mar'
        
        $chartData[$dateQuery] = [
            "date" => $displayDate,
            "revenue" => 0,
            "expense" => 0,
            "profit" => 0
        ];
    }

// 2. Fetch Revenue (Sum of orders that are NOT cancelled)
$revenue_sql = "SELECT DATE(created_at) as order_date, SUM(total_amount) as daily_revenue
                FROM orders
                WHERE status != 'cancelled' AND created_at >= DATE(NOW()) - INTERVAL 6 DAY
                GROUP BY DATE(created_at)";

$rev_res = $conn->query($revenue_sql);
if ($rev_res) {
    while ($row = $rev_res->fetch_assoc()) {
        $date = $row['order_date'];
        if (isset($chartData[$date])) {
            $chartData[$date]['revenue'] = floatval($row['daily_revenue']);
        }
    }
}

// 3. Fetch Expenses from Digital Khata
$expense_sql = "SELECT DATE(expense_time) as exp_date, SUM(amount) as daily_expense
                FROM expenses
                WHERE expense_time >= DATE(NOW()) - INTERVAL 6 DAY
                GROUP BY DATE(expense_time)";

$exp_res = $conn->query($expense_sql);
if ($exp_res) {
    while ($row = $exp_res->fetch_assoc()) {
        $date = $row['exp_date'];
        if (isset($chartData[$date])) {
            $chartData[$date]['expense'] = floatval($row['daily_expense']);
        }
    }
}

// 4. Flatten the array and calculate the total summary
$finalData = [];
$totalRev = 0;
$totalExp = 0;

foreach ($chartData as $date => $data) {
    $data['profit'] = $data['revenue'] - $data['expense'];
    $finalData[] = $data;
    
    $totalRev += $data['revenue'];
    $totalExp += $data['expense'];
}

$netProfit = $totalRev - $totalExp;
$profitMargin = $totalRev > 0 ? ($netProfit / $totalRev) * 100 : 0;

echo json_encode([
    "success" => true,
    "chartData" => $finalData,
    "summary" => [
        "totalRevenue" => $totalRev,
        "totalExpense" => $totalExp,
        "netProfit" => $netProfit,
        "profitMargin" => $profitMargin
    ]
]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
