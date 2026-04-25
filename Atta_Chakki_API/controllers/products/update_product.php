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

    // updating product
    $sql = "UPDATE products SET name=?, price=?, unit=?, category_id=?, description=?, image_url=? WHERE id=?";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    $stmt->bind_param("sdsissi", $name, $price, $unit, $category_id, $description, $image, $id);

    if ($stmt->execute()) {
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
