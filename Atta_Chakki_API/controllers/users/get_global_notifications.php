<?php
// get global notifications api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $sql = "SELECT * FROM global_notifications WHERE is_active = 1 ORDER BY created_at DESC LIMIT 20";
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
