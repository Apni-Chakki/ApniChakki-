<?php
// get_driver_cash_settlement.php - API for Driver COD Cash Collection & Settlement
include __DIR__ . '/../../config/cors.php';
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

try {
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $status_filter = isset($_GET['status']) ? trim($_GET['status']) : 'all'; // 'all', 'pending_cash', 'cleared'

    // Fetch all delivery personnel first to ensure registered riders are covered
    $driversMap = [];

    $dpRes = $conn->query("SELECT id, name, phone FROM delivery_personnel ORDER BY name ASC");
    if ($dpRes) {
        while ($row = $dpRes->fetch_assoc()) {
            $key = !empty($row['phone']) ? trim($row['phone']) : trim($row['name']);
            if (empty($key)) continue;
            $driversMap[$key] = [
                "driver_id"        => (int)$row['id'],
                "driver_name"      => $row['name'],
                "driver_phone"     => $row['phone'] ?? '',
                "total_orders"     => 0,
                "pending_cash_orders" => 0,
                "delivered_orders" => 0,
                "total_amount"     => 0.0,
                "total_paid"       => 0.0,
                "total_cash_due"   => 0.0,
                "orders"           => []
            ];
        }
    }

    // Query all orders that have driver assigned
    $searchCondition = "";
    $params = [];
    $types = "";
    if (!empty($search)) {
        $searchCondition = " AND (o.driver_name LIKE ? OR o.driver_phone LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ? OR o.id LIKE ?)";
        $like = "%{$search}%";
        $params = [$like, $like, $like, $like, $like];
        $types = "sssss";
    }

    $ordersSql = "
        SELECT 
            o.id AS order_id,
            o.user_id,
            o.driver_name,
            o.driver_phone,
            o.total_amount,
            o.status,
            o.payment_status,
            o.payment_method,
            o.shipping_address,
            o.source,
            o.created_at,
            COALESCE(u.full_name, 'Walk-in / Online Customer') AS customer_name,
            COALESCE(u.phone, '') AS customer_phone,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), COALESCE(o.amount_paid, 0)) AS amount_paid
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE ((o.driver_name IS NOT NULL AND o.driver_name <> '') OR (o.driver_phone IS NOT NULL AND o.driver_phone <> ''))
          AND o.status <> 'cancelled'
          {$searchCondition}
        ORDER BY o.created_at DESC
    ";

    $stmt = $conn->prepare($ordersSql);
    if (!empty($types)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $ordersResult = $stmt->get_result();

    while ($row = $ordersResult->fetch_assoc()) {
        $driverKey = !empty($row['driver_phone']) ? trim($row['driver_phone']) : trim($row['driver_name']);
        if (empty($driverKey)) continue;

        if (!isset($driversMap[$driverKey])) {
            $driversMap[$driverKey] = [
                "driver_id"           => null,
                "driver_name"         => $row['driver_name'] ?: 'Driver',
                "driver_phone"        => $row['driver_phone'] ?: '',
                "total_orders"        => 0,
                "pending_cash_orders" => 0,
                "delivered_orders"    => 0,
                "total_amount"        => 0.0,
                "total_paid"          => 0.0,
                "total_cash_due"      => 0.0,
                "orders"              => []
            ];
        }

        $orderTotal   = (float)$row['total_amount'];
        $amountPaid   = (float)$row['amount_paid'];
        $cashDue      = max(0, $orderTotal - $amountPaid);
        $isPendingCash = ($cashDue > 0 && in_array($row['payment_status'], ['pending', 'partial']));

        $driversMap[$driverKey]['total_orders']++;
        $driversMap[$driverKey]['total_amount'] += $orderTotal;
        $driversMap[$driverKey]['total_paid']   += $amountPaid;
        
        if ($isPendingCash) {
            $driversMap[$driverKey]['pending_cash_orders']++;
            $driversMap[$driverKey]['total_cash_due'] += $cashDue;
        }

        if ($row['status'] === 'completed') {
            $driversMap[$driverKey]['delivered_orders']++;
        }

        $driversMap[$driverKey]['orders'][] = [
            "order_id"        => (int)$row['order_id'],
            "customer_name"   => $row['customer_name'],
            "customer_phone"  => $row['customer_phone'],
            "shipping_address"=> $row['shipping_address'],
            "total_amount"    => $orderTotal,
            "amount_paid"     => $amountPaid,
            "cash_due"        => $cashDue,
            "status"          => $row['status'],
            "payment_status"  => $row['payment_status'],
            "payment_method"  => $row['payment_method'],
            "source"          => $row['source'] ?: 'online',
            "created_at"      => $row['created_at']
        ];
    }
    $stmt->close();

    // Filter and format drivers list
    $driversList = [];
    $grandTotalCashDue = 0.0;
    $grandTotalOrders = 0;
    $driversWithDue = 0;

    foreach ($driversMap as $driver) {
        // Apply status filter if required
        if ($status_filter === 'pending_cash' && $driver['total_cash_due'] <= 0) {
            continue;
        } elseif ($status_filter === 'cleared' && ($driver['total_cash_due'] > 0 || $driver['total_orders'] === 0)) {
            continue;
        }

        // Only include drivers with at least 1 order or registered
        if ($driver['total_orders'] > 0 || !empty($driver['driver_name'])) {
            $grandTotalCashDue += $driver['total_cash_due'];
            $grandTotalOrders += $driver['total_orders'];
            if ($driver['total_cash_due'] > 0) {
                $driversWithDue++;
            }
            $driversList[] = $driver;
        }
    }

    // Sort by highest cash due first
    usort($driversList, function ($a, $b) {
        if ($b['total_cash_due'] == $a['total_cash_due']) {
            return $b['total_orders'] <=> $a['total_orders'];
        }
        return ($b['total_cash_due'] > $a['total_cash_due']) ? 1 : -1;
    });

    $summary = [
        "grand_total_cash_due" => $grandTotalCashDue,
        "grand_total_orders"   => $grandTotalOrders,
        "drivers_with_due"     => $driversWithDue,
        "total_drivers"        => count($driversList)
    ];

    echo json_encode([
        "success"              => true,
        "drivers"              => $driversList,
        "grand_total_cash_due" => $grandTotalCashDue,
        "grand_total_orders"   => $grandTotalOrders,
        "drivers_with_due"     => $driversWithDue,
        "total_drivers"        => count($driversList),
        "summary"              => $summary
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error loading driver settlement data: " . $e->getMessage()
    ]);
}
