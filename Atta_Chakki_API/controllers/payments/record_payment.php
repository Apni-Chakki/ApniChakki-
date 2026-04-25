<?php
// record payment api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['order_id']) || !isset($data['amount'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Order ID and amount are required"]);
        exit;
    }
    
    $order_id = intval($data['order_id']);
    $amount = floatval($data['amount']);
    $payment_method = $data['payment_method'] ?? 'cash';
    $description = $data['description'] ?? 'Manual payment';
    
    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Amount must be greater than 0"]);
        exit;
    }
    
    // checking order exists
    $orderSql = "SELECT id, total_amount FROM orders WHERE id = ?";
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
    $stmt->close();
    
    // inserting payment record
    $paymentSql = "INSERT INTO payments (order_id, amount, payment_method, description, created_at)
                  VALUES (?, ?, ?, ?, NOW())";
    $stmt = $conn->prepare($paymentSql);
    $stmt->bind_param("idss", $order_id, $amount, $payment_method, $description);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to record payment: " . $stmt->error);
    }
    $stmt->close();
    
    // getting total paid so far
    $totalPaidSql = "SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE order_id = ?";
    $stmt = $conn->prepare($totalPaidSql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $paidResult = $stmt->get_result();
    $paid = $paidResult->fetch_assoc();
    $totalPaid = floatval($paid['total_paid']);
    $stmt->close();
    
    // updating order payment status
    $totalAmount = floatval($order['total_amount']);
    $paymentStatus = ($totalPaid >= $totalAmount) ? 'paid' : 'partial';
    
    $updateSql = "UPDATE orders SET payment_status = ?, amount_paid = ? WHERE id = ?";
    $stmt = $conn->prepare($updateSql);
    $stmt->bind_param("sdi", $paymentStatus, $totalPaid, $order_id);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update order payment status: " . $stmt->error);
    }
    $stmt->close();
    
    echo json_encode([
        "success" => true,
        "message" => "Payment of Rs. " . number_format($amount, 2) . " recorded successfully",
        "payment_status" => $paymentStatus,
        "total_paid" => $totalPaid
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error recording payment: " . $e->getMessage()
    ]);
}
