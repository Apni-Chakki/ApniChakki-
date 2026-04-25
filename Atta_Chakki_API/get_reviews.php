<?php
// get reviews api
require_once 'config/cors.php';
require_once 'config/connect.php';

header('Content-Type: application/json');

try {
    // creating reviews table if it doesnt exist
    $conn->query("CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_name VARCHAR(255) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    // adding dummy data if empty
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
        $conn->query($dummy_data);
    }
    
    
    $type = isset($_GET['type']) ? $_GET['type'] : 'all';
    $rating = isset($_GET['rating']) ? (int)$_GET['rating'] : 0;
    
    $sql = "SELECT * FROM reviews";
    $conditions = [];
    $params = [];
    $types = "";
    
    if ($type === 'top') {
        $sql .= " WHERE rating >= 4 ORDER BY created_at DESC LIMIT 4";
    } else {
        if ($rating > 0 && $rating <= 5) {
            $conditions[] = "rating = ?";
            $params[] = $rating;
            $types .= "i";
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }
        $sql .= " ORDER BY created_at DESC";
    }
    
    $stmt = $conn->prepare($sql);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $reviews = [];
    while ($row = $result->fetch_assoc()) {
        $reviews[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $reviews
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>