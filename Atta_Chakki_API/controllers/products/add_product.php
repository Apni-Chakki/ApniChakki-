<?php
// add product api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || !isset($data['name']) || !isset($data['price'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Name and Price are required"]);
        exit;
    }

    $name = $data['name'];
    $price = floatval($data['price']);
    $unit = isset($data['unit']) ? $data['unit'] : 'kg';
    $category_name = isset($data['category']) ? $data['category'] : 'wheat';
    $description = isset($data['description']) ? $data['description'] : '';
    $image = isset($data['image']) ? $data['image'] : '';

    error_log('add_product.php: Processing - name=' . $name . ', price=' . $price . ', category=' . $category_name);

    // getting category id
    $cat_stmt = $conn->prepare("SELECT id FROM categories WHERE name = ?");
    if (!$cat_stmt) {
        throw new Exception("Category SELECT prepare failed: " . $conn->error);
    }
    $cat_stmt->bind_param("s", $category_name);
    if (!$cat_stmt->execute()) {
        throw new Exception("Category SELECT execute failed: " . $cat_stmt->error);
    }
    $cat_result = $cat_stmt->get_result();
    if (!$cat_result) {
        throw new Exception("Category SELECT get_result failed: " . $cat_stmt->error);
    }
    
    error_log('add_product.php: Category rows found = ' . $cat_result->num_rows);
    
    if ($cat_result->num_rows === 0) {
        // creating category if it doesnt exist
        error_log('add_product.php: Creating new category: ' . $category_name);
        $insert_cat = $conn->prepare("INSERT INTO categories (name) VALUES (?)");
        if (!$insert_cat) {
            throw new Exception("Category INSERT prepare failed: " . $conn->error);
        }
        $insert_cat->bind_param("s", $category_name);
        if (!$insert_cat->execute()) {
            throw new Exception("Category INSERT execute failed: " . $insert_cat->error);
        }
        $category_id = $insert_cat->insert_id;
        $insert_cat->close();
        error_log('add_product.php: Created category with id = ' . $category_id);
    } else {
        $cat_row = $cat_result->fetch_assoc();
        $category_id = $cat_row['id'];
        error_log('add_product.php: Found existing category with id = ' . $category_id);
    }
    $cat_stmt->close();

    $is_grinding_service = isset($data['is_grinding_service']) ? (int)$data['is_grinding_service'] : 0;
    $cleaning_price = isset($data['cleaning_price']) ? floatval($data['cleaning_price']) : 0.00;
    $grinding_price = isset($data['grinding_price']) ? floatval($data['grinding_price']) : 0.00;

    // Rental fields
    $is_rental = isset($data['is_rental']) ? (int)$data['is_rental'] : 0;
    $rental_price_per_day = isset($data['rental_price_per_day']) ? floatval($data['rental_price_per_day']) : 0.00;
    $security_deposit = isset($data['security_deposit']) ? floatval($data['security_deposit']) : 0.00;
    $late_penalty_per_day = isset($data['late_penalty_per_day']) ? floatval($data['late_penalty_per_day']) : 0.00;
    $rental_available_qty = isset($data['rental_available_qty']) ? intval($data['rental_available_qty']) : 0;

    $stock_quantity = isset($data['stock_quantity']) ? floatval($data['stock_quantity']) : 100.00;
    $min_stock_level = isset($data['min_stock_level']) ? floatval($data['min_stock_level']) : 10.00;
    $dual_unit = isset($data['dual_unit']) ? (int)$data['dual_unit'] : 0;
    $weight_options = isset($data['weight_options']) ? json_encode($data['weight_options']) : '[]';
    $is_custom_mix = isset($data['is_custom_mix']) ? (int)$data['is_custom_mix'] : 0;
    $track_inventory = isset($data['track_inventory']) ? (int)$data['track_inventory'] : 1;
    $discount_type = isset($data['discount_type']) ? $data['discount_type'] : 'none';
    $discount_value = isset($data['discount_value']) ? floatval($data['discount_value']) : 0.00;
    $badge_text = isset($data['badge_text']) ? $data['badge_text'] : null;
    $priority = isset($data['priority']) ? intval($data['priority']) : 0;

    // inserting the product
    $stmt = $conn->prepare("INSERT INTO products (name, price, unit, category_id, description, image_url, stock_quantity, min_stock_level, is_grinding_service, cleaning_price, grinding_price, is_rental, rental_price_per_day, security_deposit, late_penalty_per_day, rental_available_qty, dual_unit, weight_options, is_custom_mix, track_inventory, discount_type, discount_value, badge_text, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    // Types in order of parameters below:
    // name=s, price=d, unit=s, category_id=i, description=s, image=s,
    // stock_quantity=d, min_stock_level=d, is_grinding_service=i,
    // cleaning_price=d, grinding_price=d, is_rental=i,
    // rental_price_per_day=d, security_deposit=d, late_penalty_per_day=d,
    // rental_available_qty=i, dual_unit=i, weight_options=s,
    // is_custom_mix=i, track_inventory=i, discount_type=s,
    // discount_value=d, badge_text=s, priority=i
    $stmt->bind_param("sdsissddiddidddiisiisdsi",
        $name, $price, $unit, $category_id, $description, $image,
        $stock_quantity, $min_stock_level, $is_grinding_service,
        $cleaning_price, $grinding_price, $is_rental,
        $rental_price_per_day, $security_deposit, $late_penalty_per_day,
        $rental_available_qty, $dual_unit, $weight_options,
        $is_custom_mix, $track_inventory, $discount_type,
        $discount_value, $badge_text, $priority
    );

    if ($stmt->execute()) {
        $product_id = $stmt->insert_id;

        // Save Customizations
        if (isset($data['customizations']) && is_array($data['customizations'])) {
            $cust_stmt = $conn->prepare("INSERT INTO product_customizations (product_id, option_name, option_price, sort_order) VALUES (?, ?, ?, ?)");
            foreach ($data['customizations'] as $cust) {
                $opt_name = $cust['option_name'];
                $opt_price = floatval($cust['option_price']);
                $sort_order = intval($cust['sort_order'] ?? 0);
                $cust_stmt->bind_param("isdi", $product_id, $opt_name, $opt_price, $sort_order);
                $cust_stmt->execute();
            }
            $cust_stmt->close();
        }

        // Save Mix Items
        if (isset($data['mix_items']) && is_array($data['mix_items'])) {
            $mix_stmt = $conn->prepare("INSERT INTO product_mix_items (product_id, item_name, price_per_kg, default_ratio, sort_order) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['mix_items'] as $mix) {
                $item_name = $mix['item_name'];
                $price_per_kg = floatval($mix['price_per_kg']);
                $default_ratio = floatval($mix['default_ratio'] ?? 1.00);
                $sort_order = intval($mix['sort_order'] ?? 0);
                $mix_stmt->bind_param("isddi", $product_id, $item_name, $price_per_kg, $default_ratio, $sort_order);
                $mix_stmt->execute();
            }
            $mix_stmt->close();
        }

        http_response_code(201);
        echo json_encode(["success" => true, "message" => "Product added successfully", "id" => $product_id]);
    } else {
        throw new Exception("Error: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    error_log('add_product.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
