<?php
// one-time utility, reschedules today's pending/processing orders
// run after changing scheduling logic so old orders pick up new calc
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/order_scheduler.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_once __DIR__ . '/../../utils/cache_helper.php';
require_admin();

try {
    $today = date('Y-m-d');

    // Pick all active orders that should be on today's queue
    $sql = "SELECT id FROM orders
            WHERE (assigned_date IS NULL OR assigned_date = '' OR assigned_date <= ?)
              AND TRIM(LOWER(status)) IN ('pending', 'processing')
            ORDER BY queue_position ASC, created_at ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $res = $stmt->get_result();

    $order_ids = [];
    while ($row = $res->fetch_assoc()) {
        $order_ids[] = intval($row['id']);
    }
    $stmt->close();

    $results = [];
    foreach ($order_ids as $oid) {
        $results[] = scheduleOrder($conn, $oid);
    }

    clear_api_cache();

    echo json_encode([
        'success' => true,
        'count'   => count($results),
        'results' => $results
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
