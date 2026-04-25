<?php
// get cart api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if (!isset($_GET['user_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required parameter: user_id']);
        exit;
    }
    
    $user_id = intval($_GET['user_id']);
    
    // finding users cart
    $cart_query = $conn->prepare("SELECT id FROM carts WHERE user_id = ?");
    $cart_query->bind_param("i", $user_id);
    $cart_query->execute();
    $cart_result = $cart_query->get_result();
    
    if ($cart_result->num_rows === 0) {
        echo json_encode([
            'success' => true,
            'cart' => [],
            'total' => 0,
            'item_count' => 0
        ]);
        exit;
    }
    
    $cart = $cart_result->fetch_assoc();
    $cart_id = $cart['id'];
    
    // getting items with product info
    $items_query = $conn->prepare("
        SELECT 
            ci.id,
            ci.product_id,
            ci.quantity,
            p.name,
            p.price,
            p.unit,
            p.image_url,
            (ci.quantity * p.price) as subtotal
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_id = ?
    ");
    $items_query->bind_param("i", $cart_id);
    $items_query->execute();
    $items_result = $items_query->get_result();
    
    $items = [];
    $total = 0;
    
    while ($item = $items_result->fetch_assoc()) {
        $items[] = [
            'id' => (int)$item['id'],
            'product_id' => (int)$item['product_id'],
            'name' => $item['name'],
            'quantity' => floatval($item['quantity']),
            'price' => floatval($item['price']),
            'unit' => $item['unit'],
            'image_url' => $item['image_url'],
            'subtotal' => floatval($item['subtotal'])
        ];
        $total += floatval($item['subtotal']);
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'cart_id' => $cart_id,
        'items' => $items,
        'total' => round($total, 2),
        'item_count' => count($items)
    ]);
    
} catch (Exception $e) {
    error_log('Get Cart Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
