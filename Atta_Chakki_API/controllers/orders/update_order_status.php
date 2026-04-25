<?php
// update order status api - with schedule recalculation
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['order_id']) || !isset($data['status'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Order ID and status are required"]);
        exit;
    }
    
    $order_id = intval($data['order_id']);
    $status = $conn->real_escape_string($data['status']);
    $reason = isset($data['cancellation_reason']) ? $conn->real_escape_string(trim($data['cancellation_reason'])) : null;
    $cancelled_by = isset($data['cancelled_by']) ? $conn->real_escape_string(trim($data['cancelled_by'])) : 'Admin';
    
    // checking valid status
    $validStatuses = ['pending', 'processing', 'ready', 'out-for-delivery', 'completed', 'cancelled', 'scheduled-tomorrow', 'coming_for_pickup', 'arrived_at_shop'];
    if (!in_array($status, $validStatuses)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid status value"]);
        exit;
    }
    
    // checking if order exists
    $orderSql = "SELECT o.id, o.status, o.assigned_date, u.full_name as customer_name, u.phone as customer_phone 
                 FROM orders o 
                 LEFT JOIN users u ON o.user_id = u.id 
                 WHERE o.id = ?";
    $stmt = $conn->prepare($orderSql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $orderResult = $stmt->get_result();
    
    if ($orderResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Order not found"]);
        exit;
    }
    
    $order = $orderResult->fetch_assoc();
    $old_date = $order['assigned_date'];
    $stmt->close();

    // updating status
    if ($status === 'cancelled') {
        $updateSql = "UPDATE orders SET status = ?, cancellation_reason = ?, cancelled_by = ?, cancelled_at = NOW(), updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("sssi", $status, $reason, $cancelled_by, $order_id);
    } elseif ($status === 'scheduled-tomorrow') {
        // when scheduling for tomorrow, update assigned_date too
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        $updateSql = "UPDATE orders SET status = ?, assigned_date = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("ssi", $status, $tomorrow, $order_id);
    } elseif ($status === 'processing') {
        // when moving to processing, assign to today
        $today = date('Y-m-d');
        $updateSql = "UPDATE orders SET status = ?, assigned_date = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("ssi", $status, $today, $order_id);
    } else {
        $updateSql = "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("si", $status, $order_id);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update order status: " . $stmt->error);
    }
    $stmt->close();
    
    // recalculate schedule when order is removed from queue (ready, completed, cancelled)
    if (in_array($status, ['ready', 'completed', 'cancelled']) && $old_date) {
        require_once __DIR__ . '/order_scheduler.php';
        recalculateSchedule($conn, $old_date);
    }
    
    // recalculate schedule when moving between days
    if ($status === 'scheduled-tomorrow' || $status === 'processing') {
        require_once __DIR__ . '/order_scheduler.php';
        $target_date = ($status === 'scheduled-tomorrow') ? date('Y-m-d', strtotime('+1 day')) : date('Y-m-d');
        recalculateSchedule($conn, $target_date);
        if ($old_date && $old_date !== $target_date) {
            recalculateSchedule($conn, $old_date);
        }
    }
    
    echo json_encode([
        "success" => true,
        "message" => "Order status updated to '$status'",
        "order_id" => $order_id,
        "new_status" => $status,
        "customer_name" => $order['customer_name'] ?? '',
        "customer_phone" => $order['customer_phone'] ?? ''
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error updating order status: " . $e->getMessage()
    ]);
}
