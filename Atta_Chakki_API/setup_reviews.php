<?php
require_once 'config/connect.php';

$sql = "CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if ($conn->query($sql) === TRUE) {
    echo "Table reviews created successfully or already exists.";
    
    // Insert dummy data if table is empty
    $check_sql = "SELECT COUNT(*) as count FROM reviews";
    $result = $conn->query($check_sql);
    $row = $result->fetch_assoc();
    
    if ($row['count'] == 0) {
        $dummy_data = "INSERT INTO reviews (user_name, rating, comment) VALUES 
            ('Ali Khan', 5, 'Best atta quality! Highly recommended.'),
            ('Aisha Ahmed', 4, 'Good quality, fast delivery.'),
            ('Zain Shah', 3, 'Average quality, can be improved.'),
            ('Sara Ali', 5, 'Very fresh and purely organic.'),
            ('Omar Farooq', 5, 'Excellent service and product.'),
            ('Bilal Tariq', 4, 'Nice packaging and fresh atta.')";
        if ($conn->query($dummy_data) === TRUE) {
            echo " Dummy data inserted.";
        }
    }
} else {
    echo "Error creating table: " . $conn->error;
}
?>