<?php
require_once __DIR__ . '/../config/cors.php';
include __DIR__ . '/../config/connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['name']) || !isset($data['email']) || !isset($data['message'])) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$name = trim($data['name']);
$email = trim($data['email']);
$phone = isset($data['phone']) && trim($data['phone']) !== '' ? trim($data['phone']) : null;
$subject = (isset($data['subject']) && trim($data['subject']) !== '') ? trim($data['subject']) : 'General Inquiry';
$message = trim($data['message']);

$stmt = $conn->prepare("INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $name, $email, $phone, $subject, $message);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Message sent successfully! We will get back to you soon."]);
} else {
    echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
}
$stmt->close();
