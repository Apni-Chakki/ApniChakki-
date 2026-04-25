<?php
// manage wallets and payment verification
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$action = isset($data['action']) ? $data['action'] : 'get_balance';

// checking if admin
$user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;

if ($user_id > 0) {
    $user_stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $user_stmt->bind_param("i", $user_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();

    if ($user_result->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "User not found"]);
        $user_stmt->close();
        exit;
    }

    $user = $user_result->fetch_assoc();
    $user_stmt->close();

    if (strtolower($user['role']) !== 'admin') {
        echo json_encode(["success" => false, "message" => "Unauthorized access"]);
        exit;
    }
}

// routing actions
switch ($action) {
    case 'get_balance':
        getBusinessBalance();
        break;
    case 'get_transactions':
        getWalletTransactions();
        break;
    case 'get_payment_history':
        getPaymentHistory();
        break;
    case 'get_payment_stats':
        getPaymentStats();
        break;
    case 'get_pending_verification':
        getPendingBankTransfers();
        break;
    case 'verify_bank_payment':
        verifyBankPayment();
        break;
    case 'reject_bank_payment':
        rejectBankPayment();
        break;
    default:
        echo json_encode(["success" => false, "message" => "Unknown action: $action"]);
}

// getting business balance
function getBusinessBalance() {
    global $conn;
    
    $stmt = $conn->prepare("SELECT id, account_name, balance, account_number, bank_name FROM business_accounts WHERE is_primary = 1 AND is_active = 1");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(["success" => true, "balance" => 0, "account_name" => "No account configured"]);
        $stmt->close();
        return;
    }
    
    $account = $result->fetch_assoc();
    $stmt->close();
    
    // todays received amount
    $today_stmt = $conn->prepare("SELECT COALESCE(SUM(amount), 0) as today_received FROM payment_transactions WHERE payment_status = 'completed' AND DATE(completed_at) = CURDATE()");
    $today_stmt->execute();
    $today_result = $today_stmt->get_result();
    $today = $today_result->fetch_assoc();
    $today_stmt->close();
    
    // total online payments
    $total_online = $conn->prepare("SELECT COALESCE(SUM(amount), 0) as total_online FROM payment_transactions WHERE payment_status = 'completed'");
    $total_online->execute();
    $total_online_result = $total_online->get_result();
    $total_online_row = $total_online_result->fetch_assoc();
    $total_online->close();
    
    // pending bank transfers
    $pending_stmt = $conn->prepare("SELECT COUNT(*) as pending_count FROM payment_transactions WHERE payment_method = 'bank' AND payment_status = 'pending'");
    $pending_stmt->execute();
    $pending_result = $pending_stmt->get_result();
    $pending_row = $pending_result->fetch_assoc();
    $pending_stmt->close();
    
    echo json_encode([
        "success" => true,
        "account_id" => intval($account['id']),
        "account_name" => $account['account_name'],
        "balance" => floatval($account['balance']),
        "account_number" => $account['account_number'],
        "bank_name" => $account['bank_name'],
        "today_received" => floatval($today['today_received']),
        "total_online_received" => floatval($total_online_row['total_online']),
        "pending_verification_count" => intval($pending_row['pending_count'])
    ]);
}

// getting wallet transactions
function getWalletTransactions() {
    global $conn, $data;
    
    $limit = isset($data['limit']) ? intval($data['limit']) : 50;
    $offset = isset($data['offset']) ? intval($data['offset']) : 0;
    
    $query = "SELECT wt.*, u.full_name as user_name 
              FROM wallet_transactions wt 
              LEFT JOIN users u ON wt.user_id = u.id
              ORDER BY wt.created_at DESC LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ii", $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = [
            'id' => intval($row['id']),
            'user_id' => intval($row['user_id']),
            'user_name' => $row['user_name'] ?? 'System',
            'transaction_type' => $row['transaction_type'],
            'amount' => floatval($row['amount']),
            'description' => $row['description'],
            'balance_before' => floatval($row['balance_before']),
            'balance_after' => floatval($row['balance_after']),
            'created_at' => $row['created_at']
        ];
    }
    
    $stmt->close();
    
    echo json_encode([
        "success" => true,
        "transactions" => $transactions,
        "count" => count($transactions)
    ]);
}

