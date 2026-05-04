<?php
// Fix path to connect.php (up two levels from controllers/products)
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // FIXED: Use correct field names from database schema and prefix ambiguous columns
    $sql = "SELECT p.*, p.image_url AS image, c.name as category_name FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC";
    
    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }
    
    $products = [];

    while ($row = $result->fetch_assoc()) {
        // Map database fields to expected output format
        $row['price'] = floatval($row['price']);
        $row['stock'] = intval($row['stock_quantity'] ?? 0);
        $row['stock_quantity'] = floatval($row['stock_quantity'] ?? 0);
        $row['is_grinding_service'] = (int)($row['is_grinding_service'] ?? 0);
        $row['cleaning_price'] = floatval($row['cleaning_price'] ?? 0);
        $row['grinding_price'] = floatval($row['grinding_price'] ?? 0);
        $products[] = $row;
    }
    
    http_response_code(200);
    echo json_encode(["success" => true, "products" => $products]);
    
} catch (Exception $e) {
    http_response_code(500);
    error_log('get_all_products.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
