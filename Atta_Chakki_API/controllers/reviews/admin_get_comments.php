<?php
// admin get comments controller - Server-Side Pagination + Search
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

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

    $page   = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit  = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
    $offset = ($page - 1) * $limit;
    $search = trim($_GET['search'] ?? '');

    $where  = '';
    $params = [];
    $types  = '';
    if ($search !== '') {
        $where = " WHERE u.full_name LIKE ? OR c.comment_text LIKE ? ";
        $like  = "%{$search}%";
        $params = [$like, $like];
        $types  = 'ss';
    }

    // Count
    $countSql = "SELECT COUNT(*) AS c FROM comments c JOIN users u ON c.user_id = u.id {$where}";
    $cStmt = $conn->prepare($countSql);
    if ($types !== '') { $cStmt->bind_param($types, ...$params); }
    $cStmt->execute();
    $total = (int)$cStmt->get_result()->fetch_assoc()['c'];
    $cStmt->close();

    $query = "SELECT c.*, u.full_name AS user_name, u.email, u.phone
              FROM comments c
              JOIN users u ON c.user_id = u.id
              {$where}
              ORDER BY c.timestamp DESC
              LIMIT ? OFFSET ?";

    $pageParams = $params;
    $pageTypes  = $types . 'ii';
    $pageParams[] = $limit;
    $pageParams[] = $offset;

    $stmt = $conn->prepare($query);
    $stmt->bind_param($pageTypes, ...$pageParams);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'data'    => $data,
        'total'   => $total,
        'page'    => $page,
        'limit'   => $limit,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
