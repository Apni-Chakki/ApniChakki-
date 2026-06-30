<?php
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // 1. Fetch all products
    $sql = "SELECT p.*, p.image_url AS image, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.priority DESC, p.created_at DESC";
    
    $result = $conn->query($sql);
    if (!$result) throw new Exception("Query failed: " . $conn->error);
    
    $products = [];
    $product_ids = [];

    // First pass: build the products array and collect IDs
    while ($row = $result->fetch_assoc()) {
        $product_id = (int)$row['id'];
        $product_ids[] = $product_id;
        
        // Initialize arrays so they exist even if empty later
        $row['customizations'] = [];
        $row['mix_items'] = [];
        
        // Use the product ID as the array key for quick lookup later
        $products[$product_id] = $row;
    }

    // Only run the related queries if we actually have products
    if (!empty($product_ids)) {
        $id_list = implode(',', $product_ids); // e.g., "1,2,3,4,5"

        // 2. Fetch ALL customizations for these products in ONE query
        $cust_sql = "SELECT id, product_id, option_name, option_price, sort_order 
                     FROM product_customizations 
                     WHERE product_id IN ($id_list) 
                     ORDER BY sort_order ASC";
        $cust_res = $conn->query($cust_sql);
        
        while ($cust_row = $cust_res->fetch_assoc()) {
            $pid = (int)$cust_row['product_id'];
            $products[$pid]['customizations'][] = [
                'id' => (int)$cust_row['id'],
                'option_name' => $cust_row['option_name'],
                'option_price' => floatval($cust_row['option_price']),
                'sort_order' => (int)$cust_row['sort_order']
            ];
        }

        // 3. Fetch ALL mix items for these products in ONE query
        $mix_sql = "SELECT id, product_id, item_name, price_per_kg, default_ratio, sort_order 
                    FROM product_mix_items 
                    WHERE product_id IN ($id_list) 
                    ORDER BY sort_order ASC";
        $mix_res = $conn->query($mix_sql);
        
        while ($mix_row = $mix_res->fetch_assoc()) {
            $pid = (int)$mix_row['product_id'];
            $products[$pid]['mix_items'][] = [
                'id' => (int)$mix_row['id'],
                'item_name' => $mix_row['item_name'],
                'price_per_kg' => floatval($mix_row['price_per_kg']),
                'default_ratio' => floatval($mix_row['default_ratio']),
                'sort_order' => (int)$mix_row['sort_order']
            ];
        }
    }

    // Final pass: Format the data types and reset the array keys
    $final_products = [];
    foreach ($products as $row) {
        $weight_options_raw = $row['weight_options'] ?? '[]';
        $weight_options = json_decode($weight_options_raw, true);
        
        $row['price'] = floatval($row['price']);
        $row['stock'] = intval($row['stock_quantity'] ?? 0);
        $row['stock_quantity'] = floatval($row['stock_quantity'] ?? 0);
        $row['is_grinding_service'] = (int)($row['is_grinding_service'] ?? 0);
        $row['cleaning_price'] = floatval($row['cleaning_price'] ?? 0);
        $row['grinding_price'] = floatval($row['grinding_price'] ?? 0);
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
        $row['weight_options'] = is_array($weight_options) ? $weight_options : [];
        $row['is_custom_mix'] = (int)($row['is_custom_mix'] ?? 0);
        $row['track_inventory'] = (int)($row['track_inventory'] ?? 1);
        $row['min_stock_level'] = floatval($row['min_stock_level'] ?? 0);
        
        $final_products[] = $row;
    }
    
    http_response_code(200);
    echo json_encode(["success" => true, "products" => $final_products]);
    
} catch (Exception $e) {
    http_response_code(500);
    error_log('get_all_products.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}