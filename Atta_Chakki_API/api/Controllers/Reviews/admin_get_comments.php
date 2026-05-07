<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

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

    $search = $_GET['search'] ?? '';

    $query = "
        SELECT c.*, u.full_name as user_name, u.email, u.phone 
        FROM comments c 
        JOIN users u ON c.user_id = u.id 
    ";

    $params = [];
    $types = '';

    if (!empty($search)) {
        $query .= " WHERE u.full_name LIKE ? OR c.comment_text LIKE ? ";
        $searchTerm = "%" . $search . "%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= 'ss';
    }

    $query .= " ORDER BY c.timestamp DESC";

    $stmt = $conn->prepare($query);
    if (!empty($search)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode(['success' => true, 'data' => $data]);
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>


