<?php
// update cart item quantity
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['item_id']) || !isset($data['quantity'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }
    
    $item_id = intval($data['item_id']);
    $quantity = floatval($data['quantity']);
    
    if ($quantity <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Quantity must be greater than 0']);
        exit;
    }
    
    // getting item and checking stock
    $item_query = $conn->prepare("
        SELECT ci.product_id, p.stock_quantity
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.id = ?
    ");
    $item_query->bind_param("i", $item_id);
    $item_query->execute();
    $item_result = $item_query->get_result();
    
    if ($item_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cart item not found']);
        exit;
    }
    
    $item = $item_result->fetch_assoc();
    
    if ($quantity > $item['stock_quantity']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Quantity exceeds available stock']);
        exit;
    }
    
    // updating quantity
    $update = $conn->prepare("UPDATE cart_items SET quantity = ? WHERE id = ?");
    $update->bind_param("di", $quantity, $item_id);
    
    if (!$update->execute()) {
        throw new Exception("Failed to update cart item");
    }
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Cart item updated successfully']);
    
} catch (Exception $e) {
    error_log('Update Cart Item Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
