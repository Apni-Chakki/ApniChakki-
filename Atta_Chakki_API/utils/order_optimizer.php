<?php
// c:\xampp\htdocs\Atta_Chakki_API\utils\order_optimizer.php

function attach_relations_to_orders($conn, $base_orders) {
    if (empty($base_orders)) return $base_orders;

    $order_ids = array_keys($base_orders);
    $order_ids_str = implode(',', array_map('intval', $order_ids));

    // Initialize default fields
    foreach ($order_ids as $id) {
        $base_orders[$id]['items'] = [];
        $base_orders[$id]['total'] = $base_orders[$id]['total_amount'] ?? 0;
        
        $base_orders[$id]['is_split_batch'] = false;
        $base_orders[$id]['all_siblings_ready'] = false;
        $base_orders[$id]['siblings'] = [];
    }

    // 1. Fetch Order Items + Products
    $items_sql = "
        SELECT 
            oi.id as order_item_id, oi.order_id, oi.quantity, oi.product_id, 
            oi.price_at_purchase, oi.original_price, oi.is_cleaning, oi.is_grinding, oi.is_weight_pending,
            p.name, p.unit, p.price
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id IN ($order_ids_str)
    ";
    
    $items_res = $conn->query($items_sql);
    $items_by_id = [];
    
    while ($row = $items_res->fetch_assoc()) {
        $oid = $row['order_id'];
        $item_id = $row['order_item_id'];
        
        $item = [
            'id' => $item_id,
            'quantity' => $row['quantity'],
            'product_id' => $row['product_id'],
            'price_at_purchase' => floatval($row['price_at_purchase'] ?? 0),
            'original_price' => floatval($row['original_price'] ?? 0),
            'is_cleaning' => (int)($row['is_cleaning'] ?? 0),
            'is_grinding' => (int)($row['is_grinding'] ?? 0),
            'is_weight_pending' => (int)($row['is_weight_pending'] ?? 0),
            'customizations' => [],
            'is_rental' => 0
        ];
        
        if ($row['name']) {
            $item['name'] = $row['name'];
            $rawUnit = strtolower(trim($row['unit']));
            if ($rawUnit === 'trip' && floatval($item['price_at_purchase']) > 0) {
                $item['unit'] = 'kg';
            } else {
                $item['unit'] = $row['unit'];
            }
            $item['price'] = $row['price'];
        } else {
            $item['name'] = "Item #" . $row['product_id'];
            $item['unit'] = 'kg';
        }
        
        $items_by_id[$item_id] = $item;
        $base_orders[$oid]['items'][$item_id] =& $items_by_id[$item_id];
    }

    // 2. Fetch Customizations
    if (!empty($items_by_id)) {
        $item_ids_str = implode(',', array_map('intval', array_keys($items_by_id)));
        $cust_sql = "SELECT order_item_id, option_name, option_price FROM order_item_customizations WHERE order_item_id IN ($item_ids_str)";
        $cust_res = $conn->query($cust_sql);
        while ($c = $cust_res->fetch_assoc()) {
            $items_by_id[$c['order_item_id']]['customizations'][] = [
                'option_name' => $c['option_name'],
                'option_price' => floatval($c['option_price'] ?? 0)
            ];
        }
    }

    // 3. Fetch Rentals
    $rental_sql = "SELECT order_id, product_id, rental_start_date, rental_end_date, rental_days, rental_price_per_day, security_deposit, late_penalty_per_day, status as rental_status FROM rentals WHERE order_id IN ($order_ids_str)";
    $rental_res = $conn->query($rental_sql);
    while ($r = $rental_res->fetch_assoc()) {
        $oid = $r['order_id'];
        $pid = $r['product_id'];
        
        foreach ($base_orders[$oid]['items'] as &$item) {
            if ($item['product_id'] == $pid) {
                $item['is_rental'] = 1;
                $item['rental_start_date'] = $r['rental_start_date'];
                $item['rental_end_date'] = $r['rental_end_date'];
                $item['rental_days'] = $r['rental_days'];
                $item['rental_price_per_day'] = floatval($r['rental_price_per_day']);
                $item['security_deposit'] = floatval($r['security_deposit']);
                $item['late_penalty_per_day'] = floatval($r['late_penalty_per_day']);
                $item['rental_status'] = $r['rental_status'];
                break;
            }
        }
    }

    // 4. Fetch Siblings (for split batches)
    $parentColChk = $conn->query("SHOW COLUMNS FROM orders LIKE 'parent_order_id'");
    if ($parentColChk && $parentColChk->num_rows > 0) {
        $parent_ids = [];
        foreach ($base_orders as $oid => $o) {
            $pid = intval($o['parent_order_id'] ?? 0);
            if ($pid > 0) {
                $parent_ids[$pid] = true;
                $base_orders[$oid]['is_split_batch'] = true;
            }
        }
        
        if (!empty($parent_ids)) {
            $pids_str = implode(',', array_keys($parent_ids));
            $sib_sql = "SELECT id, parent_order_id, status, batch_index, assigned_date, total_weight_kg FROM orders WHERE parent_order_id IN ($pids_str) ORDER BY batch_index ASC";
            $sib_res = $conn->query($sib_sql);
            $siblings_by_parent = [];
            while ($s = $sib_res->fetch_assoc()) {
                $siblings_by_parent[$s['parent_order_id']][] = $s;
            }
            
            foreach ($base_orders as $oid => &$o) {
                $pid = intval($o['parent_order_id'] ?? 0);
                if ($pid > 0 && isset($siblings_by_parent[$pid])) {
                    $sibs = $siblings_by_parent[$pid];
                    $o['siblings'] = $sibs;
                    
                    $notReady = array_filter($sibs, fn($s) => $s['id'] != $oid && !in_array(strtolower(trim($s['status'])), ['ready', 'batch_ready']));
                    $o['all_siblings_ready'] = (count($sibs) > 0 && count($notReady) === 0);
                }
            }
        }
    }
    
    // Clean up items map references
    foreach ($base_orders as $oid => &$o) {
        $o['items'] = array_values($o['items']);
    }

    return $base_orders;
}
?>
