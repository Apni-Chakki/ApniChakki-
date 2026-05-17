<?php
// Fix path to connect.php (up two levels from controllers/products)
require_once dirname(__DIR__, 2) . '/Config/connect.php';

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
        $row['track_inventory'] = (int)($row['track_inventory'] ?? 1);
        $row['cleaning_price'] = floatval($row['cleaning_price'] ?? 0);
        $row['grinding_price'] = floatval($row['grinding_price'] ?? 0);

        // Fetch dynamic customizations for this product
        $cust_stmt = $conn->prepare("SELECT id, option_name, option_price, sort_order FROM product_customizations WHERE product_id = ? ORDER BY sort_order ASC");
        $cust_stmt->bind_param("i", $row['id']);
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
        $row['customizations'] = $customizations;

        // Decode weight_options JSON for frontend
        $row['weight_options'] = !empty($row['weight_options']) ? json_decode($row['weight_options'], true) : [];

        $products[] = $row;
    }
    
    http_response_code(200);
    echo json_encode(["success" => true, "products" => $products]);
    
} catch (Exception $e) {
    http_response_code(500);
    error_log('get_all_products.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
