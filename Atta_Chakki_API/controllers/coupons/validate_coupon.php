<?php
// controllers/coupons/validate_coupon.php
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    // Read raw input
    $input = json_decode(file_get_contents('php://input'), true);
    $code = isset($input['code']) ? trim($input['code']) : '';
    $subtotal = isset($input['subtotal']) ? floatval($input['subtotal']) : 0;
    $user_id = isset($input['user_id']) ? intval($input['user_id']) : null;

    if (empty($code)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Coupon code is required'
        ]);
        exit;
    }

    // Query active coupon
    $stmt = $conn->prepare("SELECT id, code, discount_type, discount_value, min_order_amount, usage_limit, used_count, expiry_date, is_active FROM coupons WHERE code = ? AND is_active = 1 LIMIT 1");
    if (!$stmt) {
        throw new Exception("Database prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or inactive coupon code'
        ]);
        exit;
    }

    $coupon = $result->fetch_assoc();
    $stmt->close();

    // Check expiry
    if ($coupon['expiry_date'] !== null) {
        $expiry = new DateTime($coupon['expiry_date']);
        $now = new DateTime();
        if ($now > $expiry) {
            echo json_encode([
                'success' => false,
                'message' => 'This coupon has expired'
            ]);
            exit;
        }
    }

    // Check usage limit
    if ($coupon['usage_limit'] !== null) {
        if ($coupon['used_count'] >= $coupon['usage_limit']) {
            echo json_encode([
                'success' => false,
                'message' => 'This coupon usage limit has been reached'
            ]);
            exit;
        }
    }

    // Check minimum order amount
    $min_amount = floatval($coupon['min_order_amount']);
    if ($subtotal < $min_amount) {
        echo json_encode([
            'success' => false,
            'message' => 'Minimum order amount of Rs. ' . number_format($min_amount, 2) . ' is required to use this coupon'
        ]);
        exit;
    }

    // Calculate discount amount
    $discount_type = $coupon['discount_type'];
    $discount_val = floatval($coupon['discount_value']);
    $discount_amount = 0;

    if ($discount_type === 'percentage') {
        $discount_amount = ($subtotal * $discount_val) / 100;
    } else {
        $discount_amount = min($subtotal, $discount_val);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Coupon validated successfully',
        'coupon' => [
            'id' => intval($coupon['id']),
            'code' => $coupon['code'],
            'discount_type' => $coupon['discount_type'],
            'discount_value' => $discount_val,
            'discount_amount' => $discount_amount,
            'min_order_amount' => $min_amount
        ]
    ]);

} catch (Exception $e) {
    error_log('Validate Coupon Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
