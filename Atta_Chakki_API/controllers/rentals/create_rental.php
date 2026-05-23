<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/connect.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);

    // Validate required fields
    $required = ['product_id', 'user_id', 'customer_name', 'customer_phone', 'customer_address', 'rental_days'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            echo json_encode(["success" => false, "message" => "Missing required field: $field"]);
            exit;
        }
    }

    $product_id = intval($data['product_id']);
    $user_id = intval($data['user_id']);
    $customer_name = trim($data['customer_name']);
    $customer_phone = trim($data['customer_phone']);
    $customer_address = trim($data['customer_address']);
    $rental_days = intval($data['rental_days']);
    $rental_start_date = isset($data['rental_start_date']) && !empty($data['rental_start_date'])
        ? $data['rental_start_date']
        : date('Y-m-d');
    $payment_method = isset($data['payment_method']) && !empty($data['payment_method'])
        ? trim($data['payment_method'])
        : 'cash';
    $amount_paid = isset($data['amount_paid']) ? floatval($data['amount_paid']) : 0;
    $quantity = isset($data['quantity']) ? intval($data['quantity']) : 1;

    if ($rental_days <= 0) {
        echo json_encode(["success" => false, "message" => "rental_days must be greater than 0"]);
        exit;
    }

    // Look up the product
    $stmt = $conn->prepare("SELECT id, name, is_rental, rental_price_per_day, security_deposit, late_penalty_per_day, rental_available_qty FROM products WHERE id = ?");
    $stmt->bind_param("i", $product_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Product not found"]);
        exit;
    }

    $product = $result->fetch_assoc();
    $stmt->close();

    // Validate rental eligibility
    if ($product['is_rental'] != 1) {
        echo json_encode(["success" => false, "message" => "This product is not available for rental"]);
        exit;
    }

    if ($product['rental_available_qty'] < $quantity) {
        echo json_encode(["success" => false, "message" => "Insufficient rental stock. Available: " . $product['rental_available_qty']]);
        exit;
    }

    // Calculate amounts
    $rental_price_per_day = floatval($product['rental_price_per_day']);
    $security_deposit = floatval($product['security_deposit']);
    $late_penalty_per_day = floatval($product['late_penalty_per_day']);
    $total_rental_amount = $rental_days * $rental_price_per_day * $quantity;

    // Calculate rental_end_date
    $rental_end_date = date('Y-m-d', strtotime($rental_start_date . " + $rental_days days"));

    // Total order amount = rental + deposit
    $total_order_amount = $total_rental_amount + ($security_deposit * $quantity);

    // Begin transaction
    $conn->begin_transaction();

    // Create order
    $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, status, created_at, updated_at) VALUES (?, ?, 'rental_active', NOW(), NOW())");
    $stmt->bind_param("id", $user_id, $total_order_amount);
    $stmt->execute();
    $order_id = $conn->insert_id;
    $stmt->close();

    // Create rental record
    $stmt = $conn->prepare("INSERT INTO rentals (order_id, product_id, user_id, customer_name, customer_phone, customer_address, quantity, rental_start_date, rental_end_date, rental_days, rental_price_per_day, total_rental_amount, security_deposit, deposit_status, late_penalty_per_day, payment_method, amount_paid, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'held', ?, ?, ?, 'active', NOW(), NOW())");
    $stmt->bind_param(
        "iiisssissidddssd",
        $order_id,
        $product_id,
        $user_id,
        $customer_name,
        $customer_phone,
        $customer_address,
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
    $stmt->execute();
    $rental_id = $conn->insert_id;
    $stmt->close();

    // Decrement rental_available_qty
    $stmt = $conn->prepare("UPDATE products SET rental_available_qty = rental_available_qty - ? WHERE id = ?");
    $stmt->bind_param("ii", $quantity, $product_id);
    $stmt->execute();
    $stmt->close();

    // Insert payment if amount_paid > 0
    if ($amount_paid > 0) {
        $stmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, status, created_at) VALUES (?, ?, ?, 'completed', NOW())");
        $stmt->bind_param("ids", $order_id, $amount_paid, $payment_method);
        $stmt->execute();
        $stmt->close();
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Rental created successfully",
        "data" => [
            "rental_id" => $rental_id,
            "order_id" => $order_id,
            "product_name" => $product['name'],
            "rental_start_date" => $rental_start_date,
            "rental_end_date" => $rental_end_date,
            "rental_days" => $rental_days,
            "rental_price_per_day" => $rental_price_per_day,
            "total_rental_amount" => $total_rental_amount,
            "security_deposit" => $security_deposit,
            "total_order_amount" => $total_order_amount,
            "amount_paid" => $amount_paid,
            "payment_method" => $payment_method
        ]
    ]);

} catch (Exception $e) {
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    echo json_encode(["success" => false, "message" => "Error creating rental: " . $e->getMessage()]);
}
