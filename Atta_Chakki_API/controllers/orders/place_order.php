<?php
// order place karne wali api
include __DIR__ . '/../../config/connect.php';

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
    $coupon_code = isset($data->coupon_code) ? strtoupper(trim($data->coupon_code)) : null;
    
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
        $query = $conn->prepare("SELECT price, discount_type, discount_value, unit, is_grinding_service, cleaning_price, grinding_price FROM products WHERE id = ?");
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
                $base_price = 0;
                foreach ($selected_customizations as $sc) {
                    $base_price += floatval($sc->option_price ?? 0);
                }
                if ($base_price <= 0) $base_price = floatval($row['price']);
            } else if ($is_grinding_service) {
                // Backward compatible: hardcoded cleaning/grinding
                $base_price = 0;
                if ($is_cleaning) $base_price += floatval($row['cleaning_price']);
                if ($is_grinding) $base_price += floatval($row['grinding_price']);
                if ($base_price <= 0 && !$is_cleaning && !$is_grinding) $base_price = floatval($row['price']);
            } else {
                $base_price = floatval($row['price']);
            }

            // Apply product-level discount
            $discount_type = isset($row['discount_type']) ? $row['discount_type'] : 'none';
            $discount_value = isset($row['discount_value']) ? floatval($row['discount_value']) : 0;
            
            $price = $base_price;
            if ($discount_type === 'percentage') {
                $price = $base_price - ($base_price * ($discount_value / 100));
            } elseif ($discount_type === 'fixed') {
                $price = max(0, $base_price - $discount_value);
            }

            if ($unit === 'trip') {
                $has_trip_item = true;
                $has_pending_weight_item = true;
                $valid_items[] = [
                    "product_id" => $pid,
                    "quantity" => $qty,
                    "price" => $price,
                    "original_price" => $base_price,
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
                    "original_price" => $base_price,
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

    // Coupon validation and discount application
    $coupon_discount = 0;
    $coupon_id = null;
    if ($coupon_code && $total_amount > 0) {
        $coupon_stmt = $conn->prepare("SELECT id, discount_type, discount_value, min_order_amount, usage_limit, used_count, expiry_date, is_active FROM coupons WHERE code = ?");
        $coupon_stmt->bind_param("s", $coupon_code);
        $coupon_stmt->execute();
        $coupon_res = $coupon_stmt->get_result();

        if ($coupon_res->num_rows > 0) {
            $coupon = $coupon_res->fetch_assoc();
            $coupon_stmt->close();

            // Validate coupon
            $valid = true;
            $error_msg = "";

            if (!$coupon['is_active']) {
                $valid = false;
                $error_msg = "Coupon is inactive";
            } elseif ($coupon['expiry_date'] && new DateTime($coupon['expiry_date']) < new DateTime()) {
                $valid = false;
                $error_msg = "Coupon has expired";
            } elseif ($coupon['usage_limit'] && $coupon['used_count'] >= $coupon['usage_limit']) {
                $valid = false;
                $error_msg = "Coupon usage limit reached";
            } elseif ($coupon['min_order_amount'] > 0 && $total_amount < $coupon['min_order_amount']) {
                $valid = false;
                $error_msg = "Minimum order amount Rs. " . $coupon['min_order_amount'] . " required";
            }

            if ($valid) {
                $coupon_id = $coupon['id'];
                $discount_value = floatval($coupon['discount_value']);
                if ($coupon['discount_type'] === 'percentage') {
                    $coupon_discount = $total_amount * ($discount_value / 100);
                } else {
                    $coupon_discount = $discount_value;
                }
                $coupon_discount = min($coupon_discount, $total_amount);
                $total_amount = $total_amount - $coupon_discount;
            }
        } else {
            $coupon_stmt->close();
        }
    }

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
        $has_amount_paid_col = ($col_check && $col_check->num_rows > 0);
        $coupon_col_check = $conn->query("SHOW COLUMNS FROM orders LIKE 'coupon_code'");
        $has_coupon_cols = ($coupon_col_check && $coupon_col_check->num_rows > 0);

        if ($has_amount_paid_col && $has_coupon_cols) {
            $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, amount_paid, coupon_code, coupon_discount, status, shipping_address, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->bind_param("idddsdsss", $user_id, $total_amount, $amount_paid_input, $coupon_code, $coupon_discount, $status, $address, $db_payment_method, $final_payment_status);
        } elseif ($has_amount_paid_col) {
            $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, amount_paid, status, shipping_address, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->bind_param("iddssss", $user_id, $total_amount, $amount_paid_input, $status, $address, $db_payment_method, $final_payment_status);
        } elseif ($has_coupon_cols) {
            $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, coupon_code, coupon_discount, status, shipping_address, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->bind_param("idsdssss", $user_id, $total_amount, $coupon_code, $coupon_discount, $status, $address, $db_payment_method, $final_payment_status);
        } else {
            $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
            $stmt->bind_param("idssss", $user_id, $total_amount, $status, $address, $db_payment_method, $final_payment_status);
        }
        
        if(!$stmt->execute()) {
            throw new Exception("Failed to create order: " . $stmt->error);
        }
        $order_id = $conn->insert_id;
        $stmt->close();

        // Check if original_price column exists
        $orig_check = $conn->query("SHOW COLUMNS FROM order_items LIKE 'original_price'");
        if (!$orig_check || $orig_check->num_rows === 0) {
            $conn->query("ALTER TABLE order_items ADD COLUMN original_price DECIMAL(10,2) DEFAULT NULL");
        }

        // items add aur stock update kar rahe han yahan par
        // stock can never be negative logic: using GREATEST(0, stock - qty)
        $item_stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, original_price, is_cleaning, is_grinding, is_weight_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $inv_stmt = $conn->prepare("UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?");
        $cust_stmt = $conn->prepare("INSERT INTO order_item_customizations (order_item_id, option_name, option_price) VALUES (?, ?, ?)");
        
        foreach($valid_items as $v_item) {
            $item_stmt->bind_param("iiddiiii", $order_id, $v_item['product_id'], $v_item['quantity'], $v_item['price'], $v_item['original_price'], $v_item['is_cleaning'], $v_item['is_grinding'], $v_item['is_weight_pending']);
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

        // coupon usage record kar rahe han agar coupon apply kiya
        if ($coupon_id && $coupon_discount > 0) {
            $usage_stmt = $conn->prepare("INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)");
            $usage_stmt->bind_param("iiid", $coupon_id, $user_id, $order_id, $coupon_discount);
            $usage_stmt->execute();
            $usage_stmt->close();

            // increment coupon used_count
            $update_coupon_stmt = $conn->prepare("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?");
            $update_coupon_stmt->bind_param("i", $coupon_id);
            $update_coupon_stmt->execute();
            $update_coupon_stmt->close();
        }

        $conn->commit();

        // Create admin notification
        require_once __DIR__ . '/../../utils/notification_helper.php';
        if ($is_pickup_request) {
            addAdminNotification($conn, "New Pickup Request", "A new pickup request #$order_id has been placed.", "pickup_request", $order_id);
        } else {
            addAdminNotification($conn, "New Order Placed", "A new delivery order #$order_id has been placed.", "new_order", $order_id);
        }

        // Send order confirmation email
        $user_query = $conn->prepare("SELECT email, full_name FROM users WHERE id = ?");
        $user_query->bind_param("i", $user_id);
        $user_query->execute();
        $user_row = $user_query->get_result()->fetch_assoc();
        $user_query->close();

        if ($user_row && !empty($user_row['email'])) {
            $email_items = [];
            foreach ($valid_items as $v_item) {
                // Fetch product name
                $p_query = $conn->prepare("SELECT name FROM products WHERE id = ?");
                $p_query->bind_param("i", $v_item['product_id']);
                $p_query->execute();
                $p_row = $p_query->get_result()->fetch_assoc();
                $p_query->close();

                $email_items[] = [
                    'name' => $p_row['name'] ?? 'Product',
                    'quantity' => $v_item['quantity'],
                    'price' => $v_item['price']
                ];
            }

            $emailData = [
                'customerEmail' => $user_row['email'],
                'customerName' => $user_row['full_name'],
                'orderId' => $order_id,
                'orderItems' => $email_items,
                'totalPrice' => $total_amount,
                'deliveryAddress' => $address
            ];

            $ch = curl_init('http://localhost:3001/send-order-confirmation');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_exec($ch);
            curl_close($ch);
        }
        
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

$conn->close();
?>
