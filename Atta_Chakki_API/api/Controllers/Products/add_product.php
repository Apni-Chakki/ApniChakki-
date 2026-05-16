<?php
// add product api — with dynamic service customizations support
require_once dirname(__DIR__, 2) . '/Config/connect.php';

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

    // Backward-compatible grinding fields — kept for old data
    $is_grinding_service = isset($data['is_grinding_service']) ? (int)$data['is_grinding_service'] : 0;
    $cleaning_price = isset($data['cleaning_price']) ? floatval($data['cleaning_price']) : 0.00;
    $grinding_price = isset($data['grinding_price']) ? floatval($data['grinding_price']) : 0.00;

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

    // inserting the product
    $stock_quantity = isset($data['stock_quantity']) ? floatval($data['stock_quantity']) : 100.00;
    $min_stock_level = isset($data['min_stock_level']) ? floatval($data['min_stock_level']) : 10.00;
    $track_inventory = isset($data['track_inventory']) ? (int)$data['track_inventory'] : 1;
    $dual_unit = isset($data['dual_unit']) ? (int)$data['dual_unit'] : 0;
    $weight_options = isset($data['weight_options']) && is_array($data['weight_options']) ? json_encode($data['weight_options']) : null;
    
    $stmt = $conn->prepare("INSERT INTO products (name, price, unit, dual_unit, weight_options, category_id, description, image_url, stock_quantity, min_stock_level, is_grinding_service, cleaning_price, grinding_price, track_inventory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    $stmt->bind_param("sdsisissddiddi", $name, $price, $unit, $dual_unit, $weight_options, $category_id, $description, $image, $stock_quantity, $min_stock_level, $is_grinding_service, $cleaning_price, $grinding_price, $track_inventory);

    if ($stmt->execute()) {
        $product_id = $stmt->insert_id;
        $stmt->close();

        // Insert dynamic customizations into product_customizations table
        if (!empty($customizations)) {
            $cust_stmt = $conn->prepare("INSERT INTO product_customizations (product_id, option_name, option_price, sort_order) VALUES (?, ?, ?, ?)");
            if (!$cust_stmt) {
                throw new Exception("Customization INSERT prepare failed: " . $conn->error);
            }

            foreach ($customizations as $index => $cust) {
                $opt_name = $cust['option_name'] ?? '';
                $opt_price = floatval($cust['option_price'] ?? 0);
                $sort = isset($cust['sort_order']) ? (int)$cust['sort_order'] : $index + 1;
                $cust_stmt->bind_param("isdi", $product_id, $opt_name, $opt_price, $sort);
                if (!$cust_stmt->execute()) {
                    error_log("Failed to insert customization: " . $cust_stmt->error);
                }
            }
            $cust_stmt->close();
        }

        http_response_code(201);
        echo json_encode(["success" => true, "message" => "Product added successfully", "id" => $product_id]);
    } else {
        throw new Exception("Error: " . $stmt->error);
    }

} catch (Exception $e) {
    http_response_code(500);
    error_log('add_product.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
