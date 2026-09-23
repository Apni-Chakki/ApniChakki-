<?php
// update order status api - with schedule recalculation
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
$auth_user = require_driver_or_admin();


if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['order_id']) || !isset($data['status'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Order ID and status are required"]);
        exit;
    }
    
    $order_id = intval($data['order_id']);
    $status = $conn->real_escape_string($data['status']);
    $reason = isset($data['cancellation_reason']) ? $conn->real_escape_string(trim($data['cancellation_reason'])) : null;
    $cancelled_by = isset($data['cancelled_by']) ? $conn->real_escape_string(trim($data['cancelled_by'])) : ($auth_user['name'] ?? 'Admin');
    
    // checking valid status
    $validStatuses = ['pending', 'processing', 'ready', 'batch_ready', 'delivery_assigned', 'out-for-delivery', 'completed', 'cancelled', 'scheduled-tomorrow', 'scheduled', 'coming_for_pickup', 'arrived_at_shop', 'pickup_assigned', 'pickup_pending'];
    if (!in_array($status, $validStatuses)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid status value"]);
        exit;
    }
    
    // checking if order exists
    $orderSql = "SELECT o.id, o.status, o.assigned_date, o.user_id, o.payment_method, o.payment_status, o.shipping_address, o.is_combined_order, o.hybrid_stage, u.full_name as customer_name, u.phone as customer_phone, u.email as customer_email 
                 FROM orders o 
                 LEFT JOIN users u ON o.user_id = u.id 
                 WHERE o.id = ?";
    $stmt = $conn->prepare($orderSql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $orderResult = $stmt->get_result();
    
    if ($orderResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Order not found"]);
        exit;
    }
    
    $order = $orderResult->fetch_assoc();
    $old_date = $order['assigned_date'];
    $is_comb = intval($order['is_combined_order'] ?? 0);
    $curr_stage = $order['hybrid_stage'] ?? null;
    $stmt->close();

    // updating status
    if ($status === 'cancelled') {
        $updateSql = "UPDATE orders SET status = ?, cancellation_reason = ?, cancelled_by = ?, cancelled_at = NOW(), updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("sssi", $status, $reason, $cancelled_by, $order_id);
    } elseif ($status === 'scheduled-tomorrow') {
        // when scheduling for tomorrow, update assigned_date too
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        $updateSql = "UPDATE orders SET status = ?, assigned_date = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("ssi", $status, $tomorrow, $order_id);
    } elseif ($status === 'processing') {
        // when moving to processing, assign to today
        $today = date('Y-m-d');
        $updateSql = "UPDATE orders SET status = ?, assigned_date = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("ssi", $status, $today, $order_id);
    } elseif ($status === 'arrived_at_shop' && $is_comb === 1) {
        $updateSql = "UPDATE orders SET status = ?, hybrid_stage = 'grain_received', updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("si", $status, $order_id);
    } elseif ($status === 'ready' && $is_comb === 1 && $curr_stage === 'grinding') {
        $updateSql = "UPDATE orders SET status = ?, hybrid_stage = 'final_delivery', updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("si", $status, $order_id);
    } elseif ($status === 'completed' && $is_comb === 1) {
        $updateSql = "UPDATE orders SET status = ?, hybrid_stage = 'completed', updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("si", $status, $order_id);
    } else {
        $updateSql = "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("si", $status, $order_id);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update order status: " . $stmt->error);
    }
    $stmt->close();

    // If order status is updated to completed, check for COD payment settlement and rental items to activate
    if ($status === 'completed') {
        // COD order completed means cash was collected by driver upon delivery
        $is_cod = empty($order['payment_method']) || in_array(strtolower($order['payment_method']), ['cod', 'cash']);
        if ($is_cod && strtolower($order['payment_status'] ?? '') !== 'paid') {
            $pay_upd = $conn->prepare("UPDATE orders SET payment_status = 'paid', amount_paid = total_amount, updated_at = NOW() WHERE id = ?");
            if ($pay_upd) {
                $pay_upd->bind_param("i", $order_id);
                $pay_upd->execute();
                $pay_upd->close();
            }
            $order['payment_status'] = 'paid';

            // Record in payments table if not already present
            $chk_pay = $conn->prepare("SELECT id FROM payments WHERE order_id = ? LIMIT 1");
            if ($chk_pay) {
                $chk_pay->bind_param("i", $order_id);
                $chk_pay->execute();
                $chk_res = $chk_pay->get_result();
                if ($chk_res->num_rows === 0) {
                    $insert_pay = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, description, created_at) SELECT id, total_amount, 'cash', 'COD cash collected by driver upon delivery', NOW() FROM orders WHERE id = ?");
                    if ($insert_pay) {
                        $insert_pay->bind_param("i", $order_id);
                        $insert_pay->execute();
                        $insert_pay->close();
                    }
                }
                $chk_pay->close();
            }
        }

        $rentals_stmt = $conn->prepare("SELECT oi.*, p.name AS product_name, p.rental_price_per_day, p.security_deposit, p.late_penalty_per_day 
                                        FROM order_items oi 
                                        JOIN products p ON oi.product_id = p.id 
                                        WHERE oi.order_id = ? AND oi.is_rental = 1");
        $rentals_stmt->bind_param("i", $order_id);
        $rentals_stmt->execute();
        $rentals_result = $rentals_stmt->get_result();

        while ($item = $rentals_result->fetch_assoc()) {
            $product_id = intval($item['product_id']);
            $quantity = intval($item['quantity']);
            
            $rental_days = intval($item['rental_days'] ?? 1);
            if ($rental_days <= 0) $rental_days = 1;
            
            $rental_start_date = !empty($item['rental_start_date']) ? $item['rental_start_date'] : date('Y-m-d');
            if (strtotime($rental_start_date) < strtotime(date('Y-m-d'))) {
                $rental_start_date = date('Y-m-d');
            }
            
            $rental_end_date = date('Y-m-d', strtotime($rental_start_date . " + $rental_days days"));
            
            $rental_price_per_day = floatval($item['rental_price_per_day']);
            $security_deposit = floatval($item['security_deposit']);
            $late_penalty_per_day = floatval($item['late_penalty_per_day']);
            $total_rental_amount = $rental_days * $rental_price_per_day * $quantity;
            
            $total_cost = $total_rental_amount + ($security_deposit * $quantity);
            $amount_paid = ($order['payment_status'] === 'paid') ? $total_cost : 0.0;
            
            $check_stmt = $conn->prepare("SELECT id FROM rentals WHERE order_id = ? AND product_id = ? LIMIT 1");
            $check_stmt->bind_param("ii", $order_id, $product_id);
            $check_stmt->execute();
            $check_res = $check_stmt->get_result();
            $already_exists = ($check_res->num_rows > 0);
            $check_stmt->close();
            
            if (!$already_exists) {
                $insert_rent_stmt = $conn->prepare("INSERT INTO rentals (
                    order_id, product_id, user_id, customer_name, customer_phone, customer_address, 
                    quantity, rental_start_date, rental_end_date, rental_days, rental_price_per_day, 
                    total_rental_amount, security_deposit, deposit_status, late_penalty_per_day, 
                    payment_method, amount_paid, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'held', ?, ?, ?, 'active', NOW(), NOW())");
                
                $user_id = intval($order['user_id'] ?? 0);
                $payment_method = $order['payment_method'] ?? 'cod';
                $shipping_address = $order['shipping_address'] ?? 'No address';
                $customer_name = $order['customer_name'] ?? 'Customer';
                $customer_phone = $order['customer_phone'] ?? '';
                
                $insert_rent_stmt->bind_param(
                    "iiisssissidddssd",
                    $order_id,
                    $product_id,
                    $user_id,
                    $customer_name,
                    $customer_phone,
                    $shipping_address,
                    $quantity,
                    $rental_start_date,
                    $rental_end_date,
                    $rental_days,
                    $rental_price_per_day,
                    $total_rental_amount,
                    $security_deposit,
                    $late_penalty_per_day,
                    $payment_method,
                    $amount_paid
                );
                
                $insert_rent_stmt->execute();
                $insert_rent_stmt->close();
            }
        }
        $rentals_stmt->close();
    }
    
    // recalculate schedule when order is removed from queue (ready, batch_ready, completed, cancelled)
    if (in_array($status, ['ready', 'batch_ready', 'completed', 'cancelled']) && $old_date) {
        require_once __DIR__ . '/order_scheduler.php';
        recalculateSchedule($conn, $old_date);
    }
    
    // recalculate schedule when moving between days
    if ($status === 'scheduled-tomorrow' || $status === 'processing') {
        require_once __DIR__ . '/order_scheduler.php';
        $target_date = ($status === 'scheduled-tomorrow') ? date('Y-m-d', strtotime('+1 day')) : date('Y-m-d');
        recalculateSchedule($conn, $target_date);
        if ($old_date && $old_date !== $target_date) {
            recalculateSchedule($conn, $old_date);
        }
    }
    
    // Send status update email if customer has email
    if ($order && !empty($order['customer_email'])) {
        $emailData = [
            'customerEmail' => $order['customer_email'],
            'customerName' => $order['customer_name'] ?? 'Customer',
            'orderId' => $order_id,
            'newStatus' => $status,
            'cancellationReason' => $reason
        ];

        require_once __DIR__ . '/../../utils/email_helper.php';
        send_email_async('/send-order-status-update', $emailData);
    }

    require_once __DIR__ . '/../../utils/cache_helper.php';
    clear_api_cache();

    echo json_encode([
        "success" => true,
        "message" => "Order status updated to '$status'",
        "order_id" => $order_id,
        "new_status" => $status,
        "customer_name" => $order['customer_name'] ?? '',
        "customer_phone" => $order['customer_phone'] ?? ''
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error updating order status: " . $e->getMessage()
    ]);
}
