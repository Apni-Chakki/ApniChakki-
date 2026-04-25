<?php
// update user profile api
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
    
    if (!isset($data['user_id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "User ID is required"]);
        exit;
    }
    
    $user_id = intval($data['user_id']);
    $name = isset($data['name']) ? $conn->real_escape_string(trim($data['name'])) : null;
    $phone = isset($data['phone']) ? $conn->real_escape_string(trim($data['phone'])) : null;
    $address = isset($data['address']) ? $conn->real_escape_string(trim($data['address'])) : null;
    
    // checking if user exists
    $userSql = "SELECT id FROM users WHERE id = ?";
    $stmt = $conn->prepare($userSql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $userResult = $stmt->get_result();
    
    if ($userResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "User not found"]);
        exit;
    }
    $stmt->close();
    
    // building update query dynamically
    $updates = [];
    $types = '';
    $values = [];
    
    if ($name !== null) {
        $updates[] = "full_name = ?";
        $types .= 's';
        $values[] = $name;
    }
    
    if ($phone !== null) {
        $updates[] = "phone = ?";
        $types .= 's';
        $values[] = $phone;
    }
    
    if ($address !== null) {
        $updates[] = "address = ?";
        $types .= 's';
        $values[] = $address;
    }
    
    if (empty($updates)) {
        echo json_encode(["success" => true, "message" => "No updates provided"]);
        exit;
    }
    
    $values[] = $user_id;
    $types .= 'i';
    
    $updateSql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($updateSql);
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param($types, ...$values);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update user profile: " . $stmt->error);
    }
    $stmt->close();
    
    // getting updated user data
    $selectSql = "SELECT id, full_name, email, phone, address, role FROM users WHERE id = ?";
    $stmt = $conn->prepare($selectSql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $updatedUser = $result->fetch_assoc();
    $stmt->close();
    
    echo json_encode([
        "success" => true,
        "message" => "Profile updated successfully",
        "user" => $updatedUser
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error updating profile: " . $e->getMessage()
    ]);
}
