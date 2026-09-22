<?php
// admin side se manual order create karna
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cache_helper.php';
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_once __DIR__ . '/order_scheduler.php';

$user = require_admin();

header('Content-Type: application/json');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!$data || !isset($data['phone']) || !isset($data['items']) || count($data['items']) === 0) {
        echo json_encode(["success" => false, "message" => "Phone number and at least one item are required"]);
        exit;
    }

    $name = isset($data['name']) ? trim($data['name']) : 'Walk-in Customer';
    $phone = preg_replace('/\D/', '', trim($data['phone'] ?? ''));
    
    if (empty($phone) || strlen($phone) !== 11 || $phone[0] !== '0') {
        echo json_encode(["success" => false, "message" => "Phone number must start with 0 and be exactly 11 digits (e.g. 03001234567)"]);
        exit;
    }
    
    $address = isset($data['address']) ? trim($data['address']) : 'Shop Pickup';
    $status = isset($data['status']) ? trim($data['status']) : 'pending';
    $payment_status = isset($data['payment_status']) ? trim($data['payment_status']) : 'pending';
    $payment_method = isset($data['payment_method']) ? trim($data['payment_method']) : 'cash';
    $total_amount = isset($data['total']) ? floatval($data['total']) : 0;
    $amount_paid = isset($data['amount_paid']) ? floatval($data['amount_paid']) : 0;

    // phone se user check kar rahe
    $user_id = null;
    $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->bind_param("s", $phone);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user_id = $result->fetch_assoc()['id'];
    } else {
        // naya customer create
        $role = 'customer';
        $stmt2 = $conn->prepare("INSERT INTO users (full_name, phone, role) VALUES (?, ?, ?)");
        $stmt2->bind_param("sss", $name, $phone, $role);
        $stmt2->execute();
        $user_id = $conn->insert_id;
        $stmt2->close();
    }
    $stmt->close();

    // total bill calculate
    if ($total_amount <= 0) {
        foreach ($data['items'] as $item) {
            $total_amount += floatval($item['price'] ?? 0) * intval($item['quantity'] ?? 1);
        }
    }

    $order_type = isset($data['order_type']) ? strtolower(trim($data['order_type'])) : '';
    if ($order_type !== 'pickup' && $order_type !== 'delivery') {
        $order_type = (stripos($address, 'pickup') !== false || stripos($address, 'shop') !== false || stripos($address, 'self') !== false) ? 'pickup' : 'delivery';
    }

    // check column
    $src_check = $conn->query("SHOW COLUMNS FROM orders LIKE 'source'");
    if (!$src_check || $src_check->num_rows === 0) {
        $conn->query("ALTER TABLE orders ADD COLUMN source VARCHAR(50) DEFAULT 'online'");
    }

    // order save kar rahe
    $order_stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, status, payment_status, payment_method, order_type, shipping_address, amount_paid, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', NOW(), NOW())");
    $order_stmt->bind_param("idsssssd", $user_id, $total_amount, $status, $payment_status, $payment_method, $order_type, $address, $amount_paid);
    $order_stmt->execute();
    $order_id = $conn->insert_id;
    $order_stmt->close();

    // payment record karna agar paise mile
    if ($amount_paid > 0) {
        $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, description, created_at) VALUES (?, ?, ?, 'Manual order initial payment', NOW())");
        $pay_stmt->bind_param("ids", $order_id, $amount_paid, $payment_method);
        $pay_stmt->execute();
        $pay_stmt->close();
    }

    $orig_check = $conn->query("SHOW COLUMNS FROM order_items LIKE 'original_price'");
    if (!$orig_check || $orig_check->num_rows === 0) {
        $conn->query("ALTER TABLE order_items ADD COLUMN original_price DECIMAL(10,2) DEFAULT NULL");
    }

    // order items save kar rahe
    foreach ($data['items'] as $item) {
        $product_id = intval($item['id'] ?? 0);
        $quantity = floatval($item['quantity'] ?? 1);
        $price = floatval($item['price'] ?? 0);
        $is_cleaning = intval($item['is_cleaning'] ?? 0);
        $is_grinding = intval($item['is_grinding'] ?? 0);
        
        $original_price = floatval($item['original_price'] ?? $price);
        $is_weight_pending = 0;

        $is_rental = intval($item['is_rental'] ?? 0);
        $rental_days = $is_rental ? intval($item['rental_days'] ?? 1) : null;
        if ($rental_days !== null && $rental_days <= 0) $rental_days = 1;
        $rental_start_date = $is_rental ? (!empty($item['rental_start_date']) ? $item['rental_start_date'] : date('Y-m-d')) : null;
        $rental_price_per_day = $is_rental ? floatval($item['rental_price_per_day'] ?? 0) : null;
        $security_deposit = $is_rental ? floatval($item['security_deposit'] ?? 0) : null;
        $late_penalty_per_day = $is_rental ? floatval($item['late_penalty_per_day'] ?? 0) : null;

        $item_stmt = $conn->prepare("INSERT INTO order_items (
            order_id, product_id, quantity, price_at_purchase, original_price, 
            is_cleaning, is_grinding, is_weight_pending, 
            is_rental, rental_days, rental_start_date, rental_price_per_day, security_deposit, late_penalty_per_day
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $item_stmt->bind_param(
            "iidddiiiiisddd",
            $order_id,
            $product_id,
            $quantity,
            $price,
            $original_price,
            $is_cleaning,
            $is_grinding,
            $is_weight_pending,
            $is_rental,
            $rental_days,
            $rental_start_date,
            $rental_price_per_day,
            $security_deposit,
            $late_penalty_per_day
        );
        $item_stmt->execute();
        $order_item_id = $conn->insert_id;
        $item_stmt->close();

        // customization options save
        if (!empty($item['selected_customizations'])) {
            $cust_stmt = $conn->prepare("INSERT INTO order_item_customizations (order_item_id, option_name, option_price) VALUES (?, ?, ?)");
            foreach ($item['selected_customizations'] as $sc) {
                $opt_name = $sc['option_name'] ?? '';
                $opt_price = floatval($sc['option_price'] ?? 0);
                $cust_stmt->bind_param("isd", $order_item_id, $opt_name, $opt_price);
                $cust_stmt->execute();
            }
            $cust_stmt->close();
        }

        // stock & rental record update
        if ($is_rental === 1) {
            // 1. Decrement rental_available_qty
            $rent_inv_stmt = $conn->prepare("UPDATE products SET rental_available_qty = GREATEST(0, rental_available_qty - ?) WHERE id = ?");
            $rent_inv_stmt->bind_param("di", $quantity, $product_id);
            $rent_inv_stmt->execute();
            $rent_inv_stmt->close();

            // 2. Create rental record in rentals table
            $rental_end_date = date('Y-m-d', strtotime($rental_start_date . " + {$rental_days} days"));
            $total_rental_amount = $rental_days * $rental_price_per_day * $quantity;
            $total_cost = $total_rental_amount + ($security_deposit * $quantity);
            $rental_amount_paid = ($payment_status === 'paid') ? $total_cost : ($payment_status === 'partial' ? min($total_cost, $amount_paid) : 0.0);

            $insert_rent_stmt = $conn->prepare("INSERT INTO rentals (
                order_id, product_id, user_id, customer_name, customer_phone, customer_address, 
                quantity, rental_start_date, rental_end_date, rental_days, rental_price_per_day, 
                total_rental_amount, security_deposit, deposit_status, late_penalty_per_day, 
                payment_method, amount_paid, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'held', ?, ?, ?, 'active', NOW(), NOW())");

            $insert_rent_stmt->bind_param(
                "iiisssissidddssd",
                $order_id,
                $product_id,
                $user_id,
                $name,
                $phone,
                $address,
                $quantity,
                $rental_start_date,
                $rental_end_date,
                $rental_days,
                $rental_price_per_day,
                $total_rental_amount,
                $security_deposit,
                $late_penalty_per_day,
                $payment_method,
                $rental_amount_paid
            );
            $insert_rent_stmt->execute();
            $insert_rent_stmt->close();
        } else {
            // regular stock update
            $prod_check = $conn->prepare("SELECT unit, stock_quantity FROM products WHERE id = ?");
            $prod_check->bind_param("i", $product_id);
            $prod_check->execute();
            $prod_res = $prod_check->get_result();
            if ($prod_res && $prod_row = $prod_res->fetch_assoc()) {
                $unit = strtolower(trim($prod_row['unit'] ?? ''));
                if ($unit !== 'trip') {
                    $new_stock = max(0, floatval($prod_row['stock_quantity']) - $quantity);
                    $update_stock = $conn->prepare("UPDATE products SET stock_quantity = ? WHERE id = ?");
                    $update_stock->bind_param("di", $new_stock, $product_id);
                    $update_stock->execute();
                    $update_stock->close();
                }
            }
            $prod_check->close();
        }
    }

    // Run scheduler algorithm to calculate weight, processing time, and assign date/ETA
    $schedule_result = scheduleOrder($conn, $order_id);

    clear_api_cache();
    echo json_encode([
        "success" => true,
        "message" => "Order created successfully",
        "order_id" => $order_id,
        "schedule" => $schedule_result
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log('admin_create_order.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
