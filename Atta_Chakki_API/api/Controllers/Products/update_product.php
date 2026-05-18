<?php
// update product api — with dynamic service customizations support
require_once dirname(__DIR__, 2) . '/Config/connect.php';

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

    // Backward-compatible grinding fields
    $is_grinding_service = isset($data['is_grinding_service']) ? (int)$data['is_grinding_service'] : 0;
    $cleaning_price = isset($data['cleaning_price']) ? floatval($data['cleaning_price']) : 0.00;
    $grinding_price = isset($data['grinding_price']) ? floatval($data['grinding_price']) : 0.00;

    // Custom mix fields
    $is_custom_mix = isset($data['is_custom_mix']) ? (int)$data['is_custom_mix'] : 0;
    $mix_items = isset($data['mix_items']) ? $data['mix_items'] : [];

    // Dynamic customizations array from frontend
    $customizations = isset($data['customizations']) ? $data['customizations'] : [];

    // If customizations array is provided, mark as grinding_service for backward compat
    if (!empty($customizations)) {
        $is_grinding_service = 1;
        // Auto-calculate total price from customizations
        $total_price = 0;
        foreach ($customizations as $c) {
            $total_price += floatval($c['option_price'] ?? 0);
        }
        $price = $total_price;

        // backward compat: try to fill cleaning/grinding from customization names
        $cleaning_price = 0;
        $grinding_price = 0;
        foreach ($customizations as $c) {
            $lower = strtolower($c['option_name'] ?? '');
            if (strpos($lower, 'clean') !== false) $cleaning_price = floatval($c['option_price'] ?? 0);
            if (strpos($lower, 'grind') !== false) $grinding_price = floatval($c['option_price'] ?? 0);
        }
    }

    $track_inventory = isset($data['track_inventory']) ? (int)$data['track_inventory'] : 1;
    $dual_unit = isset($data['dual_unit']) ? (int)$data['dual_unit'] : 0;
    $weight_options = isset($data['weight_options']) && is_array($data['weight_options']) ? json_encode($data['weight_options']) : null;

    // updating product
    $sql = "UPDATE products SET name=?, price=?, unit=?, dual_unit=?, weight_options=?, category_id=?, description=?, image_url=?, is_grinding_service=?, cleaning_price=?, grinding_price=?, track_inventory=?, is_custom_mix=? WHERE id=?";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    $stmt->bind_param("sdsisissiddiii", $name, $price, $unit, $dual_unit, $weight_options, $category_id, $description, $image, $is_grinding_service, $cleaning_price, $grinding_price, $track_inventory, $is_custom_mix, $id);

    if ($stmt->execute()) {
        $stmt->close();

        // Delete old customizations and insert fresh ones (replace strategy)
        $del_stmt = $conn->prepare("DELETE FROM product_customizations WHERE product_id = ?");
        $del_stmt->bind_param("i", $id);
        $del_stmt->execute();
        $del_stmt->close();

        if (!empty($customizations) && !$is_custom_mix) {
            $cust_stmt = $conn->prepare("INSERT INTO product_customizations (product_id, option_name, option_price, sort_order) VALUES (?, ?, ?, ?)");
            if (!$cust_stmt) {
                throw new Exception("Customization INSERT prepare failed: " . $conn->error);
            }

            foreach ($customizations as $index => $cust) {
                $opt_name = $cust['option_name'] ?? '';
                $opt_price = floatval($cust['option_price'] ?? 0);
                $sort = isset($cust['sort_order']) ? (int)$cust['sort_order'] : $index + 1;
                $cust_stmt->bind_param("isdi", $id, $opt_name, $opt_price, $sort);
                if (!$cust_stmt->execute()) {
                    error_log("Failed to insert customization: " . $cust_stmt->error);
                }
            }
            $cust_stmt->close();
        }

        // Handle mix items replace strategy
        $del_mix_stmt = $conn->prepare("DELETE FROM product_mix_items WHERE product_id = ?");
        $del_mix_stmt->bind_param("i", $id);
        $del_mix_stmt->execute();
        $del_mix_stmt->close();

        if ($is_custom_mix && !empty($mix_items)) {
            $mix_stmt = $conn->prepare("INSERT INTO product_mix_items (product_id, item_name, price_per_kg, default_ratio, sort_order) VALUES (?, ?, ?, ?, ?)");
            if (!$mix_stmt) {
                throw new Exception("Mix items INSERT prepare failed: " . $conn->error);
            }

            foreach ($mix_items as $index => $item) {
                $item_name = $item['item_name'] ?? '';
                $price_per_kg = floatval($item['price_per_kg'] ?? 0);
                $default_ratio = floatval($item['default_ratio'] ?? 1.00);
                $sort = isset($item['sort_order']) ? (int)$item['sort_order'] : $index + 1;
                $mix_stmt->bind_param("isddi", $id, $item_name, $price_per_kg, $default_ratio, $sort);
                if (!$mix_stmt->execute()) {
                    error_log("Failed to insert mix item: " . $mix_stmt->error);
                }
            }
            $mix_stmt->close();
        }

        http_response_code(200);
        echo json_encode(["success" => true, "message" => "Updated successfully"]);
    } else {
        throw new Exception("Execute Error: " . $stmt->error);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
