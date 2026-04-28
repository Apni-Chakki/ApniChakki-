<?php
// process_eod_selection.php - Processes the Option A EOD selection
// Receives: completed_order_ids[] (orders admin marked as done)
// Logic: Mark selected as 'completed', carry forward remaining to top of today's queue
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';
require_once __DIR__ . '/controllers/orders/order_scheduler.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $completed_ids = isset($data['completed_order_ids']) ? $data['completed_order_ids'] : [];
    
    $today = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    
    // Step 1: Get ALL leftover orders from previous days
    $leftoverSql = "SELECT id FROM orders 
                    WHERE TRIM(LOWER(status)) IN ('pending', 'processing')
                    AND (
                        (assigned_date IS NOT NULL AND assigned_date < ?)
                        OR (assigned_date IS NULL AND DATE(created_at) < ?)
                    )
                    ORDER BY assigned_date ASC, queue_position ASC";
    
    $stmt = $conn->prepare($leftoverSql);
    $stmt->bind_param("ss", $today, $today);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $all_leftover_ids = [];
    while ($row = $result->fetch_assoc()) {
        $all_leftover_ids[] = intval($row['id']);
    }
    $stmt->close();
    
    $completed_count = 0;
    $carried_forward_count = 0;
    
    // Step 2: Mark selected orders as 'completed'
    if (!empty($completed_ids)) {
        foreach ($completed_ids as $order_id) {
            $order_id = intval($order_id);
            $upd = $conn->prepare("UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = ?");
            $upd->bind_param("i", $order_id);
            $upd->execute();
            $upd->close();
            $completed_count++;
        }
    }
    
    // Step 3: Carry forward remaining leftover orders to today (top of queue)
    $pending_ids = array_diff($all_leftover_ids, array_map('intval', $completed_ids));
    
    if (!empty($pending_ids)) {
        // Give these orders negative queue positions so they end up first after recalculation
        // recalculateSchedule sorts by queue_position ASC, so negative = top priority
        $pos = -count($pending_ids);
        foreach ($pending_ids as $order_id) {
            $upd = $conn->prepare("UPDATE orders SET assigned_date = ?, queue_position = ?, status = 'pending' WHERE id = ?");
            $upd->bind_param("sii", $today, $pos, $order_id);
            $upd->execute();
            $upd->close();
            $pos++;
            $carried_forward_count++;
        }
    }
    
    // Step 4: Recalculate today's schedule (this normalizes queue positions and recalculates ETAs)
    recalculateSchedule($conn, $today);
    
    // Step 5: Recalculate tomorrow just in case
    recalculateSchedule($conn, $tomorrow);
    
    // Step 6: Get updated capacity info
    $today_capacity = getCapacityInfo($conn, $today);
    
    echo json_encode([
        "success" => true,
        "message" => "EOD selection processed successfully",
        "completed_count" => $completed_count,
        "carried_forward_count" => $carried_forward_count,
        "today_capacity" => $today_capacity
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
