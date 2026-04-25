<?php
// update store settings
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit();
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['settings']) || !is_array($data['settings'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid settings data"]);
        exit();
    }
    
    $settings = $data['settings'];
    
    // saving each setting to db
    foreach ($settings as $key => $value) {
        $key = $conn->real_escape_string($key);
        $value = $conn->real_escape_string((string)$value);
        
        $sql = "INSERT INTO store_settings (setting_key, setting_value) 
                VALUES ('$key', '$value')
                ON DUPLICATE KEY UPDATE setting_value = '$value'";
        
        if (!$conn->query($sql)) {
            throw new Exception("Database update failed: " . $conn->error);
        }
    }
    
    echo json_encode([
        "success" => true,
        "message" => "Settings updated successfully"
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error updating settings: " . $e->getMessage()
    ]);
}
