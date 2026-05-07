<?php
/**
 * Record Udhaar Payment (Settle debts)
 * Settles outstanding orders in FIFO order for a customer
 */

require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$phone = $input['phone'] ?? null;
$amount_received = $input['amount'] ?? 0;

try {
    if (!$phone || $amount_received <= 0) {
        throw new Exception("Phone and valid amount required");
    }

    $conn->begin_transaction();

    // 0. Get user_id from phone
    $user_stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
    $user_stmt->bind_param("s", $phone);
    $user_stmt->execute();
    $user_res = $user_stmt->get_result()->fetch_assoc();
    
    if (!$user_res) {
        throw new Exception("User not found with this phone number");
    }
    $user_id = $user_res['id'];

    // 1. Get all outstanding orders for this customer (FIFO - oldest first)
    $sql = "SELECT id, total_amount, amount_paid FROM orders 
            WHERE user_id = ? AND payment_status IN ('pending', 'partial') AND status != 'cancelled'
            ORDER BY created_at ASC FOR UPDATE";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $remaining_payment = (float)$amount_received;
    $settled_orders = [];

    while ($remaining_payment > 0 && $order = $result->fetch_assoc()) {
        $order_id = $order['id'];
        $outstanding = (float)$order['total_amount'] - (float)$order['amount_paid'];
        
        $payment_for_this_order = min($remaining_payment, $outstanding);
        $new_amount_paid = (float)$order['amount_paid'] + $payment_for_this_order;
        $remaining_payment -= $payment_for_this_order;
        
        $new_status = ($new_amount_paid >= (float)$order['total_amount']) ? 'paid' : 'partial';
        
        // Update the order
        $update = $conn->prepare("UPDATE orders SET amount_paid = ?, payment_status = ?, updated_at = NOW() WHERE id = ?");
        $update->bind_param("dsi", $new_amount_paid, $new_status, $order_id);
        $update->execute();
        
        // Record transaction
        $transaction_id = 'UDHAAR_SETTLE_' . strtoupper(uniqid());
        $pt = $conn->prepare("INSERT INTO payment_transactions 
            (order_id, user_id, payment_method, amount, transaction_id, payment_status, completed_at) 
            SELECT id, user_id, 'cash', ?, ?, 'completed', NOW() FROM orders WHERE id = ?");
        $pt->bind_param("dsi", $payment_for_this_order, $transaction_id, $order_id);
        $pt->execute();
        
        $settled_orders[] = $order_id;
    }

    // 2. Update business account balance
    $wallet = $conn->prepare("UPDATE business_accounts SET balance = balance + ? WHERE is_primary = 1");
    $wallet->bind_param("d", $amount_received);
    $wallet->execute();

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Udhaar settled successfully for ' . count($settled_orders) . ' orders',
        'settled_orders' => $settled_orders,
        'remaining_change' => $remaining_payment // Should be 0 if logic is correct
    ]);

} catch (Exception $e) {
    if ($conn->in_transaction) $conn->rollback();
    error_log('Record Udhaar Payment Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
