<?php
require_once __DIR__ . '/../Config/cors.php';
include __DIR__ . '/../Config/connect.php';

// Get JSON data
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "No data received"]);
    exit;
}

// Basic validation
if (empty($data['name']) || empty($data['email']) || empty($data['message'])) {
    echo json_encode(["success" => false, "message" => "Name, email and message are required"]);
    exit;
}

$name = $conn->real_escape_string($data['name']);
$email = $conn->real_escape_string($data['email']);
$message = $conn->real_escape_string($data['message']);

// Optional fields with defaults
$phone = isset($data['phone']) ? $conn->real_escape_string($data['phone']) : '';
$subject = isset($data['subject']) ? $conn->real_escape_string($data['subject']) : 'New Contact Form Submission';

$stmt = $conn->prepare("INSERT INTO contact_messages (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, 'new')");
$stmt->bind_param("sssss", $name, $email, $phone, $subject, $message);

if ($stmt->execute()) {
    // Send email via Node.js Email Server
    $emailServerUrl = 'http://localhost:3002/send-contact-email';
    
    $emailData = [
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'subject' => $subject,
        'message' => $message
    ];

    $ch = curl_init($emailServerUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $emailResponse = curl_exec($ch);
    $emailHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    echo json_encode([
        "success" => true, 
        "message" => "Thank you! Your message has been sent successfully. We will get back to you soon."
    ]);
} else {
    // If table doesn't exist, try to create it (Basic migration)
    if ($conn->errno == 1146) { // Table 'contact_messages' doesn't exist
        $createTableSql = "CREATE TABLE IF NOT EXISTS `contact_messages` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `name` varchar(100) NOT NULL,
            `email` varchar(100) NOT NULL,
            `phone` varchar(15) DEFAULT NULL,
            `subject` varchar(255) NOT NULL,
            `message` text NOT NULL,
            `status` enum('new','read','replied','resolved') DEFAULT 'new',
            `reply_message` text DEFAULT NULL,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (`id`),
            KEY `status` (`status`),
            KEY `created_at` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;";
        
        if ($conn->query($createTableSql)) {
            // Try inserting again
            $stmt = $conn->prepare("INSERT INTO contact_messages (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, 'new')");
            $stmt->bind_param("sssss", $name, $email, $phone, $subject, $message);
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Thank you! Your message has been sent successfully."]);
                exit;
            }
        }
    }
    
    echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
}

$stmt->close();
$conn->close();
