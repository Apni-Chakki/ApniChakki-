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

    // inserting the product
    $stock_quantity = 100;
    
    $stmt = $conn->prepare("INSERT INTO products (name, price, unit, category_id, description, image_url, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)");

    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    $stmt->bind_param("sdsissd", $name, $price, $unit, $category_id, $description, $image, $stock_quantity);

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
