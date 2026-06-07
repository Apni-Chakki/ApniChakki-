<?php
// create coupon api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || !isset($data['code']) || !isset($data['discount_value'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Code and discount value are required"]);
        exit;
    }

    $code = strtoupper(trim($data['code']));
    $description = isset($data['description']) ? $data['description'] : '';
    $discount_type = isset($data['discount_type']) ? $data['discount_type'] : 'percentage';
    $discount_value = floatval($data['discount_value']);
    $min_order_amount = isset($data['min_order_amount']) ? floatval($data['min_order_amount']) : 0;
    $usage_limit = isset($data['usage_limit']) && $data['usage_limit'] !== '' ? intval($data['usage_limit']) : null;
    $expiry_date = isset($data['expiry_date']) && $data['expiry_date'] !== '' ? $data['expiry_date'] : null;
    $is_active = isset($data['is_active']) ? (int)$data['is_active'] : 1;
    $is_featured = isset($data['is_featured']) ? (int)$data['is_featured'] : 0;

    $stmt = $conn->prepare("INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, usage_limit, expiry_date, is_active, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        throw new Exception("SQL Prepare Error: " . $conn->error);
    }

    $stmt->bind_param("sssdidssi", $code, $description, $discount_type, $discount_value, $min_order_amount, $usage_limit, $expiry_date, $is_active, $is_featured);

    if ($stmt->execute()) {
        $coupon_id = $stmt->insert_id;
        
        // Add Notification
        $notif_title = "New Promo Code!";
        $discount_text = $discount_type === 'percentage' ? "{$discount_value}% OFF" : "Rs. {$discount_value} OFF";
        $notif_message = "Use code {$code} to get {$discount_text}!";
        $notif_type = "coupon";
        
        $notif_stmt = $conn->prepare("INSERT INTO global_notifications (title, message, type) VALUES (?, ?, ?)");
        if ($notif_stmt) {
            $notif_stmt->bind_param("sss", $notif_title, $notif_message, $notif_type);
            $notif_stmt->execute();
            $notif_stmt->close();
        }

        http_response_code(201);
        echo json_encode(["success" => true, "message" => "Coupon created successfully", "id" => $coupon_id]);
    } else {
        throw new Exception("Execute Error: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
