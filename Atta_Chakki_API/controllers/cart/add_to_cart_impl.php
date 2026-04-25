<?php
// add to cart api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // checking required fields
    if (!isset($data['user_id']) || !isset($data['product_id']) || !isset($data['quantity'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: user_id, product_id, quantity']);
        exit;
    }
    
    $user_id = intval($data['user_id']);
    $product_id = intval($data['product_id']);
    $quantity = floatval($data['quantity']);
    
    if ($quantity <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Quantity must be greater than 0']);
        exit;
    }
    
    // checking product exists and has stock
    $prod_check = $conn->prepare("SELECT id, stock_quantity FROM products WHERE id = ?");
    $prod_check->bind_param("i", $product_id);
    $prod_check->execute();
    $prod_result = $prod_check->get_result();
    
    if ($prod_result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        exit;
    }
    
    $product = $prod_result->fetch_assoc();
    if ($product['stock_quantity'] < $quantity) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Insufficient stock. Available: ' . $product['stock_quantity']]);
        exit;
    }
    
    // getting or creating cart
    $cart_check = $conn->prepare("SELECT id FROM carts WHERE user_id = ?");
    $cart_check->bind_param("i", $user_id);
    $cart_check->execute();
    $cart_result = $cart_check->get_result();
    
    if ($cart_result->num_rows > 0) {
        $cart = $cart_result->fetch_assoc();
        $cart_id = $cart['id'];
    } else {
        $cart_create = $conn->prepare("INSERT INTO carts (user_id, created_at, updated_at) VALUES (?, NOW(), NOW())");
        $cart_create->bind_param("i", $user_id);
        if (!$cart_create->execute()) {
            throw new Exception("Failed to create cart: " . $cart_create->error);
        }
        $cart_id = $conn->insert_id;
    }
    
    // checking if item already in cart
    $item_check = $conn->prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?");
    $item_check->bind_param("ii", $cart_id, $product_id);
    $item_check->execute();
    $item_result = $item_check->get_result();
    
    if ($item_result->num_rows > 0) {
        // updating quantity
        $item = $item_result->fetch_assoc();
        $new_quantity = $item['quantity'] + $quantity;
        
        if ($new_quantity > $product['stock_quantity']) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Total quantity exceeds available stock']);
            exit;
        }
        
        $update = $conn->prepare("UPDATE cart_items SET quantity = ? WHERE id = ?");
        $update->bind_param("di", $new_quantity, $item['id']);
        if (!$update->execute()) {
            throw new Exception("Failed to update cart item: " . $update->error);
        }
    } else {
        // adding new item
        $insert = $conn->prepare("INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)");
        $insert->bind_param("iid", $cart_id, $product_id, $quantity);
        if (!$insert->execute()) {
            throw new Exception("Failed to add item to cart: " . $insert->error);
        }
    }
    
    // updating cart timestamp
    $update_cart = $conn->prepare("UPDATE carts SET updated_at = NOW() WHERE id = ?");
    $update_cart->bind_param("i", $cart_id);
    $update_cart->execute();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Item added to cart successfully',
        'cart_id' => $cart_id
    ]);
    
} catch (Exception $e) {
    error_log('Add to Cart Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
