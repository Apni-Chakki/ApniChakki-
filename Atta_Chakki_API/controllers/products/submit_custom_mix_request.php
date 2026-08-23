<?php
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || !isset($data['customer_name']) || !isset($data['customer_phone'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Name and phone number are required"]);
        exit;
    }

    $product_id = isset($data['product_id']) ? intval($data['product_id']) : null;
    $product_name = isset($data['product_name']) ? $data['product_name'] : null;
    $customer_name = $data['customer_name'];
    $customer_phone = $data['customer_phone'];
    $customer_email = isset($data['customer_email']) ? $data['customer_email'] : null;
    $selected_items = isset($data['selected_items']) ? json_encode($data['selected_items']) : null;
    $custom_items = isset($data['custom_items']) ? $data['custom_items'] : null;
    $total_quantity = isset($data['total_quantity']) ? floatval($data['total_quantity']) : 0.00;
    $estimated_price = isset($data['estimated_price']) ? floatval($data['estimated_price']) : 0.00;

    $stmt = $conn->prepare("INSERT INTO custom_mix_requests (product_id, product_name, customer_name, customer_phone, customer_email, selected_items, custom_items, total_quantity, estimated_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')");
    
    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    $stmt->bind_param("issssssdd", $product_id, $product_name, $customer_name, $customer_phone, $customer_email, $selected_items, $custom_items, $total_quantity, $estimated_price);

    if ($stmt->execute()) {
        $inserted_id = $stmt->insert_id;
        require_once __DIR__ . '/../../utils/notification_helper.php';
        addAdminNotification($conn, "New Custom Mix Request", "A new custom mix request #$inserted_id has been submitted by $customer_name.", "custom_order", $inserted_id);
        http_response_code(201);
        echo json_encode(["success" => true, "message" => "Custom mix request submitted successfully!", "id" => $inserted_id]);
    } else {
        throw new Exception("Execute Error: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to submit request: " . $e->getMessage()]);
}

$conn->close();
