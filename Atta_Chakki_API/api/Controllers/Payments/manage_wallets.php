<?php
/**
 * Manage business wallets and payment verifications
 * API Endpoint: POST /manage_wallets.php
 */

require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

try {
    switch ($action) {
        case 'get_balance':
            $sql = "SELECT account_name, bank_name, account_number, balance 
                    FROM business_accounts 
                    WHERE is_primary = 1 LIMIT 1";
            $result = $conn->query($sql);
            if ($row = $result->fetch_assoc()) {
                // Also get some stats for the cards
                $today = date('Y-m-d');
                $today_res = $conn->query("SELECT SUM(amount) as total FROM payment_transactions WHERE DATE(completed_at) = '$today' AND payment_status = 'completed'");
                $today_row = $today_res->fetch_assoc();
                
                $total_online_res = $conn->query("SELECT SUM(amount) as total FROM payment_transactions WHERE payment_status = 'completed' AND payment_method != 'cod'");
                $total_online_row = $total_online_res->fetch_assoc();
                
                $pending_res = $conn->query("SELECT COUNT(*) as count FROM payment_transactions WHERE payment_status = 'pending'");
                $pending_row = $pending_res->fetch_assoc();

                echo json_encode([
                    'success' => true,
                    'account_name' => $row['account_name'],
                    'bank_name' => $row['bank_name'],
                    'account_number' => $row['account_number'],
                    'balance' => (float)$row['balance'],
                    'today_received' => (float)($today_row['total'] ?? 0),
                    'total_online_received' => (float)($total_online_row['total'] ?? 0),
                    'pending_verification_count' => (int)($pending_row['count'] ?? 0)
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Primary business account not found']);
            }
            break;

        case 'get_payment_history':
            $status = $input['status'] ?? 'all';
            $method = $input['method'] ?? 'all';
            $limit = (int)($input['limit'] ?? 100);
            
            $where = ["1=1"];
            $params = [];
            $types = "";
            
            if ($status !== 'all') {
                $where[] = "payment_status = ?";
                $params[] = $status;
                $types .= "s";
            }
            if ($method !== 'all') {
                $where[] = "payment_method = ?";
                $params[] = $method;
                $types .= "s";
            }
            
            $sql = "SELECT pt.*, u.full_name as user_name 
                    FROM payment_transactions pt
                    LEFT JOIN users u ON pt.user_id = u.id
                    WHERE " . implode(" AND ", $where) . "
                    ORDER BY pt.created_at DESC LIMIT ?";
            
            $stmt = $conn->prepare($sql);
            $params[] = $limit;
            $types .= "i";
            
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $payments = [];
            while ($row = $result->fetch_assoc()) {
                $payments[] = $row;
            }
            echo json_encode(['success' => true, 'payments' => $payments]);
            break;

        case 'get_pending_verification':
            $sql = "SELECT pt.*, u.full_name as user_name 
                    FROM payment_transactions pt
                    LEFT JOIN users u ON pt.user_id = u.id
                    WHERE pt.payment_status = 'pending'
                    ORDER BY pt.created_at DESC";
            $result = $conn->query($sql);
            $pending = [];
            while ($row = $result->fetch_assoc()) {
                $pending[] = $row;
            }
            echo json_encode(['success' => true, 'pending_transfers' => $pending]);
            break;

        case 'get_payment_stats':
            $sql = "SELECT payment_status, COUNT(*) as count, SUM(amount) as total 
                    FROM payment_transactions 
                    GROUP BY payment_status";
            $result = $conn->query($sql);
            $stats = ['completed' => 0, 'pending' => 0, 'processing' => 0, 'failed' => 0, 'total_transactions' => 0];
            while ($row = $result->fetch_assoc()) {
                $status = $row['payment_status'];
                $stats[$status] = (int)$row['count'];
                $stats['total_transactions'] += (int)$row['count'];
            }
            echo json_encode(['success' => true, 'totals' => $stats]);
            break;

        case 'verify_bank_payment':
            $pt_id = $input['payment_transaction_id'] ?? 0;
            if (!$pt_id) throw new Exception("Transaction ID required");
            
            $conn->begin_transaction();
            
            // Get transaction details
            $stmt = $conn->prepare("SELECT amount, payment_status FROM payment_transactions WHERE id = ? FOR UPDATE");
            $stmt->bind_param("i", $pt_id);
            $stmt->execute();
            $pt = $stmt->get_result()->fetch_assoc();
            
            if (!$pt) throw new Exception("Transaction not found");
            if ($pt['payment_status'] !== 'pending') throw new Exception("Transaction already processed");
            
            $amount = $pt['amount'];
            
            // 1. Update transaction status
            $stmt = $conn->prepare("UPDATE payment_transactions SET payment_status = 'completed', completed_at = NOW() WHERE id = ?");
            $stmt->bind_param("i", $pt_id);
            $stmt->execute();
            
            // 2. Update business account balance
            $stmt = $conn->prepare("UPDATE business_accounts SET balance = balance + ? WHERE is_primary = 1");
            $stmt->bind_param("d", $amount);
            $stmt->execute();
            
            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Payment verified successfully']);
            break;

        case 'reject_bank_payment':
            $pt_id = $input['payment_transaction_id'] ?? 0;
            $reason = $input['reason'] ?? 'Rejected by admin';
            if (!$pt_id) throw new Exception("Transaction ID required");
            
            $stmt = $conn->prepare("UPDATE payment_transactions SET payment_status = 'failed', error_message = ? WHERE id = ?");
            $stmt->bind_param("si", $reason, $pt_id);
            $stmt->execute();
            
            echo json_encode(['success' => true, 'message' => 'Payment rejected']);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
            break;
    }
} catch (Exception $e) {
    if ($conn->in_transaction) $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
