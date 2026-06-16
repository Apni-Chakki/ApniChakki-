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
            ORDER BY p.priority DESC, p.created_at DESC";
    
    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
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

        // Map database fields to expected output format
        $row['price'] = floatval($row['price']);
        $row['stock'] = intval($row['stock_quantity'] ?? 0);
        $row['stock_quantity'] = floatval($row['stock_quantity'] ?? 0);
        $row['is_grinding_service'] = (int)($row['is_grinding_service'] ?? 0);
        $row['cleaning_price'] = floatval($row['cleaning_price'] ?? 0);
        $row['grinding_price'] = floatval($row['grinding_price'] ?? 0);
        // Rental fields
        $row['is_rental'] = (int)($row['is_rental'] ?? 0);
        $row['rental_price_per_day'] = floatval($row['rental_price_per_day'] ?? 0);
        $row['security_deposit'] = floatval($row['security_deposit'] ?? 0);
        $row['late_penalty_per_day'] = floatval($row['late_penalty_per_day'] ?? 0);
        $row['rental_available_qty'] = intval($row['rental_available_qty'] ?? 0);
        $row['is_active'] = isset($row['is_active']) ? (int)$row['is_active'] : 1;
        
        $row['discount_type'] = $row['discount_type'] ?? 'none';
        $row['discount_value'] = floatval($row['discount_value'] ?? 0);
        $row['badge_text'] = $row['badge_text'] ?? '';
        $row['dual_unit'] = (int)($row['dual_unit'] ?? 0);
        $row['weight_options'] = $weight_options;
        $row['is_custom_mix'] = (int)($row['is_custom_mix'] ?? 0);
        $row['track_inventory'] = (int)($row['track_inventory'] ?? 1);
        $row['min_stock_level'] = floatval($row['min_stock_level'] ?? 0);
        $row['customizations'] = $customizations;
        $row['mix_items'] = $mix_items;

        $products[] = $row;
    }
    
    http_response_code(200);
    echo json_encode(["success" => true, "products" => $products]);
    
} catch (Exception $e) {
    http_response_code(500);
    error_log('get_all_products.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
