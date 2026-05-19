<?php
// Public: validate coupon for checkout
require_once dirname(__DIR__, 2) . '/Config/connect.php';
header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || empty($data['code'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Coupon code required"]);
        exit;
    }

    $code = strtoupper(trim($data['code']));
    $subtotal = isset($data['subtotal']) ? floatval($data['subtotal']) : 0;
    $user_id = isset($data['user_id']) ? (int)$data['user_id'] : null;

    $stmt = $conn->prepare("SELECT * FROM coupons WHERE code = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        $stmt->close();
        echo json_encode(["success" => false, "message" => "Invalid coupon code"]);
        exit;
    }
    $coupon = $res->fetch_assoc();
    $stmt->close();

    // Check active
    if (!$coupon['is_active']) {
        echo json_encode(["success" => false, "message" => "Coupon is inactive"]);
        exit;
    }

    // Check expiry
    if ($coupon['expiry_date']) {
        $now = new DateTime();
        $expiry = new DateTime($coupon['expiry_date']);
        if ($now > $expiry) {
            echo json_encode(["success" => false, "message" => "Coupon has expired"]);
            exit;
        }
    }

    // Check usage limit
    if ($coupon['usage_limit'] && $coupon['used_count'] >= $coupon['usage_limit']) {
        echo json_encode(["success" => false, "message" => "Coupon usage limit reached"]);
        exit;
    }

    // Check min order amount
    if ($coupon['min_order_amount'] > 0 && $subtotal < $coupon['min_order_amount']) {
        echo json_encode(["success" => false, "message" => "Minimum order amount Rs. " . $coupon['min_order_amount'] . " required"]);
        exit;
    }

    // Calculate discount
    $discount_value = floatval($coupon['discount_value']);
    $discount_type = $coupon['discount_type'];
    $discount_amount = 0;

    if ($discount_type === 'percentage') {
        $discount_amount = $subtotal * ($discount_value / 100);
    } else {
        $discount_amount = $discount_value;
    }

    // Cap discount at subtotal
    $discount_amount = min($discount_amount, $subtotal);

    echo json_encode([
        "success" => true,
        "coupon" => [
            "id" => (int)$coupon['id'],
            "code" => $coupon['code'],
            "description" => $coupon['description'],
            "discount_type" => $discount_type,
            "discount_value" => $discount_value,
            "discount_amount" => round($discount_amount, 2),
            "min_order_amount" => floatval($coupon['min_order_amount'])
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
