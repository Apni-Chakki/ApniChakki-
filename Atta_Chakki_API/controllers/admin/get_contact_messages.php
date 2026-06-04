<?php
// Get contact messages controller
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // Check if contact_messages table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'contact_messages'");
    if ($tableCheck->num_rows === 0) {
        // Create table if not exists
        $conn->query("CREATE TABLE IF NOT EXISTS contact_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50) DEFAULT NULL,
            subject VARCHAR(500) DEFAULT NULL,
            message TEXT NOT NULL,
            status ENUM('new','read','replied') DEFAULT 'new',
            reply_message TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    $result = $conn->query("SELECT * FROM contact_messages ORDER BY created_at DESC");

    $messages = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $messages[] = $row;
        }
    }

    echo json_encode([
        "success" => true,
        "data" => $messages,
        "count" => count($messages)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
