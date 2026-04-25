<?php
// jazzcash callback handler
require_once __DIR__ . '/../config/cors.php';
include __DIR__ . '/../config/connect.php';
require_once __DIR__ . '/../config/payment_config.php';

header('Content-Type: application/json');

// jazzcash sends response via post
$response_data = $_POST;

if (empty($response_data)) {
    $response_data = json_decode(file_get_contents("php://input"), true) ?? [];
}

error_log("JazzCash Callback Received: " . json_encode($response_data));

if (empty($response_data)) {
    echo json_encode(["success" => false, "message" => "No callback data received"]);
    exit;
}

// getting jazzcash response fields
$response_code = $response_data['pp_ResponseCode'] ?? '';
$response_message = $response_data['pp_ResponseMessage'] ?? '';
$txn_ref_no = $response_data['pp_TxnRefNo'] ?? '';
$amount = isset($response_data['pp_Amount']) ? intval($response_data['pp_Amount']) / 100 : 0;
$secure_hash = $response_data['pp_SecureHash'] ?? '';

if (empty($txn_ref_no)) {
    echo json_encode(["success" => false, "message" => "Missing transaction reference"]);
    exit;
}

// verifying hash
$params_to_verify = $response_data;
unset($params_to_verify['pp_SecureHash']);
$computed_hash = generateJazzCashHash($params_to_verify);

if ($computed_hash !== $secure_hash && !JAZZCASH_SANDBOX_MODE) {
    error_log("JazzCash callback hash mismatch for TXN: $txn_ref_no");
    echo json_encode(["success" => false, "message" => "Hash verification failed"]);
    exit;
}

// finding the payment transaction
$stmt = $conn->prepare("SELECT id, order_id, user_id, amount FROM payment_transactions WHERE transaction_id = ?");
$stmt->bind_param("s", $txn_ref_no);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Transaction not found: $txn_ref_no"]);
    exit;
}

$transaction = $result->fetch_assoc();
$stmt->close();

$conn->begin_transaction();

try {
    $payment_status = ($response_code === '000') ? 'completed' : 'failed';
    
    // updating payment status
    $update_stmt = $conn->prepare("UPDATE payment_transactions SET payment_status = ?, gateway_response = ?, completed_at = NOW() WHERE id = ?");
    $gateway_response = json_encode($response_data);
    $update_stmt->bind_param("ssi", $payment_status, $gateway_response, $transaction['id']);
    $update_stmt->execute();
    $update_stmt->close();
    
    // if successful update order too
    if ($payment_status === 'completed') {
        $update_order = $conn->prepare("UPDATE orders SET payment_status = 'paid', amount_paid = total_amount, transaction_id = ? WHERE id = ?");
        $update_order->bind_param("si", $txn_ref_no, $transaction['order_id']);
        $update_order->execute();
        $update_order->close();
        
        // recording in payments table
        $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, transaction_id) VALUES (?, ?, 'jazzcash', ?)");
        $pay_stmt->bind_param("ids", $transaction['order_id'], $transaction['amount'], $txn_ref_no);
        $pay_stmt->execute();
        $pay_stmt->close();
    }
    
    $conn->commit();
    
    echo json_encode([
        "success" => ($payment_status === 'completed'),
        "message" => $response_message,
        "payment_status" => $payment_status,
        "transaction_id" => $txn_ref_no
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("JazzCash callback error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Callback processing failed"]);
}
?>
