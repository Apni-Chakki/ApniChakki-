<?php
// Reply to contact message controller
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id']) || !isset($input['reply_message'])) {
        throw new Exception("Message ID and reply_message are required");
    }

    $id = (int)$input['id'];
    $reply = trim($input['reply_message']);

    $stmt = $conn->prepare("UPDATE contact_messages SET reply_message = ?, status = 'replied', updated_at = NOW() WHERE id = ?");
    $stmt->bind_param("si", $reply, $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Reply saved successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Message not found or no changes made"]);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
