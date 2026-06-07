<?php
require_once __DIR__ . '/../../config/connect.php';
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Mark as read logic
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['action']) && $data['action'] === 'mark_read') {
            $update_stmt = $conn->prepare("UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0");
            if ($update_stmt) {
                $update_stmt->execute();
                $update_stmt->close();
            }
            echo json_encode(["success" => true, "message" => "Notifications marked as read"]);
            exit;
        }
    }

    // Fetch latest notifications
    $sql = "SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50";
    $result = $conn->query($sql);

    $notifications = [];
    $unread_count = 0;
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $notifications[] = $row;
            if ($row['is_read'] == 0) {
                $unread_count++;
            }
        }
    }

    echo json_encode([
        "success" => true,
        "notifications" => $notifications,
        "unread_count" => $unread_count
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
