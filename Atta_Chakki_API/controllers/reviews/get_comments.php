<?php
// get comments controller - Server-Side Pagination + Rating Filter + Overall Stats
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

    $type   = $_GET['type']   ?? 'all';
    $rating = $_GET['rating'] ?? 'all';
    $page   = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit  = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 12));
    $offset = ($page - 1) * $limit;

    $where = "WHERE c.status = 'active'";
    if ($rating !== 'all' && is_numeric($rating)) {
        $where .= " AND c.rating = " . intval($rating);
    }

    if ($type === 'top') {
        // Preserve old behavior — return top 3 reviews, no pagination
        $query = "SELECT c.*, u.full_name AS user_name
                  FROM comments c
                  JOIN users u ON c.user_id = u.id
                  {$where}
                  ORDER BY c.rating DESC, c.timestamp DESC
                  LIMIT 3";
        $result = $conn->query($query);
        $data = [];
        while ($row = $result->fetch_assoc()) { $data[] = $row; }

        // Overall active stats (unfiltered)
        $statsRow = $conn->query("SELECT COUNT(*) AS total, COALESCE(AVG(rating),0) AS avg_rating FROM comments WHERE status='active'")->fetch_assoc();
        echo json_encode([
            'success' => true,
            'data'    => $data,
            'stats'   => [
                'average' => round((float)$statsRow['avg_rating'], 1),
                'total'   => (int)$statsRow['total'],
            ],
        ]);
        exit;
    }

    // Paginated list
    $total = (int)$conn->query("SELECT COUNT(*) AS c FROM comments c JOIN users u ON c.user_id = u.id {$where}")->fetch_assoc()['c'];

    $query = "SELECT c.*, u.full_name AS user_name
              FROM comments c
              JOIN users u ON c.user_id = u.id
              {$where}
              ORDER BY c.timestamp DESC
              LIMIT {$limit} OFFSET {$offset}";
    $result = $conn->query($query);
    $data = [];
    while ($row = $result->fetch_assoc()) { $data[] = $row; }

    // Overall active stats (unfiltered — always the same regardless of filter)
    $statsRow = $conn->query("SELECT COUNT(*) AS total, COALESCE(AVG(rating),0) AS avg_rating FROM comments WHERE status='active'")->fetch_assoc();

    echo json_encode([
        'success' => true,
        'data'    => $data,
        'total'   => $total,
        'page'    => $page,
        'limit'   => $limit,
        'stats'   => [
            'average' => round((float)$statsRow['avg_rating'], 1),
            'total'   => (int)$statsRow['total'],
        ],
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
