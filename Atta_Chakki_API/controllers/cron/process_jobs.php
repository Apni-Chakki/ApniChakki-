<?php
/**
 * Cron Job file for background tasks.
 * Run this using a cron job every 5-10 mins.
 */

require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../orders/order_scheduler.php';

// Checking token so random people can't run this
$token = $_GET['token'] ?? '';
$secret = 'MY_CRON_SECRET_TOKEN_123'; // Change this and add it to your cron URL: ?token=MY_CRON_SECRET_TOKEN_123

if ($token !== $secret) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized access to cron jobs."]);
    exit;
}

$logs = [];
$today = date('Y-m-d');

try {
    // 1. Recalculate schedule if needed
    $logs[] = "Starting schedule recalculation...";
    recalculateSchedule($conn, $today);
    $logs[] = "Schedule recalculated for today.";

    // 2. Clean old rate limit files so server doesn't get full
    $tempDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'atta_chakki_rate_limits';
    if (is_dir($tempDir)) {
        $files = glob($tempDir . '/*.json');
        $now   = time();
        $cleaned = 0;
        foreach ($files as $file) {
            if (is_file($file)) {
                if ($now - filemtime($file) >= 3600) { // 1 hour
                    unlink($file);
                    $cleaned++;
                }
            }
        }
        $logs[] = "Cleaned up $cleaned old rate limit files.";
    }

    echo json_encode(["success" => true, "message" => "Cron jobs completed successfully.", "logs" => $logs]);

} catch (Exception $e) {
    error_log("Cron Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error during cron jobs: " . $e->getMessage()]);
}

$conn->close();
?>
