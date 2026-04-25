<?php
/**
 * Get all categories
 * API Endpoint: GET /get_categories.php
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $sql = "SELECT id, name, image_url, created_at FROM categories ORDER BY created_at ASC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Database error: " . $conn->error);
    }
    
    $categories = [];
    
    while ($row = $result->fetch_assoc()) {
        // Ensure image_url is a valid URL, fallback to placeholder if it's just a filename
        $imageUrl = $row['image_url'];
        if ($imageUrl && strpos($imageUrl, 'http') === false) {
            // Local filename without protocol - use a placeholder or try to build CDN URL
            $imageUrl = null; // Let frontend use fallback
        }
        
        $categories[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'image_url' => $imageUrl,
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
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch categories: ' . $e->getMessage()
    ]);
}

$conn->close();
