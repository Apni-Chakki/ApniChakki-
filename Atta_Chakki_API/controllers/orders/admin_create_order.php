<?php
// Admin create order controller — for manual walk-in / phone orders
require_once __DIR__ . '/../../config/connect.php';

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
    $phone = trim($data['phone']);
    $address = isset($data['address']) ? trim($data['address']) : 'Shop Pickup';
    $status = isset($data['status']) ? trim($data['status']) : 'pending';
    $payment_status = isset($data['payment_status']) ? trim($data['payment_status']) : 'pending';
    $payment_method = isset($data['payment_method']) ? trim($data['payment_method']) : 'cash';
    $total_amount = isset($data['total']) ? floatval($data['total']) : 0;
    $amount_paid = isset($data['amount_paid']) ? floatval($data['amount_paid']) : 0;

    // Find or create user by phone
    $user_id = null;
    $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->bind_param("s", $phone);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user_id = $result->fetch_assoc()['id'];
    } else {
        // Create a walk-in customer
        $role = 'customer';
        $stmt2 = $conn->prepare("INSERT INTO users (full_name, phone, role) VALUES (?, ?, ?)");
        $stmt2->bind_param("sss", $name, $phone, $role);
        $stmt2->execute();
        $user_id = $conn->insert_id;
        $stmt2->close();
    }
    $stmt->close();

    // Calculate total if not provided
    if ($total_amount <= 0) {
        foreach ($data['items'] as $item) {
            $total_amount += floatval($item['price'] ?? 0) * intval($item['quantity'] ?? 1);
        }
    }

    // Insert order
    $order_stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, status, payment_status, payment_method, shipping_address, amount_paid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
    $order_stmt->bind_param("idssssd", $user_id, $total_amount, $status, $payment_status, $payment_method, $address, $amount_paid);
    $order_stmt->execute();
    $order_id = $conn->insert_id;
    $order_stmt->close();

    // Check if original_price column exists
    $orig_check = $conn->query("SHOW COLUMNS FROM order_items LIKE 'original_price'");
    if (!$orig_check || $orig_check->num_rows === 0) {
        $conn->query("ALTER TABLE order_items ADD COLUMN original_price DECIMAL(10,2) DEFAULT NULL");
    }

    // Insert order items
    foreach ($data['items'] as $item) {
        $product_id = intval($item['id'] ?? 0);
        $quantity = intval($item['quantity'] ?? 1);
        $price = floatval($item['price'] ?? 0);
        $is_cleaning = intval($item['is_cleaning'] ?? 0);
        $is_grinding = intval($item['is_grinding'] ?? 0);
        
        $original_price = floatval($item['original_price'] ?? $price);
        $is_weight_pending = 0;

        $item_stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, original_price, is_cleaning, is_grinding, is_weight_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $item_stmt->bind_param("iiddiiii", $order_id, $product_id, $quantity, $price, $original_price, $is_cleaning, $is_grinding, $is_weight_pending);
        $item_stmt->execute();
        $order_item_id = $conn->insert_id;
        $item_stmt->close();

        // Save dynamic customizations for this order item
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

        // Update stock for non-service products
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

    echo json_encode([
        "success" => true,
        "message" => "Order created successfully",
        "order_id" => $order_id
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log('admin_create_order.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
