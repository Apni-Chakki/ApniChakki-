<?php
// order scheduling algorithm - auto assigns orders to today/tomorrow with ETA calculation
// processing speed: 2 minutes per kg

/**
 * fetches shop operational hours from store_settings table
 */
function getOperationalHours($conn) {
    $opening = '09:00';
    $closing = '20:00';
    
    $sql = "SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN ('openingTime', 'closingTime')";
    $result = $conn->query($sql);
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            if ($row['setting_key'] === 'openingTime') {
                $opening = $row['setting_value'];
            }
            if ($row['setting_key'] === 'closingTime') {
                $closing = $row['setting_value'];
            }
        }
    }
    
    return ['opening' => $opening, 'closing' => $closing];
}

/**
 * calculates total weight of an order from its items
 */
function calculateOrderWeight($conn, $order_id) {
    $total_weight = 0;
    
    $sql = "SELECT oi.quantity, p.unit FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        // only count weight-based items (kg), services don't count
        if ($row['unit'] === 'kg' || $row['unit'] === 'g') {
            $qty = floatval($row['quantity']);
            if ($row['unit'] === 'g') {
                $qty = $qty / 1000; // convert grams to kg
            }
            $total_weight += $qty;
        }
    }
    $stmt->close();
    
    // minimum 1 kg if there are items but weight is 0 (for services etc)
    if ($total_weight == 0) {
        $total_weight = 1;
    }
    
    return $total_weight;
}

/**
 * gets the last scheduled order's completion time for a given date
 * this tells us when the next order can start
 */
function getLastCompletionTime($conn, $date) {
    $sql = "SELECT estimated_completion_time FROM orders 
            WHERE assigned_date = ? 
            AND status NOT IN ('cancelled', 'completed', 'ready', 'out-for-delivery')
            ORDER BY estimated_completion_time DESC 
            LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $date);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $stmt->close();
        return $row['estimated_completion_time'];
    }
    $stmt->close();
    return null;
}

/**
 * gets the next queue position for a given date
 */
function getNextQueuePosition($conn, $date) {
    $sql = "SELECT MAX(queue_position) as max_pos FROM orders 
            WHERE assigned_date = ? 
            AND status NOT IN ('cancelled', 'completed')";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $date);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $stmt->close();
        return intval($row['max_pos']) + 1;
    }
    $stmt->close();
    return 1;
}

/**
 * MAIN SCHEDULING FUNCTION
 * called after an order is placed to calculate ETA and assign date
 */
function scheduleOrder($conn, $order_id) {
    // step 1: get operational hours from db
    $hours = getOperationalHours($conn);
    $opening_time = $hours['opening'];
    $closing_time = $hours['closing'];
    
    // step 2: calculate order weight and processing time
    $total_weight = calculateOrderWeight($conn, $order_id);
    $processing_minutes = ceil($total_weight * 2); // 2 min per kg
    
    // step 3: determine today's date and current time
    $today = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    $now = date('H:i:s');
    
    // step 4: figure out when this order can start
    $last_completion = getLastCompletionTime($conn, $today);
    
    if ($last_completion) {
        // start after the last order finishes
        $start_time = new DateTime($last_completion);
    } else {
        // no orders today, start from opening time or now (whichever is later)
        $opening_dt = new DateTime($today . ' ' . $opening_time . ':00');
        $now_dt = new DateTime();
        $start_time = ($now_dt > $opening_dt) ? $now_dt : $opening_dt;
    }
    
    // step 5: calculate estimated completion time
    $eta = clone $start_time;
    $eta->modify("+{$processing_minutes} minutes");
    
    // step 6: check if order fits within today's closing time
    $closing_dt = new DateTime($today . ' ' . $closing_time . ':00');
    
    if ($eta <= $closing_dt) {
        // order fits today
        $assigned_date = $today;
        $estimated_completion = $eta->format('Y-m-d H:i:s');
        $status = 'pending';
    } else {
        // doesn't fit today, push to tomorrow
        $assigned_date = $tomorrow;
        
        // recalculate ETA from tomorrow's opening time
        $tomorrow_last = getLastCompletionTime($conn, $tomorrow);
        
        if ($tomorrow_last) {
            $tomorrow_start = new DateTime($tomorrow_last);
        } else {
            $tomorrow_start = new DateTime($tomorrow . ' ' . $opening_time . ':00');
        }
        
        $tomorrow_eta = clone $tomorrow_start;
        $tomorrow_eta->modify("+{$processing_minutes} minutes");
        $estimated_completion = $tomorrow_eta->format('Y-m-d H:i:s');
        $status = 'pending';
    }
    
    // step 7: get queue position
    $queue_position = getNextQueuePosition($conn, $assigned_date);
    
    // step 8: update the order in db
    $sql = "UPDATE orders SET 
            estimated_completion_time = ?,
            assigned_date = ?,
            total_weight_kg = ?,
            processing_time_minutes = ?,
            queue_position = ?,
            status = ?
            WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssdissi", 
        $estimated_completion, 
        $assigned_date, 
        $total_weight, 
        $processing_minutes, 
        $queue_position,
        $status,
        $order_id
    );
    $stmt->execute();
    $stmt->close();
    
    return [
        'order_id' => $order_id,
        'assigned_date' => $assigned_date,
        'estimated_completion_time' => $estimated_completion,
        'total_weight_kg' => $total_weight,
        'processing_time_minutes' => $processing_minutes,
        'queue_position' => $queue_position,
        'status' => $status
    ];
}

