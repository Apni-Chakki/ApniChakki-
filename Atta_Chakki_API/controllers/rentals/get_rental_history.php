<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
$payload = require_auth();

require_once __DIR__ . '/../../config/connect.php';

try {
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    if (isset($payload['role']) && $payload['role'] !== 'admin') {
        $user_id = intval($payload['id']);
    }

    $page   = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
    $limit  = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
    $offset = ($page - 1) * $limit;

    // Count first
    if ($user_id > 0) {
        $cStmt = $conn->prepare("SELECT COUNT(*) AS c FROM rentals r JOIN products p ON r.product_id = p.id WHERE r.user_id = ?");
        $cStmt->bind_param("i", $user_id);
    } else {
        $cStmt = $conn->prepare("SELECT COUNT(*) AS c FROM rentals r JOIN products p ON r.product_id = p.id");
    }
    $cStmt->execute();
    $total = (int)$cStmt->get_result()->fetch_assoc()['c'];
    $cStmt->close();

    $sql = "SELECT
                r.*,
                p.name AS product_name,
                p.image_url AS product_image
            FROM rentals r
            JOIN products p ON r.product_id = p.id";
    if ($user_id > 0) { $sql .= " WHERE r.user_id = ?"; }
    $sql .= " ORDER BY r.created_at DESC LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($sql);
    if ($user_id > 0) {
        $stmt->bind_param("iii", $user_id, $limit, $offset);
    } else {
        $stmt->bind_param("ii", $limit, $offset);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $rentals = [];
    while ($row = $result->fetch_assoc()) {
        $rentals[] = $row;
    }
    $stmt->close();

    echo json_encode([
        "success" => true,
        "message" => "Rental history fetched successfully",
        "data" => [
            "rentals" => $rentals,
            "total"   => $total,
            "page"    => $page,
            "limit"   => $limit,
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error fetching rental history: " . $e->getMessage()]);
}
