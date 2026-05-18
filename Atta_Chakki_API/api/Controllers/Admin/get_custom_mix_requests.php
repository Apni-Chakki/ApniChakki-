<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

try {
    $sql = "SELECT * FROM custom_mix_requests ORDER BY created_at DESC";
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $requests = [];
    while ($row = $result->fetch_assoc()) {
        // Parse JSON string back to array
        $row['selected_items'] = !empty($row['selected_items']) ? json_decode($row['selected_items'], true) : [];
        $requests[] = $row;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $requests
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch custom mix requests: ' . $e->getMessage()
    ]);
}

$conn->close();
