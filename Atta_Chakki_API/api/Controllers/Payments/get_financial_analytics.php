<?php
/**
 * Financial Analytics API
 * Calculates revenue, expenses, and profit for the last 7 days
 */

require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

try {
    $chartData = [];
    $summary = [
        'totalRevenue' => 0,
        'totalExpense' => 0,
        'netProfit' => 0,
        'profitMargin' => 0
    ];

    // Get last 7 days including today
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $displayDate = date('D', strtotime($date));
        
        // 1. Get Revenue for this day
        $revSql = "SELECT SUM(total_amount) as daily_revenue FROM orders WHERE DATE(created_at) = '$date' AND status != 'cancelled'";
        $revRes = $conn->query($revSql);
        $revenue = (float)($revRes->fetch_assoc()['daily_revenue'] ?? 0);
        
        // 2. Get Expenses for this day
        $expSql = "SELECT SUM(amount) as daily_expense FROM expenses WHERE DATE(expense_time) = '$date'";
        $expRes = $conn->query($expSql);
        $expense = (float)($expRes->fetch_assoc()['daily_expense'] ?? 0);
        
        $profit = $revenue - $expense;
        
        $chartData[] = [
            'date' => $displayDate,
            'fullDate' => $date,
            'revenue' => $revenue,
            'expense' => $expense,
            'profit' => $profit
        ];
        
        $summary['totalRevenue'] += $revenue;
        $summary['totalExpense'] += $expense;
    }

    $summary['netProfit'] = $summary['totalRevenue'] - $summary['totalExpense'];
    if ($summary['totalRevenue'] > 0) {
        $summary['profitMargin'] = ($summary['netProfit'] / $summary['totalRevenue']) * 100;
    }

    echo json_encode([
        'success' => true,
        'chartData' => $chartData,
        'summary' => $summary
    ]);

} catch (Exception $e) {
    error_log('Financial Analytics Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch financial data: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
