<?php
// split_large_order.php
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $order_id = intval($data['order_id'] ?? 0);
    $today_weight = floatval($data['today_weight'] ?? 0);
    $tomorrow_weight = floatval($data['tomorrow_weight'] ?? 0);

    if (!$order_id || $today_weight <= 0 || $tomorrow_weight <= 0) {
        throw new Exception("Invalid split weights.");
    }

    $conn->begin_transaction();

    // 1. Get original order
    $sql = "SELECT * FROM orders WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $origOrder = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$origOrder) {
        throw new Exception("Order not found");
    }

    // 2. Get original items
    $itemsSql = "SELECT * FROM order_items WHERE order_id = ?";
    $itemsStmt = $conn->prepare($itemsSql);
    $itemsStmt->bind_param("i", $order_id);
    $itemsStmt->execute();
    $itemsRes = $itemsStmt->get_result();
    $origItems = [];
    $totalOriginalWeight = 0;
    while($item = $itemsRes->fetch_assoc()) {
        $origItems[] = $item;
        $totalOriginalWeight += floatval($item['quantity']); // assuming quantity is weight in kg
    }
    $itemsStmt->close();

    if ($totalOriginalWeight <= 0) {
        throw new Exception("Order has no weight/quantity to split.");
    }

    // Ratio for today
    $ratioToday = $today_weight / ($today_weight + $tomorrow_weight);
    $ratioTomorrow = $tomorrow_weight / ($today_weight + $tomorrow_weight);

    // Update original order to be "Today's" order
    $todayAmount = $origOrder['total_amount'] * $ratioToday;
    $todayPaid = $origOrder['amount_paid'] * $ratioToday;
    
    // Update original order amounts and weight
    $updOrder = $conn->prepare("UPDATE orders SET total_amount = ?, amount_paid = ?, assigned_date = ?, status = 'processing' WHERE id = ?");
    $today_date = date('Y-m-d');
    $updOrder->bind_param("ddsi", $todayAmount, $todayPaid, $today_date, $order_id);
    $updOrder->execute();
    $updOrder->close();

    // Update original items
    $updItem = $conn->prepare("UPDATE order_items SET quantity = ? WHERE id = ?");
    foreach($origItems as $item) {
        $newQty = floatval($item['quantity']) * $ratioToday;
        $updItem->bind_param("di", $newQty, $item['id']);
        $updItem->execute();
    }
    $updItem->close();

    // Create Tomorrow's order
    $tomorrowAmount = $origOrder['total_amount'] * $ratioTomorrow;
    $tomorrowPaid = $origOrder['amount_paid'] * $ratioTomorrow;
    $tomorrow_date = date('Y-m-d', strtotime('+1 day'));

    $insOrder = $conn->prepare("INSERT INTO orders (user_id, total_amount, amount_paid, status, order_type, shipping_address, payment_method, payment_status, assigned_date, special_instructions, created_at, driver_name, driver_phone) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $insOrder->bind_param("iddsssssssss", 
        $origOrder['user_id'], 
        $tomorrowAmount, 
        $tomorrowPaid,
        $origOrder['order_type'],
        $origOrder['shipping_address'],
        $origOrder['payment_method'],
        $origOrder['payment_status'],
        $tomorrow_date,
        $origOrder['special_instructions'],
        $origOrder['created_at'],
        $origOrder['driver_name'],
        $origOrder['driver_phone']
    );
    $insOrder->execute();
    $newOrderId = $conn->insert_id;
    $insOrder->close();

    // insert tomorrow's items
    $insItem = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)");
    foreach($origItems as $item) {
        $newQty = floatval($item['quantity']) * $ratioTomorrow;
        $insItem->bind_param("iidd", $newOrderId, $item['product_id'], $newQty, $item['price_at_purchase']);
        $insItem->execute();
    }
    $insItem->close();

    $conn->commit();

    echo json_encode(["success" => true, "message" => "Order split successfully: Today ({$today_weight}kg) & Tomorrow ({$tomorrow_weight}kg)"]);

} catch (Exception $e) {
    if(isset($conn)) $conn->rollback();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
