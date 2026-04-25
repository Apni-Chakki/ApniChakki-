<?php
require_once __DIR__ . '/../config/cors.php';
include __DIR__ . '/../config/connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['name']) || !isset($data['email']) || !isset($data['message'])) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$name = $conn->real_escape_string($data['name']);
$email = $conn->real_escape_string($data['email']);
$message = $conn->real_escape_string($data['message']);

$stmt = $conn->prepare("INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $name, $email, $message);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Message sent successfully! We will get back to you soon."]);
} else {
    echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
}
$stmt->close();
