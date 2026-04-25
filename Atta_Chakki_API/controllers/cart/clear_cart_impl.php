<?php
// clear cart api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['user_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required field: user_id']);
        exit;
    }
    
    $user_id = intval($data['user_id']);
    
    // finding the cart
    $cart_query = $conn->prepare("SELECT id FROM carts WHERE user_id = ?");
    $cart_query->bind_param("i", $user_id);
    $cart_query->execute();
    $cart_result = $cart_query->get_result();
    
    if ($cart_result->num_rows === 0) {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Cart already empty']);
        exit;
    }
    
    $cart = $cart_result->fetch_assoc();
    
    // removing all items
    $delete = $conn->prepare("DELETE FROM cart_items WHERE cart_id = ?");
    $delete->bind_param("i", $cart['id']);
    
    if (!$delete->execute()) {
        throw new Exception("Failed to clear cart");
    }
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Cart cleared successfully']);
    
} catch (Exception $e) {
    error_log('Clear Cart Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
