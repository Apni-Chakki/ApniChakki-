<?php
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

try {
    // Check categories count
    $catResult = $conn->query("SELECT COUNT(*) as count FROM categories");
    $catRow = $catResult->fetch_assoc();
    $catCount = $catRow['count'];
    
    // Check products count
    $prodResult = $conn->query("SELECT COUNT(*) as count FROM products");
    $prodRow = $prodResult->fetch_assoc();
    $prodCount = $prodRow['count'];
    
    // Get all categories with product count
    $sql = "SELECT c.id, c.name, c.image_url, COUNT(p.id) as product_count 
            FROM categories c 
            LEFT JOIN products p ON c.id = p.category_id 
            GROUP BY c.id, c.name, c.image_url 
            ORDER BY c.id";
    
    $result = $conn->query($sql);
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $categories[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'database_status' => 'Connected',
        'categories_count' => $catCount,
        'products_count' => $prodCount,
        'categories_list' => $categories
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

$conn->close();
