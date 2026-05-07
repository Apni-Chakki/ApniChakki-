<?php
/**
 * Record payment for an order
 * API Endpoint: POST /record_payment.php
 */

require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$order_id = $input['order_id'] ?? null;
$amount = $input['amount'] ?? 0;

try {
    if (!$order_id) {
        throw new Exception("Order ID required");
    }
    if ($amount <= 0) {
        throw new Exception("Amount must be greater than zero");
    }

    $conn->begin_transaction();

    // 1. Get order details
    $stmt = $conn->prepare("SELECT total_amount, amount_paid, user_id FROM orders WHERE id = ? FOR UPDATE");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();

    if (!$order) {
        throw new Exception("Order not found");
    }

    $new_amount_paid = (float)$order['amount_paid'] + (float)$amount;
    $total_amount = (float)$order['total_amount'];
    $user_id = $order['user_id'] ? (int)$order['user_id'] : 1; // Fallback to admin if null
    
    // Determine new payment status
    $payment_status = 'partial';
    if ($new_amount_paid >= $total_amount) {
        $payment_status = 'paid';
    }

    // 2. Update order
    $update_stmt = $conn->prepare("UPDATE orders SET amount_paid = ?, payment_status = ?, updated_at = NOW() WHERE id = ?");
    $update_stmt->bind_param("dsi", $new_amount_paid, $payment_status, $order_id);
    $update_stmt->execute();

    // 3. Record in payment_transactions
    $transaction_id = 'MANUAL_' . strtoupper(uniqid());
    $pt_stmt = $conn->prepare("INSERT INTO payment_transactions 
        (order_id, user_id, payment_method, amount, transaction_id, payment_status, completed_at) 
        VALUES (?, ?, 'cash', ?, ?, 'completed', NOW())");
    $pt_stmt->bind_param("iids", $order_id, $user_id, $amount, $transaction_id);
    $pt_stmt->execute();

    // 4. Update business account balance
    $wallet_stmt = $conn->prepare("UPDATE business_accounts SET balance = balance + ? WHERE is_primary = 1");
    $wallet_stmt->bind_param("d", $amount);
    $wallet_stmt->execute();

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Payment recorded successfully',
        'new_amount_paid' => $new_amount_paid,
        'payment_status' => $payment_status
    ]);

} catch (Exception $e) {
    if ($conn->in_transaction) $conn->rollback();
    error_log('Record Payment Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
