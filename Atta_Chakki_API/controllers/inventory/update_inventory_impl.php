<?php
// update inventory from orders
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['product_id']) || !isset($data['quantity_change'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }
    
    $product_id = intval($data['product_id']);
    $quantity_change = floatval($data['quantity_change']);
    $reason = isset($data['reason']) ? $data['reason'] : 'manual_update';
    
    // getting current stock
    $product = $conn->prepare("SELECT stock_quantity FROM products WHERE id = ?");
    $product->bind_param("i", $product_id);
    $product->execute();
    $result = $product->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        exit;
    }
    
    $prod = $result->fetch_assoc();
    $new_stock = floatval($prod['stock_quantity']) + $quantity_change;
    
    // cant go negative
    if ($new_stock < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Insufficient stock for this operation']);
        exit;
    }
    
    // updating stock
    $update = $conn->prepare("UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?");
    $update->bind_param("di", $new_stock, $product_id);
    
    if (!$update->execute()) {
        throw new Exception("Failed to update inventory");
    }
    
    // logging the change
    $log_check = $conn->query("SHOW TABLES LIKE 'inventory_logs'");
    if ($log_check->num_rows > 0) {
        $log = $conn->prepare("INSERT INTO inventory_logs (product_id, quantity_change, reason, created_at) VALUES (?, ?, ?, NOW())");
        $log->bind_param("ids", $product_id, $quantity_change, $reason);
        $log->execute();
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Inventory updated successfully',
        'new_stock' => $new_stock
    ]);
    
} catch (Exception $e) {
    error_log('Update Inventory Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
