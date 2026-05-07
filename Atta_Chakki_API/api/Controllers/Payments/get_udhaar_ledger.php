<?php
/**
 * Get Udhaar Ledger
 * Calculates outstanding debts for all customers
 */

require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

try {
    // 1. Get all customers with outstanding balance
    $sql = "SELECT 
                u.id as user_id,
                u.full_name as name, 
                u.phone, 
                COUNT(o.id) as orderCount, 
                MAX(o.created_at) as lastOrderDate, 
                SUM(o.total_amount - o.amount_paid) as totalDebt
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.payment_status IN ('pending', 'partial') AND o.status != 'cancelled'
            GROUP BY u.id
            HAVING totalDebt > 0
            ORDER BY totalDebt DESC";
            
    $result = $conn->query($sql);
    
    $ledgers = [];
    $totalOutstanding = 0;
    
    while ($row = $result->fetch_assoc()) {
        $user_id = (int)$row['user_id'];
        
        // Get individual outstanding orders for this customer
        $orderSql = "SELECT 
                        id as order_id, 
                        created_at, 
                        total_amount as total, 
                        amount_paid, 
                        (total_amount - amount_paid) as outstanding, 
                        payment_status 
                    FROM orders 
                    WHERE user_id = $user_id 
                    AND payment_status IN ('pending', 'partial') 
                    AND status != 'cancelled'
                    ORDER BY created_at ASC";
        
        $orderRes = $conn->query($orderSql);
        $orders = [];
        while ($oRow = $orderRes->fetch_assoc()) {
            $orders[] = $oRow;
        }
        
        $row['orders'] = $orders;
        $row['totalDebt'] = (float)$row['totalDebt'];
        $row['orderCount'] = (int)$row['orderCount'];
        
        $ledgers[] = $row;
        $totalOutstanding += $row['totalDebt'];
    }

    echo json_encode([
        'success' => true,
        'ledgers' => $ledgers,
        'totalOutstanding' => $totalOutstanding
    ]);

} catch (Exception $e) {
    error_log('Get Udhaar Ledger Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch ledger: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
