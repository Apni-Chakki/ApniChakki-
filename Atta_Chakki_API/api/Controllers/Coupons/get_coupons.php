<?php
// Admin: list all coupons
require_once dirname(__DIR__, 2) . '/Config/connect.php';
header('Content-Type: application/json');

try {
    $sql = "SELECT * FROM coupons ORDER BY is_active DESC, created_at DESC";
    $res = $conn->query($sql);
    if (!$res) throw new Exception("Query failed: " . $conn->error);

    $coupons = [];
    while ($row = $res->fetch_assoc()) {
        $row['id'] = (int)$row['id'];
        $row['discount_value'] = floatval($row['discount_value']);
        $row['min_order_amount'] = floatval($row['min_order_amount']);
        $row['usage_limit'] = $row['usage_limit'] !== null ? (int)$row['usage_limit'] : null;
        $row['used_count'] = (int)$row['used_count'];
        $row['is_active'] = (int)$row['is_active'];
        $row['is_featured'] = (int)$row['is_featured'];
        $coupons[] = $row;
    }

    echo json_encode(["success" => true, "coupons" => $coupons]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
