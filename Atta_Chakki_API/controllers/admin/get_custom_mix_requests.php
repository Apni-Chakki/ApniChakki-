<?php
// Get custom mix requests controller
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // Check if custom_mix_requests table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'custom_mix_requests'");
    if ($tableCheck->num_rows === 0) {
        // Create table if not exists
        $conn->query("CREATE TABLE IF NOT EXISTS custom_mix_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(50) NOT NULL,
            product_id INT DEFAULT NULL,
            product_name VARCHAR(255) DEFAULT NULL,
            total_quantity DECIMAL(10,2) DEFAULT 5.00,
            selected_items JSON DEFAULT NULL,
            custom_items TEXT DEFAULT NULL,
            shipping_address TEXT DEFAULT NULL,
            status ENUM('pending','contacted','completed','cancelled') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    $page   = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit  = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 6));
    $offset = ($page - 1) * $limit;
    $status = isset($_GET['status']) ? trim($_GET['status']) : 'all';

    $where  = [];
    $params = [];
    $types  = '';
    if ($status !== 'all' && $status !== '') {
        $where[]  = "status = ?";
        $params[] = $status;
        $types   .= 's';
    }
    $whereSql = count($where) > 0 ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countSql = "SELECT COUNT(*) AS c FROM custom_mix_requests {$whereSql}";
    $stmt = $conn->prepare($countSql);
    if ($types !== '') { $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $total = (int)$stmt->get_result()->fetch_assoc()['c'];
    $stmt->close();

    $sql = "SELECT * FROM custom_mix_requests {$whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $pageParams = $params;
    $pageTypes  = $types . 'ii';
    $pageParams[] = $limit;
    $pageParams[] = $offset;

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($pageTypes, ...$pageParams);
    $stmt->execute();
    $result = $stmt->get_result();

    $requests = [];
    while ($row = $result->fetch_assoc()) {
        if (!empty($row['selected_items'])) {
            $row['selected_items'] = json_decode($row['selected_items'], true);
        } else {
            $row['selected_items'] = [];
        }
        $requests[] = $row;
    }
    $stmt->close();

    echo json_encode([
        "success" => true,
        "data"    => $requests,
        "total"   => $total,
        "page"    => $page,
        "limit"   => $limit,
        "count"   => count($requests),
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}
