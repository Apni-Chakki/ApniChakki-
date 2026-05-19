<?php
// Admin: create coupon
require_once dirname(__DIR__, 2) . '/Config/connect.php';
header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || empty($data['code']) || !isset($data['discount_value'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Code and discount_value are required"]);
        exit;
    }

    $code = strtoupper(trim($data['code']));
    if (!preg_match('/^[A-Z0-9_-]{3,50}$/', $code)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid code format. Use 3-50 chars: A-Z, 0-9, _, -"]);
        exit;
    }

    $description = isset($data['description']) ? trim($data['description']) : null;
    $discount_type = (isset($data['discount_type']) && in_array($data['discount_type'], ['percentage','fixed'], true)) ? $data['discount_type'] : 'percentage';
    $discount_value = floatval($data['discount_value']);
    if ($discount_value <= 0) throw new Exception("discount_value must be > 0");
    if ($discount_type === 'percentage' && $discount_value > 100) $discount_value = 100;
    $min_order_amount = isset($data['min_order_amount']) ? floatval($data['min_order_amount']) : 0;
    $usage_limit = (isset($data['usage_limit']) && $data['usage_limit'] !== '' && $data['usage_limit'] !== null) ? (int)$data['usage_limit'] : null;
    $expiry_date = (isset($data['expiry_date']) && $data['expiry_date']) ? $data['expiry_date'] : null;
    $is_active = isset($data['is_active']) ? (int)!!$data['is_active'] : 1;
    $is_featured = isset($data['is_featured']) ? (int)!!$data['is_featured'] : 0;

    // Duplicate check
    $check = $conn->prepare("SELECT id FROM coupons WHERE code = ?");
    $check->bind_param("s", $code);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        $check->close();
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Coupon code already exists"]);
        exit;
    }
    $check->close();

    $stmt = $conn->prepare("INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, usage_limit, expiry_date, is_active, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssddisii", $code, $description, $discount_type, $discount_value, $min_order_amount, $usage_limit, $expiry_date, $is_active, $is_featured);

    if (!$stmt->execute()) throw new Exception("Insert failed: " . $stmt->error);
    $id = $stmt->insert_id;
    $stmt->close();

    http_response_code(201);
    echo json_encode(["success" => true, "id" => $id, "message" => "Coupon created"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
