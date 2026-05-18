<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id']) || !isset($data['status'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Request ID and status are required"]);
    exit;
}

$id = intval($data['id']);
$status = $conn->real_escape_string($data['status']);
$admin_notes = isset($data['admin_notes']) ? $conn->real_escape_string($data['admin_notes']) : null;

$sql = "UPDATE custom_mix_requests SET status = ?";
$types = "s";
$params = [$status];

if ($admin_notes !== null) {
    $sql .= ", admin_notes = ?";
    $types .= "s";
    $params[] = $admin_notes;
}

$sql .= " WHERE id = ?";
$types .= "i";
$params[] = $id;

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}

$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Custom mix request updated successfully"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to update request: " . $stmt->error]);
}

$stmt->close();
$conn->close();
