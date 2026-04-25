<?php
// admin override - move order between today/tomorrow queues
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/order_scheduler.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['order_id']) || !isset($data['target_date'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "order_id and target_date (today/tomorrow) are required"]);
        exit;
    }
    
    $order_id = intval($data['order_id']);
    $target = $data['target_date']; // 'today' or 'tomorrow'
    
    // validate target
    if (!in_array($target, ['today', 'tomorrow'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "target_date must be 'today' or 'tomorrow'"]);
        exit;
    }
    
    // check order exists
    $stmt = $conn->prepare("SELECT id, assigned_date, total_weight_kg, processing_time_minutes FROM orders WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Order not found"]);
        exit;
    }
    
    $order = $result->fetch_assoc();
    $old_date = $order['assigned_date'];
    $stmt->close();
    
    // determine new date and status
    $today = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    
    if ($target === 'today') {
        $new_date = $today;
    } else {
        $new_date = $tomorrow;
    }
    
    // get queue position for new date
    $queue_pos = getNextQueuePosition($conn, $new_date);
    
    // get operational hours to calculate new ETA
    $hours = getOperationalHours($conn);
    $last_completion = getLastCompletionTime($conn, $new_date);
    
    if ($last_completion) {
        $start_time = new DateTime($last_completion);
    } else {
        $opening_dt = new DateTime($new_date . ' ' . $hours['opening'] . ':00');
        $now_dt = new DateTime();
        if ($target === 'today' && $now_dt > $opening_dt) {
            $start_time = $now_dt;
        } else {
            $start_time = $opening_dt;
        }
    }
    
    $processing_mins = intval($order['processing_time_minutes']);
    if ($processing_mins <= 0) {
        $processing_mins = ceil(floatval($order['total_weight_kg']) * 2);
    }
    
    $eta = clone $start_time;
    $eta->modify("+{$processing_mins} minutes");
    $eta_str = $eta->format('Y-m-d H:i:s');
    
    // update the order
    $update = $conn->prepare("UPDATE orders SET 
        assigned_date = ?, 
        estimated_completion_time = ?,
        queue_position = ?,
        is_manually_overridden = 1,
        updated_at = NOW()
        WHERE id = ?");
    $update->bind_param("ssii", $new_date, $eta_str, $queue_pos, $order_id);
    
    if (!$update->execute()) {
        throw new Exception("Failed to update order: " . $update->error);
    }
    $update->close();
    
    // recalculate schedules for both affected dates
    if ($old_date && $old_date !== $new_date) {
        recalculateSchedule($conn, $old_date);
    }
    recalculateSchedule($conn, $new_date);
    
    // get updated capacity info
    $today_capacity = getCapacityInfo($conn, $today);
    $tomorrow_capacity = getCapacityInfo($conn, $tomorrow);
    
    echo json_encode([
        "success" => true,
        "message" => "Order #{$order_id} moved to " . ($target === 'today' ? "Today's Work" : "Tomorrow's List"),
        "order_id" => $order_id,
        "new_date" => $new_date,
        "estimated_completion_time" => $eta_str,
        "today_capacity" => $today_capacity,
        "tomorrow_capacity" => $tomorrow_capacity
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
