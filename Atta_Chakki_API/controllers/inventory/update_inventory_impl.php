<?php
// update inventory from orders or manual updates
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Support for bulk update from inventoryUtils.js
    if (isset($data['action']) && isset($data['items']) && is_array($data['items'])) {
        $action = $data['action']; // 'deduct' or 'restore'
        $items = $data['items'];
        
        $conn->begin_transaction();
        
        $update = $conn->prepare("UPDATE products SET stock_quantity = GREATEST(0, stock_quantity + ?) WHERE id = ?");
        $log = null;
        
        $log_check = $conn->query("SHOW TABLES LIKE 'inventory_logs'");
        if ($log_check->num_rows > 0) {
            $log = $conn->prepare("INSERT INTO inventory_logs (product_id, quantity_change, reason, created_at) VALUES (?, ?, ?, NOW())");
        }
        
        foreach ($items as $item) {
            $product_id = isset($item['product_id']) ? intval($item['product_id']) : (isset($item['id']) ? intval($item['id']) : 0);
            $qty = isset($item['quantity']) ? floatval($item['quantity']) : 0;
            
            if ($product_id > 0 && $qty > 0) {
                // Ignore service/trip items (if unit is trip, stock doesn't matter, but here we just update if it exists)
                // 'deduct' means stock decreases, 'restore' means stock increases
                $quantity_change = ($action === 'deduct') ? -$qty : $qty;
                $reason = 'order_' . $action;
                
                $update->bind_param("di", $quantity_change, $product_id);
                $update->execute();
                
                if ($log) {
                    $log->bind_param("ids", $product_id, $quantity_change, $reason);
                    $log->execute();
                }
            }
        }
        
        $update->close();
        if ($log) $log->close();
        
        $conn->commit();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Bulk inventory updated successfully'
        ]);
        exit;
    }

    // Single item update fallback (for manual inventory management)
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
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    error_log('Update Inventory Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn)) {
    $conn->close();
}
