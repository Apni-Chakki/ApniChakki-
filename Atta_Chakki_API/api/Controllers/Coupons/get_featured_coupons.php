<?php
// Public: get featured coupons for homepage banner
require_once dirname(__DIR__, 2) . '/Config/connect.php';
header('Content-Type: application/json');

try {
    $sql = "SELECT code, description, discount_type, discount_value, min_order_amount, expiry_date 
            FROM coupons 
            WHERE is_active = 1 
            AND (expiry_date IS NULL OR expiry_date > NOW())
            AND (usage_limit IS NULL OR used_count < usage_limit)
            ORDER BY created_at DESC";
    $res = $conn->query($sql);
    if (!$res) throw new Exception("Query failed: " . $conn->error);

    $coupons = [];
    while ($row = $res->fetch_assoc()) {
        $row['discount_value'] = floatval($row['discount_value']);
        $row['min_order_amount'] = floatval($row['min_order_amount']);
        $coupons[] = $row;
    }

    echo json_encode(["success" => true, "coupons" => $coupons]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
