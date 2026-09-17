<?php
// get_user_orders.php - Optimized Batch Query
include __DIR__ . '/../../config/connect.php';

if (!ob_start("ob_gzhandler")) ob_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
$payload = require_auth();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $user_id = (int)$payload['id'];

    if (!$user_id) {
        echo json_encode(["success" => false, "message" => "Missing user_id in token"]);
        exit;
    }

    // 1. Fetch user orders with single JOIN for user details (Exclude child split batches)
    $sql = "SELECT o.*, 
                   COALESCE(u.full_name, 'Unknown Customer') as customer_name, 
                   COALESCE(u.phone, 'No Phone') as customer_phone 
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.user_id = ? 
              AND (o.parent_order_id IS NULL OR o.parent_order_id = 0)
            ORDER BY o.created_at DESC";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $ordersMap = [];
    $orderIds = [];

    while ($row = $result->fetch_assoc()) {
        $id = (int)$row['id'];
        $row['items'] = [];
        $row['total'] = $row['total_amount'];
        $row['payment_reject_reason'] = null;
        $row['payment_reject_date'] = null;
        $row['is_split'] = false;
        $row['batches'] = [];
        $ordersMap[$id] = $row;
        $orderIds[] = $id;
    }
    $stmt->close();

    if (!empty($orderIds)) {
        $idList = implode(',', array_map('intval', $orderIds));
        
        // 2. Batch fetch ALL items for ALL user orders
        $itemSql = "SELECT oi.order_id, oi.quantity, oi.product_id, oi.price_at_purchase, 
                           oi.is_cleaning, oi.is_grinding, oi.is_weight_pending, p.name as prod_name
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id IN ($idList)";
        $itemRes = $conn->query($itemSql);

        while ($i = $itemRes->fetch_assoc()) {
            $orderId = (int)$i['order_id'];
            $i['name'] = $i['prod_name'] ?? "Item #{$i['product_id']}";
            if (isset($ordersMap[$orderId])) {
                $ordersMap[$orderId]['items'][] = $i;
            }
        }

        // 3. Batch fetch payment rejection logs if any
        try {
            $paySql = "SELECT order_id, error_message, updated_at 
                       FROM payment_transactions 
                       WHERE order_id IN ($idList) AND payment_status = 'failed'";
            $payRes = $conn->query($paySql);
            if ($payRes) {
                while ($p = $payRes->fetch_assoc()) {
                    $orderId = (int)$p['order_id'];
                    if (isset($ordersMap[$orderId])) {
                        $ordersMap[$orderId]['payment_reject_reason'] = $p['error_message'];
                        $ordersMap[$orderId]['payment_reject_date'] = $p['updated_at'];
                    }
                }
            }
        } catch (Throwable $t) {
            // Ignore if table initializing
        }

        // 4. Batch fetch child split batches for parent orders
        try {
            $batchSql = "SELECT id, parent_order_id, status, batch_index, total_batches, assigned_date, total_weight_kg, total_amount 
                         FROM orders 
                         WHERE parent_order_id IN ($idList) 
                         ORDER BY batch_index ASC";
            $batchRes = $conn->query($batchSql);
            if ($batchRes) {
                $batchesByParent = [];
                while ($b = $batchRes->fetch_assoc()) {
                    $pId = (int)$b['parent_order_id'];
                    $batchesByParent[$pId][] = $b;
                }

                foreach ($ordersMap as $id => &$oRef) {
                    if (isset($batchesByParent[$id])) {
                        $orderBatches = $batchesByParent[$id];
                        $oRef['is_split'] = true;
                        $oRef['batches'] = $orderBatches;

                        // Reconcile status if original status is 'split_parent'
                        if (strtolower(trim($oRef['status'])) === 'split_parent') {
                            $statuses = array_map(fn($b) => strtolower(trim($b['status'])), $orderBatches);
                            $allCompleted = count(array_filter($statuses, fn($s) => in_array($s, ['completed', 'delivered']))) === count($statuses);
                            $allReady = count(array_filter($statuses, fn($s) => in_array($s, ['ready', 'batch_ready', 'completed', 'delivered']))) === count($statuses);

                            if ($allCompleted) {
                                $oRef['status'] = 'completed';
                            } else if ($allReady) {
                                $oRef['status'] = 'ready';
                            } else {
                                $oRef['status'] = 'processing';
                            }
                        }
                    }
                }
            }
        } catch (Throwable $t) {
            // Ignore if column missing
        }
    }

    $orders = array_values($ordersMap);
    echo json_encode(["success" => true, "orders" => $orders]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
