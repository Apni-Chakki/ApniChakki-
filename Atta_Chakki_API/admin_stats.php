<?php
// admin stats api
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

try {
    // getting all the counts
    $total = $conn->query("SELECT COUNT(*) as count FROM orders")->fetch_assoc()['count'];
    $pending = $conn->query("SELECT COUNT(*) as count FROM orders WHERE LOWER(TRIM(status)) = 'pending'")->fetch_assoc()['count'];
    $processing = $conn->query("SELECT COUNT(*) as count FROM orders WHERE LOWER(TRIM(status)) IN ('processing', 'ready', 'out-for-delivery')")->fetch_assoc()['count'];

    $completedTotal = $conn->query("SELECT COUNT(*) as count FROM orders WHERE LOWER(TRIM(status)) = 'completed'")->fetch_assoc()['count'];
    $completedToday = $conn->query("SELECT COUNT(*) as count FROM orders WHERE LOWER(TRIM(status)) = 'completed' AND DATE(updated_at) = CURDATE()")->fetch_assoc()['count'];

    $revenue_result = $conn->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE LOWER(TRIM(status)) = 'completed'");
    $revenueTotal = $revenue_result->fetch_assoc()['total'];

    $today_revenue_result = $conn->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE LOWER(TRIM(status)) = 'completed' AND DATE(updated_at) = CURDATE()");
    $todayRevenue = $today_revenue_result->fetch_assoc()['total'];
    
    $customers = $conn->query("SELECT COUNT(*) as count FROM users WHERE role = 'customer'")->fetch_assoc()['count'];
    $todayOrders = $conn->query("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()")->fetch_assoc()['count'];
    $tomorrowScheduled = $conn->query("SELECT COUNT(*) as count FROM orders WHERE LOWER(TRIM(status)) = 'scheduled-tomorrow'")->fetch_assoc()['count'];

    $overdueCount = 0; 
    
    // checking low stock
    $lowStockQuery = "SELECT id, name, stock_quantity, min_stock_level, unit FROM products WHERE stock_quantity <= min_stock_level AND LOWER(TRIM(unit)) != 'trip'";
    $lowStockResult = $conn->query($lowStockQuery);
    $lowStockCount = 0;
    $lowStockItems = [];
    if ($lowStockResult) {
        while($row = $lowStockResult->fetch_assoc()) {
            $lowStockCount++;
            $lowStockItems[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'stock' => (float)$row['stock_quantity'],
                'min' => (float)$row['min_stock_level'],
                'unit' => $row['unit']
            ];
        }
    }
    
    $output = [
        'success' => true,
        'stats' => [ 
            'totalOrders' => (int)$total,
            'pendingOrders' => (int)$pending,
            'completedOrders' => (int)$completedTotal,
            'totalRevenue' => (float)$revenueTotal,
            'totalCustomers' => (int)$customers,
            'todaysOrders' => (int)$todayOrders
        ],
        'data' => [ 
            'todayRevenue' => (float)$todayRevenue,
            'todayOrders' => (int)$todayOrders,
            'pendingOrders' => (int)$pending,
            'processingOrders' => (int)$processing,
            'completedToday' => (int)$completedToday,
            'tomorrowScheduled' => (int)$tomorrowScheduled,
            'overdueCount' => (int)$overdueCount,
            'lowStockCount' => (int)$lowStockCount,
            'lowStockItems' => $lowStockItems
        ]
    ];

    echo json_encode($output);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
