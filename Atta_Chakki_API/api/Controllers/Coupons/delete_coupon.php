<?php
// Admin: delete coupon
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
    $stmt = $conn->prepare("DELETE FROM coupons WHERE id = ?");
    $stmt->bind_param("i", $id);
    if (!$stmt->execute()) throw new Exception("Delete failed: " . $stmt->error);
    $stmt->close();

    echo json_encode(["success" => true, "message" => "Coupon deleted"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
