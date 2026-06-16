<?php
// update product api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || !isset($data['id']) || !isset($data['name']) || !isset($data['price'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing required fields (id, name, price)"]);
        exit;
    }

    $id = intval($data['id']);
    $name = $data['name'];
    $price = floatval($data['price']);
    $unit = (isset($data['unit']) && $data['unit'] !== null) ? $data['unit'] : 'kg';
    $category_name = (isset($data['category']) && $data['category'] !== null) ? $data['category'] : 'wheat';
    $description = (isset($data['description']) && $data['description'] !== null) ? $data['description'] : '';
    $image = (isset($data['image']) && $data['image'] !== null) ? $data['image'] : '';

    // getting or creating category
    $cat_stmt = $conn->prepare("SELECT id FROM categories WHERE name = ?");
    $cat_stmt->bind_param("s", $category_name);
    $cat_stmt->execute();
    $cat_result = $cat_stmt->get_result();
    
    if ($cat_result->num_rows === 0) {
        $insert_cat = $conn->prepare("INSERT INTO categories (name) VALUES (?)");
        $insert_cat->bind_param("s", $category_name);
        if ($insert_cat->execute()) {
            $category_id = $insert_cat->insert_id;
            $insert_cat->close();
        } else {
            throw new Exception("Failed to create category: " . $insert_cat->error);
        }
    } else {
        $cat_row = $cat_result->fetch_assoc();
        $category_id = $cat_row['id'];
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
    $priority = isset($data['priority']) ? intval($data['priority']) : 0;

    $stock_quantity = isset($data['stock_quantity']) ? floatval($data['stock_quantity']) : 100.00;
    $min_stock_level = isset($data['min_stock_level']) ? floatval($data['min_stock_level']) : 10.00;
    $dual_unit = isset($data['dual_unit']) ? (int)$data['dual_unit'] : 0;
    $weight_options = isset($data['weight_options']) ? json_encode($data['weight_options']) : '[]';
    $is_custom_mix = isset($data['is_custom_mix']) ? (int)$data['is_custom_mix'] : 0;
    $track_inventory = isset($data['track_inventory']) ? (int)$data['track_inventory'] : 1;
    $discount_type = isset($data['discount_type']) ? $data['discount_type'] : 'none';
    $discount_value = isset($data['discount_value']) ? floatval($data['discount_value']) : 0.00;
    $badge_text = isset($data['badge_text']) ? $data['badge_text'] : null;

    // updating product
    $sql = "UPDATE products SET name=?, price=?, unit=?, category_id=?, description=?, image_url=?, stock_quantity=?, min_stock_level=?, is_grinding_service=?, cleaning_price=?, grinding_price=?, is_rental=?, rental_price_per_day=?, security_deposit=?, late_penalty_per_day=?, rental_available_qty=?, dual_unit=?, weight_options=?, is_custom_mix=?, track_inventory=?, discount_type=?, discount_value=?, badge_text=?, priority=? WHERE id=?";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    $stmt->bind_param("sdsissddidddidddisisdsdii", 
        $name, $price, $unit, $category_id, $description, $image, 
        $stock_quantity, $min_stock_level, $is_grinding_service, 
        $cleaning_price, $grinding_price, $is_rental, 
        $rental_price_per_day, $security_deposit, $late_penalty_per_day, 
        $rental_available_qty, $dual_unit, $weight_options, 
        $is_custom_mix, $track_inventory, $discount_type, 
        $discount_value, $badge_text, $priority, $id
    );

    if ($stmt->execute()) {
        // Sync Customizations
        $conn->query("DELETE FROM product_customizations WHERE product_id = $id");
        if (isset($data['customizations']) && is_array($data['customizations'])) {
            $cust_stmt = $conn->prepare("INSERT INTO product_customizations (product_id, option_name, option_price, sort_order) VALUES (?, ?, ?, ?)");
            foreach ($data['customizations'] as $cust) {
                $opt_name = $cust['option_name'];
                $opt_price = floatval($cust['option_price']);
                $sort_order = intval($cust['sort_order'] ?? 0);
                $cust_stmt->bind_param("isdi", $id, $opt_name, $opt_price, $sort_order);
                $cust_stmt->execute();
            }
            $cust_stmt->close();
        }

        // Sync Mix Items
        $conn->query("DELETE FROM product_mix_items WHERE product_id = $id");
        if (isset($data['mix_items']) && is_array($data['mix_items'])) {
            $mix_stmt = $conn->prepare("INSERT INTO product_mix_items (product_id, item_name, price_per_kg, default_ratio, sort_order) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['mix_items'] as $mix) {
                $item_name = $mix['item_name'];
                $price_per_kg = floatval($mix['price_per_kg']);
                $default_ratio = floatval($mix['default_ratio'] ?? 1.00);
                $sort_order = intval($mix['sort_order'] ?? 0);
                $mix_stmt->bind_param("isddi", $id, $item_name, $price_per_kg, $default_ratio, $sort_order);
                $mix_stmt->execute();
            }
            $mix_stmt->close();
        }

        http_response_code(200);
        echo json_encode(["success" => true, "message" => "Updated successfully"]);
    } else {
        throw new Exception("Execute Error: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
