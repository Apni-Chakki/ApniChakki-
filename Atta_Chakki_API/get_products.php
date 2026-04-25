<?php
// get products api
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

try {
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    
    if ($category) {
        // filtering by category
        $sql = "SELECT p.id, p.name, p.description, p.price, p.unit, p.image_url, 
                p.stock_quantity, c.name as category, p.created_at 
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE c.name = ?
                ORDER BY p.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("s", $category);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        // getting all products
        $sql = "SELECT p.id, p.name, p.description, p.price, p.unit, p.image_url, 
                p.stock_quantity, c.name as category, p.created_at 
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                ORDER BY p.created_at DESC";
        
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
            'image_url' => $row['image_url'],
            'imageUrl' => $row['image_url'],
            'stock_quantity' => floatval($row['stock_quantity']),
            'category' => $row['category'] ?? 'Uncategorized',
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
