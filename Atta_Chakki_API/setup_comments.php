<?php
require_once __DIR__ . '/config/connect.php';

// Drop the old reviews or just create comments
$sql = "CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    status ENUM('active', 'hidden', 'deleted') DEFAULT 'active',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)";

if ($conn->query($sql) === TRUE) {
    echo "Comments table created successfully.\n";
} else {
    echo "Error creating table: " . $conn->error . "\n";
}
$conn->close();
?>