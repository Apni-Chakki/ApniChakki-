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
        // Filter by category name
        $sql = "SELECT p.id, p.name, p.description, p.price, p.unit, p.image_url, p.stock_quantity, 
                       p.category_id, c.name as category, p.priority, p.created_at,
                       p.is_rental, p.rental_price_per_day, p.security_deposit, 
                       p.late_penalty_per_day, p.rental_available_qty
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE c.name = ?
                ORDER BY p.priority DESC, p.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("s", $category);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        // Get all products
        $sql = "SELECT p.id, p.name, p.description, p.price, p.unit, p.image_url, p.stock_quantity, 
                       p.category_id, c.name as category, p.priority, p.created_at,
                       p.is_rental, p.rental_price_per_day, p.security_deposit, 
                       p.late_penalty_per_day, p.rental_available_qty
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                ORDER BY p.priority DESC, p.created_at DESC";
        
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
            'category' => $row['category'],
            'category_id' => (int)$row['category_id'],
            'priority' => intval($row['priority'] ?? 0),
            'created_at' => $row['created_at'],
            'is_rental' => (int)($row['is_rental'] ?? 0),
            'rental_price_per_day' => floatval($row['rental_price_per_day'] ?? 0),
            'security_deposit' => floatval($row['security_deposit'] ?? 0),
            'late_penalty_per_day' => floatval($row['late_penalty_per_day'] ?? 0),
            'rental_available_qty' => intval($row['rental_available_qty'] ?? 0)
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

