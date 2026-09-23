<?php
// order place karne wali api
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../core/autoload.php';
require_once __DIR__ . '/../../utils/auth_middleware.php';

use AttaChakki\Services\OrderService;

header('Content-Type: application/json');
$payload = require_auth();

$data = json_decode(file_get_contents("php://input"));
$user_id = $payload['id']; // IDOR fixed

if ($user_id && isset($data->cart_items) && !empty($data->cart_items)) {
    $user_query = $conn->prepare("SELECT email, full_name, phone FROM users WHERE id = ?");
    $user_query->bind_param("i", $user_id);
    $user_query->execute();
    $user_row = $user_query->get_result()->fetch_assoc();
    $user_query->close();
    
    $customer_name = $user_row['full_name'] ?? 'Customer';
    $customer_phone = $user_row['phone'] ?? '';

    $address = isset($data->address) ? $data->address : "No address provided";
    $latitude = isset($data->latitude) && is_numeric($data->latitude) ? floatval($data->latitude) : null;
    $longitude = isset($data->longitude) && is_numeric($data->longitude) ? floatval($data->longitude) : null;
    if ($latitude !== null && $longitude !== null && !str_contains($address, '[GPS:')) {
        $address .= sprintf(" [GPS: %.6f, %.6f]", $latitude, $longitude);
    }
    
    $cart_items = $data->cart_items;
    $payment_method = isset($data->payment_method) ? $data->payment_method : 'cash';
    $payment_status = isset($data->payment_status) ? $data->payment_status : 'pending';
    $transaction_id = isset($data->transaction_id) ? $data->transaction_id : null;
    $amount_paid_input = isset($data->amount_paid) ? floatval($data->amount_paid) : 0;
    $coupon_code = isset($data->coupon_code) ? strtoupper(trim($data->coupon_code)) : null;
    
    $is_pickup_request = isset($data->is_pickup_request) ? filter_var($data->is_pickup_request, FILTER_VALIDATE_BOOLEAN) : false;
    $is_kg_order = isset($data->is_kg_order) ? filter_var($data->is_kg_order, FILTER_VALIDATE_BOOLEAN) : false;
    $order_type = isset($data->order_type) ? $data->order_type : 'delivery';
    
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

    // Start ACID transaction before locking stock to eliminate TOCTOU race conditions
    $conn->query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    $conn->begin_transaction();

    try {
        // 1. Lock rows (SELECT ... FOR UPDATE) and validate stock & calculate prices
        $item_result = OrderService::validateAndCalculateCartItems($conn, (array)$cart_items, true);
        if (!$item_result['success']) {
            $err_code = $item_result['error_code'] ?? 'VALIDATION_FAILED';
            throw new Exception($item_result['message'], $err_code === 'OUT_OF_STOCK_RACE' ? 409 : 400);
        }

        $valid_items = $item_result['valid_items'];
        $has_trip_item = $item_result['has_trip_item'];
        $has_pending_weight_item = $item_result['has_pending_weight_item'];
        $non_trip_total = $item_result['non_trip_total'];

        if (empty($valid_items)) {
            throw new Exception("No valid items found", 400);
        }

        // 2. Determine order total
        $passed_total = isset($data->total) ? floatval($data->total) : 0;
        $delivery_fee_input = isset($data->delivery_fee) ? floatval($data->delivery_fee) : 0;
        
        if ($delivery_fee_input <= 0 && strtolower(trim($order_type)) !== 'pickup') {
            try {
                $dsRes = $conn->query("SELECT base_fare FROM delivery_settings LIMIT 1");
                if ($dsRes && $dsRow = $dsRes->fetch_assoc()) {
                    $delivery_fee_input = floatval($dsRow['base_fare'] ?? 0);
                }
            } catch (Throwable $t) {}
        }

        if ($passed_total > 0 && !$has_trip_item) {
            $total_amount = round($passed_total);
        } elseif ($delivery_fee_input > 0 && !$has_trip_item) {
            $total_amount = round($non_trip_total + $delivery_fee_input);
        } else {
            $total_amount = $non_trip_total;
        }

        // 3. Validate coupon and calculate discount via OrderService
        $coupon_info = OrderService::validateCoupon($conn, $coupon_code, $total_amount);
        $coupon_id = $coupon_info['coupon_id'];
        $coupon_discount = $coupon_info['coupon_discount'];

        // Determine item categories: ready goods vs pending pickup items
        $has_ready_items = false;
        $has_pickup_items = false;
        foreach ($valid_items as $v_it) {
            $u = strtolower(trim($v_it['unit'] ?? ''));
            $wp = !empty($v_it['is_weight_pending']);
            if ($u === 'trip' || $wp) {
                $has_pickup_items = true;
            } else {
                $has_ready_items = true;
            }
        }

        $is_combined_order = ($has_ready_items && $has_pickup_items) ? 1 : 0;
        $hybrid_stage = $is_combined_order ? 'prep_and_collect' : null;

        // Adjust pickup / kg flags & initial status
        if ($is_combined_order) {
            $is_pickup_request = true;
            $is_kg_order = false;
            // Hybrid orders start in 'pending' so shop prepares ready items first, then driver dispatches for Delivery + Pickup
            $status = 'pending';
        } elseif ($has_trip_item || $has_pending_weight_item) {
            $is_pickup_request = true;
            $is_kg_order = false;
            $status = 'pickup_pending';
        } elseif ($is_kg_order || !$is_pickup_request) {
            $is_pickup_request = false;
            $is_kg_order = true;
            $status = 'pending';
        } else {
            $status = 'pending';
        }

        // 4. Determine final payment status
        if ($total_amount <= 0 && $has_pending_weight_item && !$is_combined_order) {
            $final_payment_status = 'pending';
            $amount_paid_input = 0;
        } else {
            if ($amount_paid_input >= $total_amount && $total_amount > 0) {
                $final_payment_status = $has_pending_weight_item ? 'partial' : 'paid';
                $amount_paid_input = $total_amount;
            } elseif ($amount_paid_input > 0 && $amount_paid_input < $total_amount) {
                $final_payment_status = 'partial';
            } else {
                $final_payment_status = 'pending';
                $amount_paid_input = 0;
            }
        }

        $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, delivery_fee, amount_paid, coupon_code, coupon_discount, status, order_type, shipping_address, latitude, longitude, payment_method, payment_status, source, is_combined_order, hybrid_stage, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', ?, ?, NOW())");
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error, 500);
        }
        $stmt->bind_param("idddsdsssddssis", $user_id, $total_amount, $delivery_fee_input, $amount_paid_input, $coupon_code, $coupon_discount, $status, $order_type, $address, $latitude, $longitude, $db_payment_method, $final_payment_status, $is_combined_order, $hybrid_stage);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to create order: " . $stmt->error, 500);
        }
        $order_id = $conn->insert_id;
        $stmt->close();

        // 5. Save order items, customizations, and rentals via OrderService (with atomic decrement check)
        OrderService::saveOrderItemsAndRentals(
            $conn,
            $order_id,
            $valid_items,
            $user_id,
            $customer_name,
            $customer_phone,
            $address,
            $db_payment_method,
            $final_payment_status
        );

        // 6. Record payment & coupon usage via OrderService
        OrderService::recordPaymentAndCoupon(
            $conn,
            $order_id,
            $user_id,
            $amount_paid_input,
            $payment_method,
            $transaction_id,
            $coupon_id,
            $coupon_discount
        );

        $conn->commit();

        // Clear server API cache
        require_once __DIR__ . '/../../utils/cache_helper.php';
        clear_api_cache();

        // Admin notification
        require_once __DIR__ . '/../../utils/notification_helper.php';
        if ($is_pickup_request) {
            addAdminNotification($conn, "New Pickup Request", "A new pickup request #$order_id has been placed.", "pickup_request", $order_id);
        } else {
            addAdminNotification($conn, "New Order Placed", "A new delivery order #$order_id has been placed.", "new_order", $order_id);
        }

        // Order confirmation email dispatch
        $target_email = !empty($user_row['email']) ? $user_row['email'] : ($data->email ?? ($data->customer_email ?? ''));
        if (!empty($target_email)) {
            $email_items = [];
            foreach ($valid_items as $v_item) {
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

            $store_phone = "+92 3080099664";
            $store_name = "Suchi Chakki";
            $settingsRes = $conn->query("SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN ('phone', 'storeName', 'organizationName')");
            if ($settingsRes) {
                while ($sRow = $settingsRes->fetch_assoc()) {
                    if ($sRow['setting_key'] === 'phone' && !empty($sRow['setting_value'])) $store_phone = $sRow['setting_value'];
                    if (($sRow['setting_key'] === 'storeName' || $sRow['setting_key'] === 'organizationName') && !empty($sRow['setting_value'])) $store_name = $sRow['setting_value'];
                }
            }

            $emailData = [
                'customerEmail' => $target_email,
                'customerName' => $user_row['full_name'] ?? 'Customer',
                'orderId' => $order_id,
                'orderItems' => $email_items,
                'totalPrice' => $total_amount,
                'deliveryAddress' => $address,
                'storePhone' => $store_phone,
                'storeName' => $store_name
            ];

            require_once __DIR__ . '/../../utils/email_helper.php';
            send_email_async('/send-order-confirmation', $emailData);
        }

        // Auto scheduling
        $schedule_result = null;
        if (!$is_pickup_request) {
            require_once __DIR__ . '/order_scheduler.php';
            $schedule_result = scheduleOrder($conn, $order_id);
        }

        $remaining = $total_amount - $amount_paid_input;
        $message = "Order placed successfully";
        if ($db_payment_method === 'udhaar') {
            if ($final_payment_status === 'partial') {
                $message .= ". Rs. " . number_format($remaining, 2) . " added to Udhaar.";
            } elseif ($final_payment_status === 'pending' && $total_amount > 0) {
                $message .= ". Full amount Rs. " . number_format($total_amount, 2) . " added to Udhaar.";
            }
        }

        if ($schedule_result && isset($schedule_result['schedule_reason'])) {
            $reason = $schedule_result['schedule_reason'];
            if ($reason === 'time_cutoff') {
                $message .= " (Scheduled for tomorrow — shop closing time buffer reached)";
            } elseif ($reason === 'capacity_full') {
                $message .= " (Scheduled for tomorrow — today's order slots are full)";
            } elseif ($reason === 'no_time_left') {
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
        if ($conn->ping()) {
            $conn->rollback();
        }
        $code = (int)$e->getCode();
        if ($code < 400 || $code > 599) {
            $code = (str_contains($e->getMessage(), 'INSUFFICIENT_STOCK') || str_contains($e->getMessage(), 'out of stock')) ? 409 : 500;
        }
        http_response_code($code);
        echo json_encode([
            "success" => false, 
            "error_code" => ($code === 409) ? "OUT_OF_STOCK_RACE" : "ORDER_FAILED",
            "message" => $e->getMessage()
        ]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Missing user_id or items"]);
}

$conn->close();
