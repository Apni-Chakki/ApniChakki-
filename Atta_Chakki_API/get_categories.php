<?php
// get categories api
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

try {
    $sql = "SELECT id, name, image_url, created_at FROM categories ORDER BY created_at DESC";
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        // checking if image url is valid
        $image_url = $row['image_url'];
        if ($image_url && !filter_var($image_url, FILTER_VALIDATE_URL)) {
            $image_url = null;
        }
        
        $categories[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'image_url' => $image_url,
            'created_at' => $row['created_at']
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'categories' => $categories,
        'count' => count($categories)
    ]);
    
} catch (Exception $e) {
    error_log('Get Categories Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
