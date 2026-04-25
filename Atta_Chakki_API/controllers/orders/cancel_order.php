<?php
// cancel order api
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['order_id'])) {
    echo json_encode(["success" => false, "message" => "Missing order_id"]);
    exit;
}

$order_id = intval($data['order_id']);
$reason = isset($data['reason']) ? trim($data['reason']) : 'No reason provided';
$cancelled_by = isset($data['cancelled_by']) ? $data['cancelled_by'] : 'User';

if ($order_id <= 0) {
    echo json_encode(["success" => false, "message" => "Invalid order_id"]);
    exit;
}

if (strlen($reason) > 500) {
    echo json_encode(["success" => false, "message" => "Reason too long (max 500 characters)"]);
    exit;
}

// checking if order exists and is pending
$check = $conn->prepare("SELECT id, status, user_id FROM orders WHERE id = ?");
$check->bind_param("i", $order_id);
$check->execute();
$result = $check->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Order not found"]);
    $check->close();
    exit;
}

$order = $result->fetch_assoc();
$check->close();

if (strtolower(trim($order['status'])) !== 'pending') {
    echo json_encode([
        "success" => false, 
        "message" => "Cannot cancel order. Only pending orders can be cancelled. Current status: " . $order['status']
    ]);
    exit;
}

// cancelling the order
$stmt = $conn->prepare(
    "UPDATE orders 
     SET status = 'cancelled', 
         cancellation_reason = ?, 
         cancelled_by = ?,
         cancelled_at = NOW()
     WHERE id = ?"
);

if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
    exit;
}

$stmt->bind_param("ssi", $reason, $cancelled_by, $order_id);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Order #$order_id cancelled successfully",
        "order_id" => $order_id,
        "status" => "cancelled",
        "reason" => $reason,
        "cancelled_by" => $cancelled_by
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Database error: " . $stmt->error]);
}

$stmt->close();
