<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['phone']) || !isset($data['amount'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Phone and amount are required"]);
        exit;
    }
    
    $phone = $conn->real_escape_string($data['phone']);
    $amount = floatval($data['amount']);
    
    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Amount must be greater than 0"]);
        exit;
    }
    
    // Get user by phone
    $userSql = "SELECT id FROM users WHERE phone = ?";
    $stmt = $conn->prepare($userSql);
    $stmt->bind_param("s", $phone);
    $stmt->execute();
    $userResult = $stmt->get_result();
    
    if ($userResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Customer not found"]);
        exit;
    }
    
    $user = $userResult->fetch_assoc();
    $user_id = $user['id'];
    $stmt->close();
    
    // Get pending orders for this user and distribute payment
    $ordersSql = "SELECT id, total_amount, 
                  COALESCE((SELECT SUM(amount) FROM payments WHERE order_id = orders.id), 0) as amount_paid
                  FROM orders 
                  WHERE user_id = ? AND payment_status IN ('pending', 'partial') AND status != 'cancelled'
                  ORDER BY created_at ASC";
    
    $stmt = $conn->prepare($ordersSql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $ordersResult = $stmt->get_result();
    $orders = $ordersResult->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    if (empty($orders)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "No pending orders found for this customer"]);
        exit;
    }
    
    // Distribute payment across pending orders
    $remainingAmount = $amount;
    $paymentDescription = "Udhaar payment";
    
    foreach ($orders as $order) {
        if ($remainingAmount <= 0) break;
        
        $order_id = $order['id'];
        $totalAmount = floatval($order['total_amount']);
        $amountPaid = floatval($order['amount_paid']);
        $outstanding = $totalAmount - $amountPaid;
        
        if ($outstanding <= 0) continue;
        
        // Take payment up to the outstanding amount
        $paymentAmount = min($remainingAmount, $outstanding);
        
        // Record payment
        $paymentSql = "INSERT INTO payments (order_id, amount, payment_method, description, created_at)
                      VALUES (?, ?, 'cash', ?, NOW())";
        $stmt = $conn->prepare($paymentSql);
        $stmt->bind_param("ids", $order_id, $paymentAmount, $paymentDescription);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to record payment: " . $stmt->error);
        }
        $stmt->close();
        
        // Update order payment status
        $newTotalPaid = $amountPaid + $paymentAmount;
        $newStatus = ($newTotalPaid >= $totalAmount) ? 'paid' : 'partial';
        
        $updateSql = "UPDATE orders SET payment_status = ?, amount_paid = ? WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("sdi", $newStatus, $newTotalPaid, $order_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to update order status: " . $stmt->error);
        }
        $stmt->close();
        
        $remainingAmount -= $paymentAmount;
    }
    
    echo json_encode([
        "success" => true,
        "message" => "Udhaar payment of Rs. " . number_format($amount, 2) . " recorded successfully"
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error recording payment: " . $e->getMessage()
    ]);
}
