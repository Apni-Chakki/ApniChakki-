<?php
require_once __DIR__ . '/../../Config/cors.php';
require_once __DIR__ . '/../../Config/connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id'])) {
    echo json_encode(["success" => false, "message" => "Message ID is required"]);
    exit;
}

$id = intval($data['id']);

$stmt = $conn->prepare("DELETE FROM contact_messages WHERE id = ?");
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Message deleted successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Error deleting message: " . $stmt->error]);
}

$stmt->close();
$conn->close();
