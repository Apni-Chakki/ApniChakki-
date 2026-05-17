<?php
/**
 * Get products with optional category filter
 * API Endpoint: GET /get_products.php?category=wheat
 */

require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

try {
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    
    if ($category) {
        // Filter by category
        $sql = "SELECT p.*, c.name as category 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE c.name = ? OR p.category_id = ?
                ORDER BY p.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("ss", $category, $category);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        // Get all products
        $sql = "SELECT p.*, c.name as category 
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
        $productId = (int)$row['id'];

        // Fetch dynamic customizations for this product
        $cust_stmt = $conn->prepare("SELECT id, option_name, option_price, sort_order FROM product_customizations WHERE product_id = ? ORDER BY sort_order ASC");
        $cust_stmt->bind_param("i", $productId);
        $cust_stmt->execute();
        $cust_result = $cust_stmt->get_result();
        $customizations = [];
        while ($cust_row = $cust_result->fetch_assoc()) {
            $customizations[] = [
                'id' => (int)$cust_row['id'],
                'option_name' => $cust_row['option_name'],
                'option_price' => floatval($cust_row['option_price']),
                'sort_order' => (int)$cust_row['sort_order']
            ];
        }
        $cust_stmt->close();

        $products[] = [
            'id' => $productId,
            'name' => $row['name'],
            'description' => $row['description'],
            'price' => floatval($row['price']),
            'unit' => $row['unit'] ?? 'kg',
            'dual_unit' => (int)($row['dual_unit'] ?? 0),
            'weight_options' => !empty($row['weight_options']) ? json_decode($row['weight_options'], true) : [],
            'image_url' => $row['image_url'], // Can be null or Cloudinary URL
            'imageUrl' => $row['image_url'] ?? '', // Alias for frontend compatibility
            'stock_quantity' => floatval($row['stock_quantity'] ?? 0),
            'category' => $row['category'] ?? 'Uncategorized',
            'is_grinding_service' => (int)($row['is_grinding_service'] ?? 0),
            'cleaning_price' => floatval($row['cleaning_price'] ?? 0),
            'grinding_price' => floatval($row['grinding_price'] ?? 0),
            'customizations' => $customizations,
            'created_at' => $row['created_at'] ?? date('Y-m-d H:i:s')
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
?>
