<?php
// delete expense api
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_once __DIR__ . '/../../utils/cache_helper.php';

header('Content-Type: application/json');

$user = require_admin();

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id'])) {
    echo json_encode(["success" => false, "message" => "Missing expense ID"]);
    exit;
}

$id = intval($data['id']);
$stmt = $conn->prepare("DELETE FROM expenses WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    clear_api_cache();
    echo json_encode(["success" => true, "message" => "Expense deleted"]);
} else {
    echo json_encode(["success" => false, "message" => "Database error"]);
}
$stmt->close();