// getting payment history
function getPaymentHistory() {
    global $conn, $data;
    
    $limit = isset($data['limit']) ? intval($data['limit']) : 50;
    $offset = isset($data['offset']) ? intval($data['offset']) : 0;
    $status = isset($data['status']) ? $data['status'] : 'all';
    $method = isset($data['method']) ? $data['method'] : 'all';
    
    $query = "SELECT 
        pt.id,
        pt.order_id,
        pt.user_id,
        pt.payment_method,
        pt.amount,
        pt.transaction_id,
        pt.payment_status,
        pt.user_phone,
        pt.bank_account_number,
        pt.gateway_response,
        pt.error_message,
        pt.created_at,
        pt.completed_at,
        u.full_name as user_name,
        u.phone as user_phone_registered,
        o.total_amount as order_total,
        o.status as order_status,
        o.payment_status as order_payment_status
    FROM payment_transactions pt
    JOIN users u ON pt.user_id = u.id
    JOIN orders o ON pt.order_id = o.id
    WHERE 1=1";
    
    if ($status !== 'all') {
        $query .= " AND pt.payment_status = '" . $conn->real_escape_string($status) . "'";
    }
    if ($method !== 'all') {
        $query .= " AND pt.payment_method = '" . $conn->real_escape_string($method) . "'";
    }
    
    $query .= " ORDER BY pt.created_at DESC LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ii", $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $payments = [];
    while ($row = $result->fetch_assoc()) {
        $gateway = null;
        if ($row['gateway_response']) {
            $gateway = json_decode($row['gateway_response'], true);
        }
        
        $payments[] = [
            'id' => intval($row['id']),
            'order_id' => intval($row['order_id']),
            'user_id' => intval($row['user_id']),
            'user_name' => $row['user_name'],
            'user_phone' => $row['user_phone_registered'],
            'payment_method' => $row['payment_method'],
            'amount' => floatval($row['amount']),
            'order_total' => floatval($row['order_total']),
            'transaction_id' => $row['transaction_id'],
            'payment_status' => $row['payment_status'],
            'payment_phone' => $row['user_phone'],
            'bank_account' => $row['bank_account_number'],
            'order_status' => $row['order_status'],
            'order_payment_status' => $row['order_payment_status'],
            'error_message' => $row['error_message'],
            'is_sandbox' => $gateway ? ($gateway['sandbox'] ?? false) : false,
            'gateway_txn_id' => $gateway ? ($gateway['gateway_txn_id'] ?? $gateway['authorization_code'] ?? null) : null,
            'created_at' => $row['created_at'],
            'completed_at' => $row['completed_at']
        ];
    }
    
    $stmt->close();
    
    echo json_encode([
        "success" => true,
        "payments" => $payments,
        "total" => count($payments)
    ]);
}