/**
 * recalculates ETAs for all pending orders on a specific date
 * called after an override to fix the queue
 */
function recalculateSchedule($conn, $date) {
    $hours = getOperationalHours($conn);
    $opening_time = $hours['opening'];
    
    // get all active orders for this date sorted by queue position
    $sql = "SELECT id, total_weight_kg, processing_time_minutes FROM orders 
            WHERE assigned_date = ? 
            AND status NOT IN ('cancelled', 'completed', 'ready', 'out-for-delivery')
            ORDER BY queue_position ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $date);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }
    $stmt->close();
    
    // start from opening time or current time
    $now = new DateTime();
    $opening_dt = new DateTime($date . ' ' . $opening_time . ':00');
    $current_time = ($date === date('Y-m-d') && $now > $opening_dt) ? $now : $opening_dt;
    
    // recalculate each order's ETA
    $position = 1;
    foreach ($orders as $order) {
        $processing_mins = intval($order['processing_time_minutes']);
        if ($processing_mins <= 0) {
            $processing_mins = ceil(floatval($order['total_weight_kg']) * 2);
        }
        
        $eta = clone $current_time;
        $eta->modify("+{$processing_mins} minutes");
        
        $eta_str = $eta->format('Y-m-d H:i:s');
        
        $update = $conn->prepare("UPDATE orders SET estimated_completion_time = ?, queue_position = ? WHERE id = ?");
        $update->bind_param("sii", $eta_str, $position, $order['id']);
        $update->execute();
        $update->close();
        
        // next order starts when this one finishes
        $current_time = clone $eta;
        $position++;
    }
    
    return count($orders);
}

/**
 * gets capacity info for a specific date
 * returns total minutes used, remaining, and percentage
 */
function getCapacityInfo($conn, $date) {
    $hours = getOperationalHours($conn);
    
    // total available minutes in a day
    $open = new DateTime($date . ' ' . $hours['opening'] . ':00');
    $close = new DateTime($date . ' ' . $hours['closing'] . ':00');
    $total_minutes = ($close->getTimestamp() - $open->getTimestamp()) / 60;
    
    // total minutes already booked
    $sql = "SELECT COALESCE(SUM(processing_time_minutes), 0) as booked 
            FROM orders 
            WHERE assigned_date = ? 
            AND status NOT IN ('cancelled', 'completed', 'ready', 'out-for-delivery')";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $date);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $booked_minutes = intval($row['booked']);
    $stmt->close();
    
    $remaining_minutes = max(0, $total_minutes - $booked_minutes);
    $percentage_used = $total_minutes > 0 ? round(($booked_minutes / $total_minutes) * 100, 1) : 0;
    
    return [
        'date' => $date,
        'opening_time' => $hours['opening'],
        'closing_time' => $hours['closing'],
        'total_minutes' => $total_minutes,
        'booked_minutes' => $booked_minutes,
        'remaining_minutes' => $remaining_minutes,
        'percentage_used' => $percentage_used,
        'can_accept_more' => $remaining_minutes > 0
    ];
}
