<?php
// process_rollover.php - EOD rollover ka kaam kar rahe han hum yahan
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';
require_once __DIR__ . '/../Orders/order_scheduler.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['action'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "action is required (keep_priority or auto_fill)"]);
        exit;
    }

    $action = $data['action'];
    $today = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));

    // puray dino k pending orders dhoond rahe han
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
    $leftovers = [];
    while ($row = $result->fetch_assoc()) {
        $leftovers[] = $row['id'];
    }
    $stmt->close();

    if ($action === 'keep_priority') {
        // Option A: Kal k orders aaj pull kar rahe han priority k sath
        if (!empty($leftovers)) {
            // Put leftovers at the beginning of today's queue
            // A simple way is to set their assigned_date to today, and then recalculate
            // Since recalculateSchedule sorts by queue_position, we can give leftovers negative or small queue positions
            $pos = -count($leftovers);
            foreach ($leftovers as $order_id) {
                $upd = $conn->prepare("UPDATE orders SET assigned_date = ?, queue_position = ? WHERE id = ?");
                $upd->bind_param("sii", $today, $pos, $order_id);
                $upd->execute();
                $upd->close();
                $pos++;
            }
            // Aaj ka schedule dobara nikal rahe han
            recalculateSchedule($conn, $today);
            // Recalculate tomorrow just in case
            recalculateSchedule($conn, $tomorrow);
        }
    } else if ($action === 'auto_fill') {
        // Option B: Leftovers ko kal pe bhej rahe han aur kal k orders aaj pull kar rahe han
        if (!empty($leftovers)) {
            // Push leftovers to tomorrow (end of queue)
            foreach ($leftovers as $order_id) {
                $pos = getNextQueuePosition($conn, $tomorrow);
                $upd = $conn->prepare("UPDATE orders SET assigned_date = ?, queue_position = ? WHERE id = ?");
                $upd->bind_param("sii", $tomorrow, $pos, $order_id);
                $upd->execute();
                $upd->close();
            }
        }
        
        // Aaj ka schedule khali kar rahe han
        recalculateSchedule($conn, $today);
        
        // Ab kal k orders aaj pull karnay ki koshish kar rahe han
        $capInfo = getCapacityInfo($conn, $today);
        $remaining_mins = $capInfo['remaining_minutes'];
        
        if ($remaining_mins > 0) {
            // Get tomorrow's orders ordered by queue_position
            $tomSql = "SELECT id, processing_time_minutes, total_weight_kg FROM orders 
                       WHERE assigned_date = ? 
                       AND TRIM(LOWER(status)) IN ('pending', 'processing')
                       ORDER BY queue_position ASC";
            $stmt = $conn->prepare($tomSql);
            $stmt->bind_param("s", $tomorrow);
            $stmt->execute();
            $tomRes = $stmt->get_result();
            
            while ($row = $tomRes->fetch_assoc()) {
                $proc_mins = intval($row['processing_time_minutes']);
                if ($proc_mins <= 0) {
                    $proc_mins = ceil(floatval($row['total_weight_kg']) * 2);
                }
                
                if ($proc_mins <= $remaining_mins) {
                    // Pull to today
                    $nextPos = getNextQueuePosition($conn, $today);
                    $upd = $conn->prepare("UPDATE orders SET assigned_date = ?, queue_position = ? WHERE id = ?");
                    $upd->bind_param("sii", $today, $nextPos, $row['id']);
                    $upd->execute();
                    $upd->close();
                    
                    $remaining_mins -= $proc_mins;
                }
            }
            $stmt->close();
        }
        
        // Final recalculate to update ETAs
        recalculateSchedule($conn, $today);
        recalculateSchedule($conn, $tomorrow);
    } else {
        throw new Exception("Invalid action");
    }

    echo json_encode([
        "success" => true,
        "message" => "Rollover processed successfully"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}



