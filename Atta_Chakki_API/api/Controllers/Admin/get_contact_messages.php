<?php
require_once __DIR__ . '/../../Config/cors.php';
require_once __DIR__ . '/../../Config/connect.php';

$sql = "SELECT * FROM contact_messages ORDER BY created_at DESC";
$result = $conn->query($sql);

$messages = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    echo json_encode(["success" => true, "data" => $messages]);
} else {
    echo json_encode(["success" => false, "message" => "Error fetching messages: " . $conn->error]);
}

$conn->close();
