<?php
/**
 * Get products with optional category filter
 * API Endpoint: GET /get_products.php?category=wheat
 */

require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    
    if ($category) {
        // Filter by category
        $sql = "SELECT id, name, description, price, unit, image_url, stock_quantity, category, created_at 
                FROM products 
                WHERE category = ? OR category_id = (SELECT id FROM categories WHERE name = ?)
                ORDER BY created_at DESC";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("ss", $category, $category);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        // Get all products
        $sql = "SELECT id, name, description, price, unit, image_url, stock_quantity, category, created_at 
                FROM products 
                ORDER BY created_at DESC";
        
        $result = $conn->query($sql);
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }
    }
    
    $products = [];
    
    while ($row = $result->fetch_assoc()) {
        $products[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'description' => $row['description'],
            'price' => floatval($row['price']),
            'unit' => $row['unit'] ?? 'kg',
            'image_url' => $row['image_url'], // Can be null or Cloudinary URL
            'imageUrl' => $row['image_url'], // Alias for frontend compatibility
            'stock_quantity' => floatval($row['stock_quantity']),
            'category' => $row['category'],
            'created_at' => $row['created_at']
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'products' => $products,
        'count' => count($products)
    ]);
    
} catch (Exception $e) {
    error_log('Get Products Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch products: ' . $e->getMessage()
    ]);
}

$conn->close();
