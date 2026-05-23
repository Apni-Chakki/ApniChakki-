<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/connect.php';

try {
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

    $sql = "SELECT 
                r.*, 
                p.name AS product_name, 
                p.image_url AS product_image
            FROM rentals r
            JOIN products p ON r.product_id = p.id";

    if ($user_id > 0) {
        $sql .= " WHERE r.user_id = ?";
    }

    $sql .= " ORDER BY r.created_at DESC";

    $stmt = $conn->prepare($sql);

    if ($user_id > 0) {
        $stmt->bind_param("i", $user_id);
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
            "total" => count($rentals)
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error fetching rental history: " . $e->getMessage()]);
}
