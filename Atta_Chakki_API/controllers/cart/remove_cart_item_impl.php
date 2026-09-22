<?php
// remove item from cart
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/auth_middleware.php';

header('Content-Type: application/json');

$user = require_auth();

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['item_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required field: item_id']);
        exit;
    }
    
    $item_id = intval($data['item_id']);

    // verify ownership
    $check = $conn->prepare("SELECT c.user_id FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE ci.id = ?");
    $check->bind_param("i", $item_id);
    $check->execute();
    $res = $check->get_result();
    if ($res->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cart item not found']);
        exit;
    }
    $row = $res->fetch_assoc();
    $check->close();

    $isAdmin = isset($user['role']) && $user['role'] === 'admin';
    if (!$isAdmin && intval($row['user_id']) !== intval($user['id'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Forbidden: You cannot modify another user\'s cart']);
        exit;
    }
    
    $delete = $conn->prepare("DELETE FROM cart_items WHERE id = ?");
    $delete->bind_param("i", $item_id);
    
    if (!$delete->execute()) {
        throw new Exception("Failed to remove cart item");
    }
    
    if ($delete->affected_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cart item not found']);
        exit;
    }
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Item removed from cart']);
    
} catch (Exception $e) {
    error_log('Remove Cart Item Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
