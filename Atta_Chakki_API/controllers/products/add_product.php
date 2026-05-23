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

    // inserting the product
    $stock_quantity = 100;
    
    $stmt = $conn->prepare("INSERT INTO products (name, price, unit, category_id, description, image_url, stock_quantity, is_grinding_service, cleaning_price, grinding_price, is_rental, rental_price_per_day, security_deposit, late_penalty_per_day, rental_available_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    $stmt->bind_param("sdsissdiddidddi", $name, $price, $unit, $category_id, $description, $image, $stock_quantity, $is_grinding_service, $cleaning_price, $grinding_price, $is_rental, $rental_price_per_day, $security_deposit, $late_penalty_per_day, $rental_available_qty);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(["success" => true, "message" => "Product added successfully", "id" => $stmt->insert_id]);
    } else {
        throw new Exception("Error: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    error_log('add_product.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
