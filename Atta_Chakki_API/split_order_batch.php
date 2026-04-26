<?php
// split_order_batch.php
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
    if (!isset($data['order_id']) || !isset($data['batches']) || !is_array($data['batches'])) {
        throw new Exception("Missing order_id or batches array.");
    }

    $order_id = intval($data['order_id']);
    $batches = $data['batches'];

    // 1. Get original order details
    $sql = "SELECT * FROM orders WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $origOrder = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$origOrder) {
        throw new Exception("Original order not found.");
    }

    // Check if it's already split
    if ($origOrder['status'] === 'split_parent') {
        throw new Exception("Order is already split.");
    }

    $hours = getOperationalHours($conn);
    $processing_speed = floatval($hours['processing_time_per_kg']);

    // 2. Mark original order as 'split_parent' so it is ignored by normal scheduling queues
    $upd = $conn->prepare("UPDATE orders SET status = 'split_parent' WHERE id = ?");
    $upd->bind_param("i", $order_id);
    $upd->execute();
    $upd->close();

    // 3. Create child orders for each batch
    $today = date('Y-m-d');
    $created_at = $origOrder['created_at']; // preserve creation time to keep them grouped in UI if needed
    $new_ids = [];

    $insSql = "INSERT INTO orders (
        customer_id, customer_name, phone, shipping_address, payment_method, 
        total_amount, status, created_at, assigned_date, total_weight_kg, 
        processing_time_minutes, parent_order_id, batch_index
    ) VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?, ?, ?)";
    
    $insStmt = $conn->prepare($insSql);

    foreach ($batches as $index => $weight) {
        $batch_weight = floatval($weight);
        $batch_mins = ceil($batch_weight * $processing_speed);
        $batch_number = $index + 1;
        $parent_id = $order_id;
        
        $insStmt->bind_param("issssdsssdii",
            $origOrder['customer_id'],
            $origOrder['customer_name'],
            $origOrder['phone'],
            $origOrder['shipping_address'],
            $origOrder['payment_method'],
            $created_at,
            $today,
            $batch_weight,
            $batch_mins,
            $parent_id,
            $batch_number
        );
        $insStmt->execute();
        $new_order_id = $conn->insert_id;
        $new_ids[] = $new_order_id;
        
        // Schedule this batch using the same auto-scheduler function!
        // This will automatically find the right ETA and queue position
        scheduleOrder($conn, $new_order_id);
    }
    $insStmt->close();

    // Return success
    echo json_encode([
        "success" => true,
        "message" => count($new_ids) . " batches created and scheduled successfully.",
        "parent_order_id" => $order_id,
        "batch_order_ids" => $new_ids
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
