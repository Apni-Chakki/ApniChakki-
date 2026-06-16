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
        $sql = "SELECT p.*, c.name as category
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE c.name = ? AND p.is_active = 1 AND (c.id IS NULL OR c.is_active = 1)
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
        $sql = "SELECT p.*, c.name as category
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.is_active = 1 AND (c.id IS NULL OR c.is_active = 1)
                ORDER BY p.priority DESC, p.created_at DESC";
        
        $result = $conn->query($sql);
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }
    }
    
    $products = [];
    
    while ($row = $result->fetch_assoc()) {
        $product_id = (int)$row['id'];
        
        // Fetch customizations
        $cust_stmt = $conn->prepare("SELECT id, option_name, option_price, sort_order FROM product_customizations WHERE product_id = ? ORDER BY sort_order ASC");
        $cust_stmt->bind_param("i", $product_id);
        $cust_stmt->execute();
        $cust_res = $cust_stmt->get_result();
        $customizations = [];
        while ($cust_row = $cust_res->fetch_assoc()) {
            $customizations[] = [
                'id' => (int)$cust_row['id'],
                'option_name' => $cust_row['option_name'],
                'option_price' => floatval($cust_row['option_price']),
                'sort_order' => (int)$cust_row['sort_order']
            ];
        }
        $cust_stmt->close();

        // Fetch mix items
        $mix_stmt = $conn->prepare("SELECT id, item_name, price_per_kg, default_ratio, sort_order FROM product_mix_items WHERE product_id = ? ORDER BY sort_order ASC");
        $mix_stmt->bind_param("i", $product_id);
        $mix_stmt->execute();
        $mix_res = $mix_stmt->get_result();
        $mix_items = [];
        while ($mix_row = $mix_res->fetch_assoc()) {
            $mix_items[] = [
                'id' => (int)$mix_row['id'],
                'item_name' => $mix_row['item_name'],
                'price_per_kg' => floatval($mix_row['price_per_kg']),
                'default_ratio' => floatval($mix_row['default_ratio']),
                'sort_order' => (int)$mix_row['sort_order']
            ];
        }
        $mix_stmt->close();

        $weight_options_raw = $row['weight_options'] ?? '[]';
        $weight_options = json_decode($weight_options_raw, true);
        if (!is_array($weight_options)) {
            $weight_options = [];
        }

        $products[] = [
            'id' => $product_id,
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
            'rental_available_qty' => intval($row['rental_available_qty'] ?? 0),
            'is_active' => (int)($row['is_active'] ?? 1),
            'discount_type' => $row['discount_type'] ?? 'none',
            'discount_value' => floatval($row['discount_value'] ?? 0),
            'badge_text' => $row['badge_text'] ?? '',
            'dual_unit' => (int)($row['dual_unit'] ?? 0),
            'weight_options' => $weight_options,
            'is_custom_mix' => (int)($row['is_custom_mix'] ?? 0),
            'track_inventory' => (int)($row['track_inventory'] ?? 1),
            'is_grinding_service' => (int)($row['is_grinding_service'] ?? 0),
            'cleaning_price' => floatval($row['cleaning_price'] ?? 0),
            'grinding_price' => floatval($row['grinding_price'] ?? 0),
            'min_stock_level' => floatval($row['min_stock_level'] ?? 0),
            'customizations' => $customizations,
            'mix_items' => $mix_items
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

