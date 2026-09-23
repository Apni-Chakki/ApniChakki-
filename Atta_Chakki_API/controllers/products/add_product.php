<?php
// add product api
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cache_helper.php';
require_once __DIR__ . '/../../utils/auth_middleware.php';

$user = require_admin();

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
    $description = isset($data['description']) ? $data['description'] : '';
    $description_ur = (isset($data['description_ur']) && trim($data['description_ur']) !== '') ? trim($data['description_ur']) : null;
    $image = isset($data['image']) ? $data['image'] : (isset($data['image_url']) ? $data['image_url'] : '');
    $category_id = null;

    // 1. Check category_id if provided
    if (isset($data['category_id']) && !empty($data['category_id'])) {
        $cid = intval($data['category_id']);
        $chk = $conn->prepare("SELECT id FROM categories WHERE id = ?");
        if ($chk) {
            $chk->bind_param("i", $cid);
            $chk->execute();
            $res = $chk->get_result();
            if ($res && $res->num_rows > 0) {
                $category_id = $cid;
            }
            $chk->close();
        }
    }

    // 2. Check category name if category_id not found
    if (!$category_id && isset($data['category']) && trim($data['category']) !== '') {
        $category_name = trim($data['category']);
        $cat_stmt = $conn->prepare("SELECT id FROM categories WHERE name = ?");
        if ($cat_stmt) {
            $cat_stmt->bind_param("s", $category_name);
            $cat_stmt->execute();
            $cat_result = $cat_stmt->get_result();
            if ($cat_result && $cat_result->num_rows > 0) {
                $cat_row = $cat_result->fetch_assoc();
                $category_id = intval($cat_row['id']);
            } else {
                $insert_cat = $conn->prepare("INSERT INTO categories (name) VALUES (?)");
                if ($insert_cat) {
                    $insert_cat->bind_param("s", $category_name);
                    if ($insert_cat->execute()) {
                        $category_id = $insert_cat->insert_id;
                    }
                    $insert_cat->close();
                }
            }
            $cat_stmt->close();
        }
    }

    // 3. Fallback to first existing active category
    if (!$category_id) {
        $fb = $conn->query("SELECT id FROM categories WHERE is_active = 1 ORDER BY id ASC LIMIT 1");
        if ($fb && $fb->num_rows > 0) {
            $category_id = intval($fb->fetch_assoc()['id']);
        }
    }

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
    
    $wOpt = $data['weight_options'] ?? null;
    if (is_array($wOpt)) {
        $weight_options = json_encode(array_values(array_map('floatval', $wOpt)));
    } elseif (is_string($wOpt) && trim($wOpt) !== '') {
        $decoded = json_decode($wOpt, true);
        if (is_string($decoded)) {
            $decoded = json_decode($decoded, true);
        }
        $weight_options = is_array($decoded) ? json_encode(array_values(array_map('floatval', $decoded))) : '[]';
    } else {
        $weight_options = '[]';
    }
    $is_custom_mix = isset($data['is_custom_mix']) ? (int)$data['is_custom_mix'] : 0;
    $track_inventory = isset($data['track_inventory']) ? (int)$data['track_inventory'] : 1;
    $discount_type = isset($data['discount_type']) ? $data['discount_type'] : 'none';
    $discount_value = isset($data['discount_value']) ? floatval($data['discount_value']) : 0.00;
    $badge_text = isset($data['badge_text']) ? $data['badge_text'] : null;
    $priority = isset($data['priority']) ? intval($data['priority']) : 0;
    $customization_pricing_mode = isset($data['customization_pricing_mode']) && in_array($data['customization_pricing_mode'], ['additive', 'average']) ? $data['customization_pricing_mode'] : 'additive';
    $customization_note = isset($data['customization_note']) && trim($data['customization_note']) !== '' ? trim($data['customization_note']) : null;

    // inserting the product
    $stmt = $conn->prepare("INSERT INTO products (name, price, unit, category_id, description, description_ur, image_url, stock_quantity, min_stock_level, is_grinding_service, customization_pricing_mode, customization_note, cleaning_price, grinding_price, is_rental, rental_price_per_day, security_deposit, late_penalty_per_day, rental_available_qty, dual_unit, weight_options, is_custom_mix, track_inventory, discount_type, discount_value, badge_text, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    // Types in order of parameters below:
    $stmt->bind_param("sdsisssddissddidddiisiisdsi",
        $name, $price, $unit, $category_id, $description, $description_ur, $image,
        $stock_quantity, $min_stock_level, $is_grinding_service, $customization_pricing_mode,
        $customization_note,
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
            $cust_stmt = $conn->prepare("INSERT INTO product_customizations (product_id, linked_product_id, option_name, option_price, sort_order) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['customizations'] as $cust) {
                $linked_product_id = !empty($cust['linked_product_id']) ? intval($cust['linked_product_id']) : null;
                $opt_name = $cust['option_name'];
                $opt_price = floatval($cust['option_price']);
                $sort_order = intval($cust['sort_order'] ?? 0);
                $cust_stmt->bind_param("iisdi", $product_id, $linked_product_id, $opt_name, $opt_price, $sort_order);
                $cust_stmt->execute();
            }
            $cust_stmt->close();
        }

        // Save Mix Items
        if (isset($data['mix_items']) && is_array($data['mix_items'])) {
            $mix_stmt = $conn->prepare("INSERT INTO product_mix_items (product_id, product_ingredient_id, item_name, price_per_kg, default_ratio, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
            foreach ($data['mix_items'] as $mix) {
                $product_ingredient_id = !empty($mix['product_ingredient_id']) ? intval($mix['product_ingredient_id']) : null;
                $item_name = $mix['item_name'];
                $price_per_kg = floatval($mix['price_per_kg']);
                $default_ratio = floatval($mix['default_ratio'] ?? 1.00);
                $sort_order = intval($mix['sort_order'] ?? 0);
                $mix_stmt->bind_param("iisddi", $product_id, $product_ingredient_id, $item_name, $price_per_kg, $default_ratio, $sort_order);
                $mix_stmt->execute();
            }
            $mix_stmt->close();
        }

        clear_api_cache();
        http_response_code(201);
        echo json_encode(["success" => true, "status" => "success", "message" => "Product added successfully", "id" => $product_id]);
    } else {
        throw new Exception("Error: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    error_log('add_product.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
