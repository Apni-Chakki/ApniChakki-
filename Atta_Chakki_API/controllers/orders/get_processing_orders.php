<?php
// get today's processing orders with scheduling info
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/order_scheduler.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();


mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $today = date('Y-m-d');
    
    // get orders that are processing/pending for today (by assigned_date or by status for backward compat)
    // Exclude split_parent orders (they are logical containers, not real work items)
    $sql = "SELECT * FROM orders 
            WHERE (
                (assigned_date IS NULL OR assigned_date = '' OR assigned_date <= ?)
                AND TRIM(LOWER(status)) IN ('pending', 'processing')
                AND TRIM(LOWER(status)) != 'split_parent'
            )
            ORDER BY queue_position ASC, created_at ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $result = $stmt->get_result();
    $orders = [];

    while($row = $result->fetch_assoc()) {
        $user_id = $row['user_id'];
        if ($user_id > 0) {
            $user_res = $conn->query("SELECT full_name, phone FROM users WHERE id = '$user_id'");
            if ($user_row = $user_res->fetch_assoc()) {
                $row['customer_name'] = $user_row['full_name'];
                $row['customer_phone'] = $user_row['phone'];
            } else {
                $row['customer_name'] = "Unknown Customer";
                $row['customer_phone'] = "No Phone";
            }
        } else {
            $row['customer_name'] = "Unknown Customer";
            $row['customer_phone'] = "Unknown";
        }

        $order_id = $row['id'];
        $items = [];
        $has_trip_item = false;
        $item_res = $conn->query("SELECT id, quantity, product_id, price_at_purchase, is_cleaning, is_grinding FROM order_items WHERE order_id = '$order_id'");
        while($i = $item_res->fetch_assoc()) {
             $order_item_id = $i['id'];
             // Fetch customizations for custom mixes / custom options
             $cust_res = $conn->query("SELECT option_name, option_price FROM order_item_customizations WHERE order_item_id = '$order_item_id'");
             $customizations = [];
             while ($cust_row = $cust_res->fetch_assoc()) {
                 $customizations[] = $cust_row;
             }
             $i['customizations'] = $customizations;

             $pid = $i['product_id'];
             $prod_res = $conn->query("SELECT name, unit FROM products WHERE id = '$pid'");
             if ($p = $prod_res->fetch_assoc()) {
                 $i['name'] = $p['name'];
                 $rawUnit = strtolower(trim($p['unit']));
                 // Agar unit 'trip' tha lekin weight confirm ho gayi (price_at_purchase > 0) to 'kg' dikhao
                 if ($rawUnit === 'trip' && floatval($i['price_at_purchase']) > 0) {
                     $i['unit'] = 'kg';
                 } else {
                     $i['unit'] = $p['unit'];
                 }
                 if ($rawUnit === 'trip') {
                     $has_trip_item = true;
                 }
             } else {
                 $i['name'] = "Item #$pid";
                 $i['unit'] = 'kg';
             }
             $items[] = $i;
        }
        
        // If this is a pickup (trip) order, only include it in processing list when
        // it has been moved to admin (awaiting weight) or already scheduled/pending/processing
        if ($has_trip_item) {
            $st = strtolower(trim($row['status']));
            if (!in_array($st, ['awaiting_weight','pending','processing'])) {
                continue; // skip pickup requests that are still in initial pickup state
            }
        }
        
        $row['items'] = $items;
        $row['total'] = $row['total_amount'];
        
        // Flag carried-forward orders (created before today)
        $created_date = date('Y-m-d', strtotime($row['created_at']));
        $row['is_carried_forward'] = ($created_date < $today) ? true : false;

        // ── Split batch info ────────────────────────────────────────────────
        // Check if this order is part of a split (has a parent_order_id)
        $row['is_split_batch']    = false;
        $row['all_siblings_ready'] = false;
        $row['siblings']           = [];

        $parentColChk = $conn->query("SHOW COLUMNS FROM orders LIKE 'parent_order_id'");
        if ($parentColChk && $parentColChk->num_rows > 0) {
            $parentId = intval($row['parent_order_id'] ?? 0);
            if ($parentId > 0) {
                $row['is_split_batch'] = true;
                // Fetch all siblings (same parent)
                $sibStmt = $conn->prepare(
                    "SELECT id, status, batch_index, assigned_date, total_weight_kg FROM orders WHERE parent_order_id = ? ORDER BY batch_index ASC"
                );
                $sibStmt->bind_param("i", $parentId);
                $sibStmt->execute();
                $sibRes = $sibStmt->get_result();
                $siblings = [];
                while ($sib = $sibRes->fetch_assoc()) {
                    $siblings[] = $sib;
                }
                $sibStmt->close();
                $row['siblings'] = $siblings;

                // all_siblings_ready = all OTHER children have status 'ready' or 'batch_ready'
                $notReady = array_filter($siblings, fn($s) => $s['id'] != $row['id'] && !in_array($s['status'], ['ready', 'batch_ready']));
                $row['all_siblings_ready'] = (count($siblings) > 0 && count($notReady) === 0);
            }
        }
        // ────────────────────────────────────────────────────────────────────

        $orders[] = $row;
    }
    $stmt->close();
    
    // get capacity info for today
    $capacity = getCapacityInfo($conn, $today);

    echo json_encode([
        "success" => true, 
        "orders" => $orders,
        "capacity" => $capacity
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
