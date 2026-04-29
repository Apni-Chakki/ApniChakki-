<?php
// place order api
require_once __DIR__ . '/config/cors.php';
include __DIR__ . '/config/connect.php';

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
    
    // mapping payment methods to db values
    $method_map = [
        'cash' => 'cod',
        'cod' => 'cod', 
        'jazzcash' => 'online',
        'easypaisa' => 'online',
        'card' => 'online',
        'online' => 'online'
    ];
    $db_payment_method = $method_map[$payment_method] ?? 'cod';
    
    $total_amount = 0;
    $valid_items = [];
    $has_trip_item = false;
    $non_trip_total = 0.0;

    // calculating total from db prices and detecting 'trip' unit items
    foreach($cart_items as $item) {
        $pid = $item->id;
        $query = $conn->prepare("SELECT price, unit FROM products WHERE id = ?");
        $query->bind_param("i", $pid);
        $query->execute();
        $res = $query->get_result();
        
        if ($row = $res->fetch_assoc()) {
            $price = floatval($row['price']);
            $unit = isset($row['unit']) ? strtolower(trim($row['unit'])) : '';
            $qty = floatval($item->qty);

            if ($unit === 'trip') {
                $has_trip_item = true;
                // for trip items price is TBD — do not include in order total until admin confirms weight
                $valid_items[] = [
                    "product_id" => $pid,
                    "quantity" => $qty,
                    "price" => $price,
                    "unit" => $unit
                ];
            } else {
                $non_trip_total += ($price * $qty);
                $valid_items[] = [
                    "product_id" => $pid,
                    "quantity" => $qty,
                    "price" => $price,
                    "unit" => $unit
                ];
            }
        }
        $query->close();
    }

    // For orders that include Trip items, we keep only non-trip sum in DB total (or 0 if none)
    $total_amount = $non_trip_total;

    // For orders that include Trip items → pickup flow (TBD pricing, admin weighs later)
    // For Kg orders → immediate pricing, bypass admin weight step
    if ($has_trip_item) {
        $total_amount = 0;
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

    // figuring out payment status based on computed total (non-trip total)
    if ($total_amount <= 0) {
        // when total is zero (e.g., all items are trip/TBD), keep payment pending
        $final_payment_status = 'pending';
        $amount_paid_input = 0;
    } else {
        if ($amount_paid_input >= $total_amount) {
            $final_payment_status = 'paid';
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
        // inserting into orders table
        // If the order is a pickup request (trip items), mark as pickup_pending for admin weight confirmation
        // If it's a Kg order, go straight to 'pending' for immediate scheduling
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

        // adding order items
        $item_stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)");
        
        foreach($valid_items as $v_item) {
            $item_stmt->bind_param("iidd", $order_id, $v_item['product_id'], $v_item['quantity'], $v_item['price']);
            if (!$item_stmt->execute()) {
                throw new Exception("Failed to add item to order: " . $item_stmt->error);
            }
        }
        $item_stmt->close();

        // deducting stock (skip trip-unit products — they are services, not physical inventory)
        $inv_stmt = $conn->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
        foreach($valid_items as $v_item) {
            if (strtolower(trim($v_item['unit'])) === 'trip') continue; // skip services
            $inv_stmt->bind_param("di", $v_item['quantity'], $v_item['product_id']);
            if (!$inv_stmt->execute()) {
                throw new Exception("Failed to update product stock: " . $inv_stmt->error);
            }
        }
        $inv_stmt->close();

        // recording payment if paid
        if ($amount_paid_input > 0) {
            $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, transaction_id, payment_status) VALUES (?, ?, ?, 'completed')");
            $pay_stmt->bind_param("ids", $order_id, $amount_paid_input, $transaction_id);
            $pay_stmt->execute();
            $pay_stmt->close();
        }

        $conn->commit();
        
        // auto-schedule:
        // - Kg orders: always schedule immediately (weight and price are known)
        // - Pickup requests (trip items): do NOT schedule until admin confirms weight
        $schedule_result = null;
        if (!$is_pickup_request) {
            require_once __DIR__ . '/controllers/orders/order_scheduler.php';
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
