<?php
// check_eod_status.php - checks for leftover orders from previous days
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

try {
    $today = date('Y-m-d');
    
    // Find orders from previous days that are still pending/processing
    $sql = "SELECT id, status, assigned_date, total_weight_kg, processing_time_minutes, 
                   total_amount, created_at
            FROM orders 
            WHERE TRIM(LOWER(status)) IN ('pending', 'processing')
            AND (
                (assigned_date IS NOT NULL AND assigned_date < ?)
                OR (assigned_date IS NULL AND DATE(created_at) < ?)
            )
            ORDER BY assigned_date ASC, queue_position ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $today, $today);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $leftoverOrders = [];
    $totalWeight = 0;
    $totalMinutes = 0;
    
    while ($row = $result->fetch_assoc()) {
        $leftoverOrders[] = $row;
        $totalWeight += floatval($row['total_weight_kg'] ?? 0);
        $totalMinutes += intval($row['processing_time_minutes'] ?? 0);
    }
    $stmt->close();
    
    $count = count($leftoverOrders);
    
    // Also get today's already scheduled orders count
    $todaySql = "SELECT COUNT(*) as today_count FROM orders 
                 WHERE assigned_date = ? 
                 AND TRIM(LOWER(status)) IN ('pending', 'processing')";
    $stmt2 = $conn->prepare($todaySql);
    $stmt2->bind_param("s", $today);
    $stmt2->execute();
    $todayResult = $stmt2->get_result()->fetch_assoc();
    $todayCount = intval($todayResult['today_count']);
    $stmt2->close();
    
    // Get tomorrow's orders that could be pulled in
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    $tomorrowSql = "SELECT COUNT(*) as tomorrow_count FROM orders 
                    WHERE assigned_date = ? 
                    AND TRIM(LOWER(status)) IN ('pending', 'processing')";
    $stmt3 = $conn->prepare($tomorrowSql);
    $stmt3->bind_param("s", $tomorrow);
    $stmt3->execute();
    $tomorrowResult = $stmt3->get_result()->fetch_assoc();
    $tomorrowCount = intval($tomorrowResult['tomorrow_count']);
    $stmt3->close();
    
    // Get capacity info
    $opening = '09:00';
    $closing = '20:00';
    $settingsSql = "SELECT setting_key, setting_value FROM store_settings 
                    WHERE setting_key IN ('openingTime', 'closingTime')";
    $settingsResult = $conn->query($settingsSql);
    if ($settingsResult) {
        while ($sRow = $settingsResult->fetch_assoc()) {
            if ($sRow['setting_key'] === 'openingTime') $opening = $sRow['setting_value'];
            if ($sRow['setting_key'] === 'closingTime') $closing = $sRow['setting_value'];
        }
    }
    
    $openDt = new DateTime($today . ' ' . $opening . ':00');
    $closeDt = new DateTime($today . ' ' . $closing . ':00');
    $totalCapacityMinutes = ($closeDt->getTimestamp() - $openDt->getTimestamp()) / 60;
    
    // Check if EOD check was already done today (optional flag in session/db)
    // For simplicity, we rely on the frontend to only show modal once per session
    
    echo json_encode([
        "success" => true,
        "has_leftover" => $count > 0,
        "leftover_count" => $count,
        "leftover_orders" => $leftoverOrders,
        "leftover_total_weight_kg" => round($totalWeight, 1),
        "leftover_total_minutes" => $totalMinutes,
        "today_scheduled_count" => $todayCount,
        "tomorrow_available_count" => $tomorrowCount,
        "today_capacity_minutes" => $totalCapacityMinutes,
        "opening_time" => $opening,
        "closing_time" => $closing
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
