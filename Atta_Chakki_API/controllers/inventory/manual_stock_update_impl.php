<?php
// manual stock update api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['product_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Product ID is required']);
        exit;
    }
    
    $product_id = intval($data['product_id']);
    $notes = isset($data['notes']) ? $data['notes'] : null;
    
    // getting current stock
    $product_stmt = $conn->prepare("SELECT stock_quantity FROM products WHERE id = ?");
    if (!$product_stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    $product_stmt->bind_param("i", $product_id);
    $product_stmt->execute();
    $result = $product_stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        exit;
    }
    
    $prod = $result->fetch_assoc();
    $current_stock = floatval($prod['stock_quantity']);
    $new_stock = null;
    $quantity_change = 0;
    
    // calculating new stock
    if (isset($data['new_stock'])) {
        $new_stock = floatval($data['new_stock']);
    } elseif (isset($data['quantity']) && isset($data['type'])) {
        $quantity = floatval($data['quantity']);
        $type = $data['type'];
        
        if ($type === 'add') {
            $new_stock = $current_stock + $quantity;
        } elseif ($type === 'subtract' || $type === 'remove') {
            $new_stock = $current_stock - $quantity;
        } elseif ($type === 'set' || $type === 'adjust') {
            $new_stock = $quantity;
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid type. Use "add", "remove", or "adjust"']);
            exit;
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: provide either new_stock OR (quantity + type)']);
        exit;
    }
    
    if ($new_stock < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Stock cannot be negative']);
        exit;
    }
    
    $quantity_change = $new_stock - $current_stock;
    
    // updating stock in db
    $update = $conn->prepare("UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?");
    if (!$update) {
        throw new Exception("Update prepare failed: " . $conn->error);
    }
    $update->bind_param("di", $new_stock, $product_id);
    
    if (!$update->execute()) {
        throw new Exception("Failed to update stock: " . $update->error);
    }
    
    // logging the change
    $log_check = $conn->query("SHOW TABLES LIKE 'inventory_logs'");
    if ($log_check && $log_check->num_rows > 0) {
        $notes = isset($data['notes']) ? $data['notes'] : '';
        $reason = "Manual Update" . (!empty($notes) ? " - " . $notes : " - No notes provided");
        $log = $conn->prepare("INSERT INTO inventory_logs (product_id, quantity_change, reason, created_at) VALUES (?, ?, ?, NOW())");
        $log->bind_param("ids", $product_id, $quantity_change, $reason);
        $log->execute();
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Stock updated successfully',
        'old_stock' => $current_stock,
        'new_stock' => $new_stock,
        'change' => $quantity_change
    ]);
    
} catch (Exception $e) {
    error_log('Manual Stock Update Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
