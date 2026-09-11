<?php
// get global notifications api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    // Ensure expires_at column exists
    $col_check = $conn->query("SHOW COLUMNS FROM global_notifications LIKE 'expires_at'");
    if ($col_check && $col_check->num_rows === 0) {
        $conn->query("ALTER TABLE global_notifications ADD COLUMN expires_at DATETIME NULL");
    }

    // Only fetch active, unexpired promotions and notifications
    $sql = "SELECT * FROM global_notifications 
            WHERE is_active = 1 
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at DESC LIMIT 30";
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("SQL Error: " . $conn->error);
    }

    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        $notifications[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        "success" => true,
        "notifications" => $notifications
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
