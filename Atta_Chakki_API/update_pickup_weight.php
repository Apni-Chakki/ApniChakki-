<?php
// API for admin to enter actual weights for pickup-request items when they arrive at shop
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';
require_once __DIR__ . '/controllers/orders/order_scheduler.php';

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
        echo json_encode(["success" => false, "message" => "order_id and items array are required"]);
        exit;
    }

    $order_id = intval($data['order_id']);
    $items = $data['items'];

    // check order exists
    $orderSql = "SELECT id FROM orders WHERE id = ?";
    $stmt = $conn->prepare($orderSql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $orderResult = $stmt->get_result();
    if ($orderResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Order not found"]);
        exit;
    }
    $stmt->close();

    $totalAmount = 0;

    foreach ($items as $item) {
        if (!isset($item['order_item_id']) || !isset($item['actual_weight_kg'])) {
            throw new Exception("Each item must have order_item_id and actual_weight_kg");
        }

        $order_item_id = intval($item['order_item_id']);
        $weight = floatval($item['actual_weight_kg']);
        if ($weight <= 0) {
            throw new Exception("Weight must be greater than 0");
        }

        // get product price for this order_item
        $itemSql = "SELECT oi.product_id, p.price FROM order_items oi 
                   JOIN products p ON oi.product_id = p.id 
                   WHERE oi.id = ? AND oi.order_id = ?";
        $stmt = $conn->prepare($itemSql);
        $stmt->bind_param("ii", $order_item_id, $order_id);
        $stmt->execute();
        $itemResult = $stmt->get_result();
        if ($itemResult->num_rows === 0) {
            throw new Exception("Order item not found: {$order_item_id}");
        }
        $itemData = $itemResult->fetch_assoc();
        $price = floatval($itemData['price']);
        $stmt->close();

        // calculate line total (weight * price)
        $lineTotal = $weight * $price;
        $totalAmount += $lineTotal;

        // update order_items quantity and price
        $updateSql = "UPDATE order_items SET quantity = ?, price_at_purchase = ? WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("ddi", $weight, $price, $order_item_id);
        if (!$stmt->execute()) {
            throw new Exception("Failed to update order item: " . $stmt->error);
        }
        $stmt->close();
    }

    // update orders total_amount
    $updateOrderSql = "UPDATE orders SET total_amount = ? WHERE id = ?";
    $stmt = $conn->prepare($updateOrderSql);
    $stmt->bind_param("di", $totalAmount, $order_id);
    if (!$stmt->execute()) {
        throw new Exception("Failed to update order total: " . $stmt->error);
    }
    $stmt->close();

    // call scheduler to assign date/ETA/processing time
    $scheduleResult = scheduleOrder($conn, $order_id);

    echo json_encode([
        "success" => true,
        "message" => "Weights updated and order scheduled",
        "new_total" => round($totalAmount, 2),
        "schedule" => $scheduleResult
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
