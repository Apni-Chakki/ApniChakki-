<?php
// Submit contact form controller
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // Ensure table exists
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

    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['name']) || !isset($data['email']) || !isset($data['message'])) {
        echo json_encode(["success" => false, "message" => "Missing required fields (name, email, message)"]);
        exit;
    }

    $name = trim($data['name']);
    $email = trim($data['email']);
    $phone = isset($data['phone']) ? trim($data['phone']) : null;
    $subject = isset($data['subject']) ? trim($data['subject']) : null;
    $message = trim($data['message']);

    $stmt = $conn->prepare("INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $name, $email, $phone, $subject, $message);

    if ($stmt->execute()) {
        $msg_id = $stmt->insert_id;
        require_once __DIR__ . '/../../utils/notification_helper.php';
        addAdminNotification($conn, "New Contact Message", "From $name: " . ($subject ?? "Inquiry"), "contact_message", $msg_id);
        echo json_encode(["success" => true, "message" => "Message sent successfully! We will get back to you soon."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
