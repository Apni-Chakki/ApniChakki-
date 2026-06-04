<?php
// Update custom mix request status controller
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id']) || !isset($input['status'])) {
        throw new Exception("ID and status are required");
    }

    $id = (int)$input['id'];
    $status = trim($input['status']);
    
    $valid_statuses = ['pending', 'contacted', 'completed', 'cancelled'];
    if (!in_array($status, $valid_statuses)) {
        throw new Exception("Invalid status. Must be one of: " . implode(', ', $valid_statuses));
    }

    $stmt = $conn->prepare("UPDATE custom_mix_requests SET status = ?, updated_at = NOW() WHERE id = ?");
    $stmt->bind_param("si", $status, $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Status updated to $status"]);
    } else {
        echo json_encode(["success" => false, "message" => "Request not found or status unchanged"]);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
