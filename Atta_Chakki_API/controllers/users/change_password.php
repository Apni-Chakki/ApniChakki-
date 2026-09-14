<?php
// controllers/users/change_password.php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $action = isset($data['action']) ? trim($data['action']) : 'verify';
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
    $current_password = isset($data['current_password']) ? $data['current_password'] : '';
    
    if ($user_id <= 0 || empty($current_password)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "User ID and current password are required"]);
        exit;
    }
    
    // Fetch user from DB
    $stmt = $conn->prepare("SELECT id, password_hash, is_active FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "User not found"]);
        $stmt->close();
        exit;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    if (!password_verify($current_password, $user['password_hash'])) {
        echo json_encode(["success" => false, "message" => "Incorrect current password."]);
        exit;
    }
    
    if ($action === 'verify') {
        echo json_encode(["success" => true, "message" => "Current password verified!"]);
        exit;
    }
    
    if ($action === 'update') {
        $new_password = isset($data['new_password']) ? $data['new_password'] : '';
        if (empty($new_password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "New password is required"]);
            exit;
        }
        
        // Hash new password
        $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
        
        $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $stmt->bind_param("si", $password_hash, $user_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to update password: " . $stmt->error);
        }
        $stmt->close();
        
        echo json_encode(["success" => true, "message" => "Password updated successfully!"]);
        exit;
    }
    
    echo json_encode(["success" => false, "message" => "Invalid action"]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error processing request: " . $e->getMessage()]);
}
?>
