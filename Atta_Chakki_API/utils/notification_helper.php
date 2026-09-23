<?php
/* 
 * Helper to insert notifications for admin dashboard
 */
require_once __DIR__ . '/email_helper.php';

function addAdminNotification($conn, $title, $message, $type, $related_id = null) {
    try {
        $stmt = $conn->prepare("INSERT INTO admin_notifications (title, message, type, related_id, is_read, created_at) VALUES (?, ?, ?, ?, 0, NOW())");
        if ($stmt) {
            $stmt->bind_param("sssi", $title, $message, $type, $related_id);
            $stmt->execute();
            $stmt->close();

            // Broadcast real-time socket event to admin dashboard
            send_email_async('/notify-admin-event', [
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'order_id' => $related_id
            ]);

            return true;
        }
    } catch (Exception $e) {
        error_log("Failed to insert admin notification: " . $e->getMessage());
    }
    return false;
}
?>
