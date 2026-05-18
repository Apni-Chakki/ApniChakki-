<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "No data received"]);
    exit;
}

if (empty($data['customer_name']) || empty($data['customer_phone'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Customer name and phone are required"]);
    exit;
}

$product_id = isset($data['product_id']) ? intval($data['product_id']) : null;
$product_name = isset($data['product_name']) ? $conn->real_escape_string($data['product_name']) : null;
$customer_name = $conn->real_escape_string($data['customer_name']);
$customer_phone = $conn->real_escape_string($data['customer_phone']);
$customer_email = isset($data['customer_email']) ? $conn->real_escape_string($data['customer_email']) : null;
$selected_items = isset($data['selected_items']) ? json_encode($data['selected_items']) : null;
$custom_items = isset($data['custom_items']) ? $conn->real_escape_string($data['custom_items']) : null;
$total_quantity = isset($data['total_quantity']) ? floatval($data['total_quantity']) : 0.00;
$estimated_price = isset($data['estimated_price']) ? floatval($data['estimated_price']) : 0.00;

$stmt = $conn->prepare("INSERT INTO custom_mix_requests (product_id, product_name, customer_name, customer_phone, customer_email, selected_items, custom_items, total_quantity, estimated_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}

$stmt->bind_param("issssssdd", $product_id, $product_name, $customer_name, $customer_phone, $customer_email, $selected_items, $custom_items, $total_quantity, $estimated_price);

if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode(["success" => true, "message" => "Custom mix request submitted successfully! We will contact you soon."]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to submit request: " . $stmt->error]);
}

$stmt->close();
$conn->close();
