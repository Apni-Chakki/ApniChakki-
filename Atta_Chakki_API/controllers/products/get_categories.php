<?php
// get categories controller logic
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cache_helper.php';

header('Content-Type: application/json');
header('Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600');

try {
    $isAdmin = isset($_GET['admin']) && $_GET['admin'] == '1';
    $cache_key = 'categories_' . ($isAdmin ? 'admin' : 'public');

    $cached = get_api_cache($cache_key, 300);
    if ($cached !== false) {
        http_response_code(200);
        echo $cached;
        exit;
    }
    
    if ($isAdmin) {
        $sql = "SELECT id, name, image_url, priority, created_at, is_active FROM categories ORDER BY priority ASC, name ASC";
    } else {
        $sql = "SELECT id, name, image_url, priority, created_at, is_active FROM categories WHERE is_active = 1 ORDER BY priority ASC, name ASC";
    }
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $image_url = $row['image_url'];
        if ($image_url && !filter_var($image_url, FILTER_VALIDATE_URL)) {
            $image_url = null;
        }
        
        $categories[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'image_url' => $image_url,
            'priority' => (int)($row['priority'] ?? 0),
            'created_at' => $row['created_at'],
            'is_active' => (int)($row['is_active'] ?? 1)
        ];
    }
    
    $response_data = json_encode([
        'success' => true,
        'categories' => $categories,
        'count' => count($categories)
    ]);
    
    set_api_cache($cache_key, $response_data);

    http_response_code(200);
    echo $response_data;
    
} catch (Exception $e) {
    error_log('Get Categories Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
