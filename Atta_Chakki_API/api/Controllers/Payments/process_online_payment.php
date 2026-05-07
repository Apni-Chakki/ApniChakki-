<?php
/**
 * Process online payments (Sandbox/Placeholder)
 * API Endpoint: POST /process_online_payment.php
 */

require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$order_id = $input['order_id'] ?? null;
$user_id = $input['user_id'] ?? null;
$amount = $input['amount'] ?? 0;
$payment_method = $input['payment_method'] ?? 'card';
$transaction_id = 'SANDBOX_' . strtoupper(uniqid());

try {
    if (!$order_id || !$user_id) {
        throw new Exception("Missing required fields (order_id or user_id)");
    }

    $conn->begin_transaction();

    $status = ($payment_method === 'bank') ? 'pending' : 'completed';
    $order_payment_status = ($payment_method === 'bank') ? 'pending' : 'paid';

    // 1. Record the transaction
    $completed_at = ($status === 'completed') ? date('Y-m-d H:i:s') : null;
    $stmt = $conn->prepare("INSERT INTO payment_transactions 
        (order_id, user_id, payment_method, amount, transaction_id, payment_status, created_at, completed_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)");
    
    $stmt->bind_param("iisdsss", $order_id, $user_id, $payment_method, $amount, $transaction_id, $status, $completed_at);
    $stmt->execute();
    $pt_id = $conn->insert_id;

    // 2. Update order status and payment status
    $stmt = $conn->prepare("UPDATE orders SET payment_status = ?, payment_method = ? WHERE id = ?");
    $stmt->bind_param("ssi", $order_payment_status, $payment_method, $order_id);
    $stmt->execute();

    // 3. Update business wallet balance (only for instant payments)
    if ($status === 'completed') {
        $stmt = $conn->prepare("UPDATE business_accounts SET balance = balance + ? WHERE is_primary = 1");
        $stmt->bind_param("d", $amount);
        $stmt->execute();
    }

    $conn->commit();

    $success_msg = ($payment_method === 'bank') 
        ? 'Transfer details submitted. Please wait for admin verification.' 
        : 'Payment processed successfully (Sandbox Mode)';

    echo json_encode([
        'success' => true,
        'message' => $success_msg,
        'transaction_id' => $transaction_id,
        'payment_transaction_id' => $pt_id,
        'status' => $status
    ]);

} catch (Exception $e) {
    if ($conn->in_transaction) $conn->rollback();
    error_log('Process Online Payment Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
