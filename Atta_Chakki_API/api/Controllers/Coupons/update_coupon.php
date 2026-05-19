<?php
// Admin: update coupon
require_once dirname(__DIR__, 2) . '/Config/connect.php';
header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || empty($data['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Coupon id required"]);
        exit;
    }

    $id = (int)$data['id'];
    $fields = [];
    $types = "";
    $values = [];

    if (isset($data['code'])) {
        $code = strtoupper(trim($data['code']));
        if (!preg_match('/^[A-Z0-9_-]{3,50}$/', $code)) throw new Exception("Invalid code format");
        $fields[] = "code = ?";
        $types .= "s";
        $values[] = $code;
    }
    if (isset($data['description'])) {
        $fields[] = "description = ?";
        $types .= "s";
        $values[] = trim($data['description']);
    }
    if (isset($data['discount_type'])) {
        $dt = $data['discount_type'];
        if (!in_array($dt, ['percentage','fixed'], true)) throw new Exception("Invalid discount_type");
        $fields[] = "discount_type = ?";
        $types .= "s";
        $values[] = $dt;
    }
    if (isset($data['discount_value'])) {
        $dv = floatval($data['discount_value']);
        if ($dv <= 0) throw new Exception("discount_value must be > 0");
        $fields[] = "discount_value = ?";
        $types .= "d";
        $values[] = $dv;
    }
    if (isset($data['min_order_amount'])) {
        $fields[] = "min_order_amount = ?";
        $types .= "d";
        $values[] = floatval($data['min_order_amount']);
    }
    if (array_key_exists('usage_limit', $data)) {
        $fields[] = "usage_limit = ?";
        $types .= "i";
        $values[] = ($data['usage_limit'] === '' || $data['usage_limit'] === null) ? null : (int)$data['usage_limit'];
    }
    if (array_key_exists('expiry_date', $data)) {
        $fields[] = "expiry_date = ?";
        $types .= "s";
        $values[] = ($data['expiry_date'] === '' || $data['expiry_date'] === null) ? null : $data['expiry_date'];
    }
    if (isset($data['is_active'])) {
        $fields[] = "is_active = ?";
        $types .= "i";
        $values[] = (int)!!$data['is_active'];
    }
    if (isset($data['is_featured'])) {
        $fields[] = "is_featured = ?";
        $types .= "i";
        $values[] = (int)!!$data['is_featured'];
    }

    if (empty($fields)) {
        echo json_encode(["success" => false, "message" => "Nothing to update"]);
        exit;
    }

    $sql = "UPDATE coupons SET " . implode(", ", $fields) . " WHERE id = ?";
    $types .= "i";
    $values[] = $id;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$values);
    if (!$stmt->execute()) throw new Exception("Update failed: " . $stmt->error);
    $stmt->close();

    echo json_encode(["success" => true, "message" => "Coupon updated"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
