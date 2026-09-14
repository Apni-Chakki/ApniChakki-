<?php
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Only POST method is allowed");
    }

    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->id) || !isset($data->is_active)) {
        throw new Exception("Category ID and is_active status are required");
    }

    $id = intval($data->id);
    $is_active = intval($data->is_active) ? 1 : 0;

    $stmt = $conn->prepare("UPDATE categories SET is_active = ? WHERE id = ?");
    $stmt->bind_param("ii", $is_active, $id);
    
    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Category status updated successfully"
        ]);
    } else {
        throw new Exception("Failed to update category status");
    }
    
    $stmt->close();
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>
