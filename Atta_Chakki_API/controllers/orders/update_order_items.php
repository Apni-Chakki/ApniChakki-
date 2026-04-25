<?php
// update order items api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['order_id']) || !isset($data['items']) || !is_array($data['items'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Order ID and items array are required"]);
        exit;
    }
    
    $order_id = intval($data['order_id']);
    $items = $data['items'];
    
    // checking if order exists
    $orderSql = "SELECT id, total_amount FROM orders WHERE id = ?";
    $stmt = $conn->prepare($orderSql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $orderResult = $stmt->get_result();
    
    if ($orderResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Order not found"]);
        exit;
    }
    
    $order = $orderResult->fetch_assoc();
    $stmt->close();
    
    $totalAmount = 0;
    
    // updating each item
    foreach ($items as $item) {
        if (!isset($item['order_item_id']) || !isset($item['quantity'])) {
            throw new Exception("Each item must have order_item_id and quantity");
        }
        
        $order_item_id = intval($item['order_item_id']);
        $quantity = floatval($item['quantity']);
        
        if ($quantity <= 0) {
            throw new Exception("Quantity must be greater than 0");
        }
        
        // getting price for this item
        $itemSql = "SELECT oi.product_id, p.price FROM order_items oi 
                   JOIN products p ON oi.product_id = p.id 
                   WHERE oi.id = ? AND oi.order_id = ?";
        $stmt = $conn->prepare($itemSql);
        $stmt->bind_param("ii", $order_item_id, $order_id);
        $stmt->execute();
        $itemResult = $stmt->get_result();
        
        if ($itemResult->num_rows === 0) {
            throw new Exception("Order item not found");
        }
        
        $itemData = $itemResult->fetch_assoc();
        $price = floatval($itemData['price']);
        $stmt->close();
        
        // calculating line total
        $lineTotal = $quantity * $price;
        $totalAmount += $lineTotal;
        
        // updating item
        $updateSql = "UPDATE order_items SET quantity = ?, price_at_purchase = ? WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("ddi", $quantity, $price, $order_item_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to update item: " . $stmt->error);
        }
        $stmt->close();
    }
    
    // updating order total
    $updateOrderSql = "UPDATE orders SET total_amount = ? WHERE id = ?";
    $stmt = $conn->prepare($updateOrderSql);
    $stmt->bind_param("di", $totalAmount, $order_id);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update order total: " . $stmt->error);
    }
    $stmt->close();
    
    echo json_encode([
        "success" => true,
        "message" => "Order items updated successfully",
        "new_total" => round($totalAmount, 2)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error updating order items: " . $e->getMessage()
    ]);
}
