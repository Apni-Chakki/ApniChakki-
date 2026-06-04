<?php
// get comments controller logic
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $conn->query("CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        rating INT NOT NULL,
        comment_text TEXT NOT NULL,
        status ENUM('active', 'hidden') DEFAULT 'active',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    $type = $_GET['type'] ?? 'all';
    $rating = $_GET['rating'] ?? 'all';

    $query = "
        SELECT c.*, u.full_name as user_name 
        FROM comments c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.status = 'active'
    ";

    // filtering by rating
    if ($rating !== 'all' && is_numeric($rating)) {
        $query .= " AND c.rating = " . intval($rating);
    }

    if ($type === 'top') {
        $query .= " ORDER BY c.rating DESC, c.timestamp DESC LIMIT 3";
    } else {
        $query .= " ORDER BY c.timestamp DESC";
    }

    $result = $conn->query($query);
    $data = [];
    $total_rating = 0;
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
            $total_rating += $row['rating'];
        }
    }

    // calculating stats
    $total_count = count($data);
    $average_rating = $total_count > 0 ? round($total_rating / $total_count, 1) : 0;

    echo json_encode([
        'success' => true,
        'data' => $data,
        'stats' => [
            'average' => $average_rating,
            'total' => $total_count
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