// getting payment stats
function getPaymentStats() {
    global $conn;
    
    // payment method breakdown
    $method_stmt = $conn->prepare("SELECT 
        payment_method, 
        payment_status,
        COUNT(*) as count, 
        COALESCE(SUM(amount), 0) as total_amount
    FROM payment_transactions 
    GROUP BY payment_method, payment_status
    ORDER BY payment_method, payment_status");
    $method_stmt->execute();
    $method_result = $method_stmt->get_result();
    
    $method_stats = [];
    while ($row = $method_result->fetch_assoc()) {
        $method_stats[] = [
            'method' => $row['payment_method'],
            'status' => $row['payment_status'],
            'count' => intval($row['count']),
            'total_amount' => floatval($row['total_amount'])
        ];
    }
    $method_stmt->close();
    
    // todays breakdown
    $today_stmt = $conn->prepare("SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total  
    FROM payment_transactions 
    WHERE DATE(created_at) = CURDATE() AND payment_status = 'completed'
    GROUP BY payment_method");
    $today_stmt->execute();
    $today_result = $today_stmt->get_result();
    
    $today_stats = [];
    while ($row = $today_result->fetch_assoc()) {
        $today_stats[] = [
            'method' => $row['payment_method'],
            'count' => intval($row['count']),
            'total' => floatval($row['total'])
        ];
    }
    $today_stmt->close();
    
    // total counts
    $count_stmt = $conn->prepare("SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN payment_status = 'processing' THEN 1 ELSE 0 END) as processing,
        COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END), 0) as total_received
    FROM payment_transactions");
    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $counts = $count_result->fetch_assoc();
    $count_stmt->close();
    
    echo json_encode([
        "success" => true,
        "method_breakdown" => $method_stats,
        "today" => $today_stats,
        "totals" => [
            'total_transactions' => intval($counts['total_transactions']),
            'completed' => intval($counts['completed']),
            'pending' => intval($counts['pending']),
            'failed' => intval($counts['failed']),
            'processing' => intval($counts['processing']),
            'total_received' => floatval($counts['total_received'])
        ]
    ]);
}

// getting pending bank transfers
function getPendingBankTransfers() {
    global $conn;
    
    $stmt = $conn->prepare("SELECT 
        pt.id,
        pt.order_id,
        pt.user_id,
        pt.amount,
        pt.transaction_id,
        pt.bank_account_number,
        pt.user_phone,
        pt.payment_method,
        pt.gateway_response,
        pt.created_at,
        u.full_name,
        u.phone,
        o.total_amount,
        o.status as order_status
    FROM payment_transactions pt
    JOIN users u ON pt.user_id = u.id
    JOIN orders o ON pt.order_id = o.id
    WHERE pt.payment_status = 'pending' AND pt.payment_method IN ('bank', 'jazzcash')
    ORDER BY pt.created_at DESC");
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $pending = [];
    while ($row = $result->fetch_assoc()) {
        $pending[] = [
            'id' => intval($row['id']),
            'order_id' => intval($row['order_id']),
            'user_id' => intval($row['user_id']),
            'user_name' => $row['full_name'],
            'user_phone' => $row['phone'],
            'amount' => floatval($row['amount']),
            'order_total' => floatval($row['total_amount']),
            'transaction_id' => $row['transaction_id'],
            'bank_account' => $row['bank_account_number'],
            'payment_method' => $row['payment_method'],
            'order_status' => $row['order_status'],
            'created_at' => $row['created_at']
        ];
    }
    
    $stmt->close();
    
    echo json_encode([
        "success" => true,
        "pending_transfers" => $pending,
        "count" => count($pending)
    ]);
}

// verifying bank payment
function verifyBankPayment() {
    global $conn, $data;
    
    if (!isset($data['payment_transaction_id'])) {
        echo json_encode(["success" => false, "message" => "Payment transaction ID required"]);
        return;
    }
    
    $payment_id = intval($data['payment_transaction_id']);
    
    $conn->begin_transaction();
    
    try {
        // getting payment details
        $payment_stmt = $conn->prepare("SELECT order_id, user_id, amount, transaction_id FROM payment_transactions WHERE id = ? AND payment_status = 'pending'");
        $payment_stmt->bind_param("i", $payment_id);
        $payment_stmt->execute();
        $payment_result = $payment_stmt->get_result();
        
        if ($payment_result->num_rows === 0) {
            throw new Exception("Payment not found or already processed");
        }
        
        $payment = $payment_result->fetch_assoc();
        $order_id = intval($payment['order_id']);
        $puser_id = intval($payment['user_id']);
        $amount = floatval($payment['amount']);
        $txn_id = $payment['transaction_id'];
        $payment_stmt->close();
        
        // crediting business account
        $business_stmt = $conn->prepare("SELECT id, balance FROM business_accounts WHERE is_primary = 1 AND is_active = 1");
        $business_stmt->execute();
        $business_result = $business_stmt->get_result();
        
        if ($business_result->num_rows > 0) {
            $business = $business_result->fetch_assoc();
            $business_id = intval($business['id']);
            $new_balance = floatval($business['balance']) + $amount;
            
            $credit_stmt = $conn->prepare("UPDATE business_accounts SET balance = ? WHERE id = ?");
            $credit_stmt->bind_param("di", $new_balance, $business_id);
            $credit_stmt->execute();
            $credit_stmt->close();
        }
        $business_stmt->close();
        
        // updating payment status
        $update_payment = $conn->prepare("UPDATE payment_transactions SET payment_status = 'completed', completed_at = NOW(), gateway_response = ? WHERE id = ?");
        $verified_response = json_encode([
            'status' => 'verified_by_admin',
            'verified_at' => date('Y-m-d H:i:s'),
            'admin_user_id' => $data['user_id'] ?? 0
        ]);
        $update_payment->bind_param("si", $verified_response, $payment_id);
        $update_payment->execute();
        $update_payment->close();
        
        // updating order
        $update_order = $conn->prepare("UPDATE orders SET payment_status = 'paid', amount_paid = total_amount, transaction_id = ? WHERE id = ?");
        $update_order->bind_param("si", $txn_id, $order_id);
        $update_order->execute();
        $update_order->close();
        
        // recording in payments table
        $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, transaction_id) VALUES (?, ?, 'bank', ?)");
        $pay_stmt->bind_param("ids", $order_id, $amount, $txn_id);
        $pay_stmt->execute();
        $pay_stmt->close();
        
        $conn->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Payment verified! Rs. " . number_format($amount, 2) . " credited to business account.",
            "amount" => $amount,
            "order_id" => $order_id
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode([
            "success" => false,
            "message" => "Verification failed: " . $e->getMessage()
        ]);
    }
}

// rejecting bank payment
function rejectBankPayment() {
    global $conn, $data;
    
    if (!isset($data['payment_transaction_id'])) {
        echo json_encode(["success" => false, "message" => "Payment transaction ID required"]);
        return;
    }
    
    $payment_id = intval($data['payment_transaction_id']);
    $reason = isset($data['reason']) ? $data['reason'] : 'Rejected by admin';
    
    $conn->begin_transaction();
    
    try {
        $payment_stmt = $conn->prepare("SELECT order_id, amount FROM payment_transactions WHERE id = ? AND payment_status = 'pending'");
        $payment_stmt->bind_param("i", $payment_id);
        $payment_stmt->execute();
        $payment_result = $payment_stmt->get_result();
        
        if ($payment_result->num_rows === 0) {
            throw new Exception("Payment not found or already processed");
        }
        
        $payment = $payment_result->fetch_assoc();
        $order_id = intval($payment['order_id']);
        $amount = floatval($payment['amount']);
        $payment_stmt->close();
        
        // marking as failed
        $update_payment = $conn->prepare("UPDATE payment_transactions SET payment_status = 'failed', error_message = ?, completed_at = NOW() WHERE id = ?");
        $update_payment->bind_param("si", $reason, $payment_id);
        $update_payment->execute();
        $update_payment->close();
        
        // reverting order to cod
        $update_order = $conn->prepare("UPDATE orders SET payment_status = 'pending', payment_method = 'cod' WHERE id = ?");
        $update_order->bind_param("i", $order_id);
        $update_order->execute();
        $update_order->close();
        
        $conn->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Payment rejected. Order #$order_id reverted to cash payment.",
            "order_id" => $order_id
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode([
            "success" => false,
            "message" => "Rejection failed: " . $e->getMessage()
        ]);
    }
}
?>
