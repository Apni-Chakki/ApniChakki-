<?php
// update coupon api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();


try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || !isset($data['id']) || !isset($data['code']) || !isset($data['discount_value'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    $id = intval($data['id']);
    $code = strtoupper(trim($data['code']));
    $description = isset($data['description']) ? $data['description'] : '';
    $discount_type = isset($data['discount_type']) ? $data['discount_type'] : 'percentage';
    $discount_value = floatval($data['discount_value']);
    $min_order_amount = isset($data['min_order_amount']) ? floatval($data['min_order_amount']) : 0;
    $usage_limit = isset($data['usage_limit']) && $data['usage_limit'] !== '' ? intval($data['usage_limit']) : null;
    $expiry_date = isset($data['expiry_date']) && $data['expiry_date'] !== '' ? $data['expiry_date'] : null;
    $is_active = isset($data['is_active']) ? (int)$data['is_active'] : 1;
    $is_featured = isset($data['is_featured']) ? (int)$data['is_featured'] : 0;

    $stmt = $conn->prepare("UPDATE coupons SET code=?, description=?, discount_type=?, discount_value=?, min_order_amount=?, usage_limit=?, expiry_date=?, is_active=?, is_featured=? WHERE id=?");
    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    $stmt->bind_param("sssdidssii", $code, $description, $discount_type, $discount_value, $min_order_amount, $usage_limit, $expiry_date, $is_active, $is_featured, $id);

    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode(["success" => true, "message" => "Updated successfully"]);
    } else {
        throw new Exception("Execute Error: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
