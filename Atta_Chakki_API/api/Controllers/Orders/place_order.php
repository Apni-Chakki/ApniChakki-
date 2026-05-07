<?php
// order place karne wali api
require_once dirname(__DIR__, 2) . '/Config/cors.php';
include dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"));

if(isset($data->user_id) && isset($data->cart_items)) {
    $user_id = intval($data->user_id);
    $address = isset($data->address) ? $data->address : "No address provided";
    $cart_items = $data->cart_items;
    $payment_method = isset($data->payment_method) ? $data->payment_method : 'cash';
    $payment_status = isset($data->payment_status) ? $data->payment_status : 'pending';
    $transaction_id = isset($data->transaction_id) ? $data->transaction_id : null;
    $amount_paid_input = isset($data->amount_paid) ? floatval($data->amount_paid) : 0;
    
    $is_pickup_request = isset($data->is_pickup_request) ? filter_var($data->is_pickup_request, FILTER_VALIDATE_BOOLEAN) : false;
    $is_kg_order = isset($data->is_kg_order) ? filter_var($data->is_kg_order, FILTER_VALIDATE_BOOLEAN) : false;
    $order_type = isset($data->order_type) ? $data->order_type : 'delivery';
    
    // payment methods set ho rahe hain yahan
    $method_map = [
        'cash' => 'cod',
        'cod' => 'cod', 
        'jazzcash' => 'online',
        'easypaisa' => 'online',
        'card' => 'online',
        'bank' => 'bank',
        'online' => 'online'
    ];
    $db_payment_method = $method_map[$payment_method] ?? 'cod';
    
    $total_amount = 0;
    $valid_items = [];
    $has_trip_item = false;
    $has_pending_weight_item = false;
    $non_trip_total = 0.0;

    // total calculate ho raha hai products ka
    foreach($cart_items as $item) {
        $pid = $item->id;
        $query = $conn->prepare("SELECT price, unit, is_grinding_service, cleaning_price, grinding_price FROM products WHERE id = ?");
        $query->bind_param("i", $pid);
        $query->execute();
        $res = $query->get_result();
        
        if ($row = $res->fetch_assoc()) {
            $unit = isset($row['unit']) ? strtolower(trim($row['unit'])) : '';
            $qty = floatval($item->qty);
            $is_grinding_service = (int)$row['is_grinding_service'];
            $is_cleaning = isset($item->is_cleaning) ? (int)$item->is_cleaning : 0;
            $is_grinding = isset($item->is_grinding) ? (int)$item->is_grinding : 0;
            $item_is_pending = isset($item->is_weight_pending) ? (int)$item->is_weight_pending : 0;

            // Dynamic customizations from frontend
            $selected_customizations = isset($item->selected_customizations) ? $item->selected_customizations : [];

            if ($item_is_pending) $has_pending_weight_item = true;

            if (!empty($selected_customizations)) {
                // Dynamic pricing: sum only selected customization prices
                $price = 0;
                foreach ($selected_customizations as $sc) {
                    $price += floatval($sc->option_price ?? 0);
                }
                if ($price <= 0) $price = floatval($row['price']);
            } else if ($is_grinding_service) {
                // Backward compatible: hardcoded cleaning/grinding
                $price = 0;
                if ($is_cleaning) $price += floatval($row['cleaning_price']);
                if ($is_grinding) $price += floatval($row['grinding_price']);
                if ($price <= 0 && !$is_cleaning && !$is_grinding) $price = floatval($row['price']);
            } else {
                $price = floatval($row['price']);
            }

            if ($unit === 'trip') {
                $has_trip_item = true;
                $has_pending_weight_item = true;
                $valid_items[] = [
                    "product_id" => $pid,
                    "quantity" => $qty,
                    "price" => $price,
                    "unit" => $unit,
                    "is_cleaning" => $is_cleaning,
                    "is_grinding" => $is_grinding,
                    "is_weight_pending" => 1,
                    "selected_customizations" => $selected_customizations
                ];
            } else {
                if (!$item_is_pending) {
                    $non_trip_total += ($price * $qty);
                }
                $valid_items[] = [
                    "product_id" => $pid,
                    "quantity" => $qty,
                    "price" => $price,
                    "unit" => $unit,
                    "is_cleaning" => $is_cleaning,
                    "is_grinding" => $is_grinding,
                    "is_weight_pending" => $item_is_pending,
                    "selected_customizations" => $selected_customizations
                ];
            }
        }
        $query->close();
    }

    // trip items k liye logic
    $total_amount = $non_trip_total;

    // trip ya pickup flow check ho raha hai
    if ($has_trip_item) {
        $total_amount = $non_trip_total; // keep what we have
        $is_pickup_request = true;
        $is_kg_order = false;
    } else if ($has_pending_weight_item) {
        $is_pickup_request = true;
        $is_kg_order = false;
    } else if ($is_kg_order || !$is_pickup_request) {
        // Kg order: weight is known, price is calculated immediately
        // total_amount already has the correct non-trip total
        $is_pickup_request = false;
        $is_kg_order = true;
    }

    if(empty($valid_items)) {
        echo json_encode(["success" => false, "message" => "No valid items found"]);
        exit();
    }

    // payment status kya hoga wo dekh rahe han yahan
    if ($total_amount <= 0 && $has_pending_weight_item) {
        // when total is zero but items are pending, it stays pending until weight is added
        $final_payment_status = 'pending';
        $amount_paid_input = 0;
    } else {
        if ($amount_paid_input >= $total_amount) {
            // If there are pending items, even paying full "current" total makes it partial
            $final_payment_status = $has_pending_weight_item ? 'partial' : 'paid';
            $amount_paid_input = $total_amount;
        } elseif ($amount_paid_input > 0 && $amount_paid_input < $total_amount) {
            $final_payment_status = 'partial';
        } else {
            $final_payment_status = 'pending';
            $amount_paid_input = 0;
        }
    }

    $conn->begin_transaction();

    try {
        // order table me entry ho rahi hai
        if ($is_pickup_request) {
            $status = 'pickup_pending';
        } else {
            $status = 'pending'; // Kg order → immediate scheduling
        }
        $col_check = $conn->query("SHOW COLUMNS FROM orders LIKE 'amount_paid'");
        $has_amount_paid_col = ($col_check && $col_check->num_rows > 0);if ($has_amount_paid_col) {
            $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, amount_paid, status, shipping_address, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->bind_param("iddssss", $user_id, $total_amount, $amount_paid_input, $status, $address, $db_payment_method, $final_payment_status);
        } else {
            $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
            $stmt->bind_param("idssss", $user_id, $total_amount, $status, $address, $db_payment_method, $final_payment_status);
        }
        
        if(!$stmt->execute()) {
            throw new Exception("Failed to create order: " . $stmt->error);
        }
        $order_id = $conn->insert_id;
        $stmt->close();

        // items add aur stock update kar rahe han yahan par
        // stock can never be negative logic: using GREATEST(0, stock - qty)
        $item_stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, is_cleaning, is_grinding, is_weight_pending) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $inv_stmt = $conn->prepare("UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?");
        $cust_stmt = $conn->prepare("INSERT INTO order_item_customizations (order_item_id, option_name, option_price) VALUES (?, ?, ?)");
        
        foreach($valid_items as $v_item) {
            $item_stmt->bind_param("iiddiii", $order_id, $v_item['product_id'], $v_item['quantity'], $v_item['price'], $v_item['is_cleaning'], $v_item['is_grinding'], $v_item['is_weight_pending']);
            if (!$item_stmt->execute()) {
                throw new Exception("Failed to add item to order: " . $item_stmt->error);
            }
            $order_item_id = $conn->insert_id;

            // Save dynamic customizations for this order item
            if (!empty($v_item['selected_customizations'])) {
                foreach ($v_item['selected_customizations'] as $sc) {
                    $opt_name = $sc->option_name ?? '';
                    $opt_price = floatval($sc->option_price ?? 0);
                    $cust_stmt->bind_param("isd", $order_item_id, $opt_name, $opt_price);
                    $cust_stmt->execute();
                }
            }
            
            // stock kam kar rahe han (sirf physical items ka)
            if (strtolower(trim($v_item['unit'])) !== 'trip') {
                $inv_stmt->bind_param("di", $v_item['quantity'], $v_item['product_id']);
                if (!$inv_stmt->execute()) {
                    throw new Exception("Failed to update product stock: " . $inv_stmt->error);
                }
            }
        }
        $item_stmt->close();
        $inv_stmt->close();
        $cust_stmt->close();

        // payment record kar rahe han agar paise diye hain
        if ($amount_paid_input > 0) {
            $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, transaction_id, payment_status) VALUES (?, ?, ?, 'completed')");
            $pay_stmt->bind_param("ids", $order_id, $amount_paid_input, $transaction_id);
            $pay_stmt->execute();
            $pay_stmt->close();
        }

        $conn->commit();
        
        // auto scheduling wala kaam kar rahe han
        $schedule_result = null;
        if (!$is_pickup_request) {
            require_once __DIR__ . '/order_scheduler.php';
            $schedule_result = scheduleOrder($conn, $order_id);
        }
        
        $remaining = $total_amount - $amount_paid_input;
        $message = "Order placed successfully";
        if ($final_payment_status === 'partial') {
            $message .= ". Rs. " . number_format($remaining, 2) . " added to Udhaar.";
        } elseif ($final_payment_status === 'pending' && $total_amount > 0) {
            $message .= ". Full amount Rs. " . number_format($total_amount, 2) . " added to Udhaar.";
        }
        
        // add scheduling info to message based on new reason codes
        if ($schedule_result && isset($schedule_result['schedule_reason'])) {
            $reason = $schedule_result['schedule_reason'];
            if ($reason === 'time_cutoff') {
                $message .= " (Scheduled for tomorrow — shop closing time buffer reached)";
            } else if ($reason === 'capacity_full') {
                $message .= " (Scheduled for tomorrow — today's order slots are full)";
            } else if ($reason === 'no_time_left') {
                $message .= " (Scheduled for tomorrow — not enough processing time left today)";
            }
        }
        
        echo json_encode([
            "success" => true, 
            "message" => $message, 
            "order_id" => $order_id, 
            "payment_status" => $final_payment_status, 
            "amount_paid" => $amount_paid_input, 
            "remaining_balance" => $remaining,
            "schedule" => $schedule_result,
            "is_today" => ($schedule_result && isset($schedule_result['is_today'])) ? $schedule_result['is_today'] : null,
            "assigned_date" => ($schedule_result && isset($schedule_result['assigned_date'])) ? $schedule_result['assigned_date'] : null
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Missing user_id or items"]);
}



