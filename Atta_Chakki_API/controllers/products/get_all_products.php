<?php
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cache_helper.php';

header('Content-Type: application/json');
header('Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600');

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $cache_key = 'all_products_admin';
    $cached = get_api_cache($cache_key, 300);
    if ($cached !== false) {
        http_response_code(200);
        echo $cached;
        exit;
    }

    $sql = "SELECT p.*, p.image_url AS image, c.name as category_name FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.priority DESC, p.created_at DESC";
    
    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }
    
    $raw_products = [];
    $product_ids = [];
    while ($row = $result->fetch_assoc()) {
        $raw_products[] = $row;
        $product_ids[] = (int)$row['id'];
    }

    $customizations_map = [];
    $mix_items_map = [];

    // BULK BATCH QUERY 1: Customizations
    if (!empty($product_ids)) {
        $in_clause = implode(',', array_map('intval', $product_ids));
        
        $cust_res = $conn->query("SELECT product_id, id, option_name, option_price, sort_order FROM product_customizations WHERE product_id IN ($in_clause) ORDER BY sort_order ASC");
        if ($cust_res) {
            while ($c_row = $cust_res->fetch_assoc()) {
                $pid = (int)$c_row['product_id'];
                if (!isset($customizations_map[$pid])) {
                    $customizations_map[$pid] = [];
                }
                $customizations_map[$pid][] = [
                    'id' => (int)$c_row['id'],
                    'option_name' => $c_row['option_name'],
                    'option_price' => floatval($c_row['option_price']),
                    'sort_order' => (int)$c_row['sort_order']
                ];
            }
        }

        // BULK BATCH QUERY 2: Mix items
        $mix_res = $conn->query("SELECT product_id, id, item_name, price_per_kg, default_ratio, sort_order FROM product_mix_items WHERE product_id IN ($in_clause) ORDER BY sort_order ASC");
        if ($mix_res) {
            while ($m_row = $mix_res->fetch_assoc()) {
                $pid = (int)$m_row['product_id'];
                if (!isset($mix_items_map[$pid])) {
                    $mix_items_map[$pid] = [];
                }
                $mix_items_map[$pid][] = [
                    'id' => (int)$m_row['id'],
                    'item_name' => $m_row['item_name'],
                    'price_per_kg' => floatval($m_row['price_per_kg']),
                    'default_ratio' => floatval($m_row['default_ratio']),
                    'sort_order' => (int)$m_row['sort_order']
                ];
            }
        }
    }

    $products = [];
    foreach ($raw_products as $row) {
        $product_id = (int)$row['id'];
        $weight_options_raw = $row['weight_options'] ?? '[]';
        $weight_options = json_decode($weight_options_raw, true);
        if (!is_array($weight_options)) {
            $weight_options = [];
        }

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
        $row['weight_options'] = $weight_options;
        $row['is_custom_mix'] = (int)($row['is_custom_mix'] ?? 0);
        $row['track_inventory'] = (int)($row['track_inventory'] ?? 1);
        $row['min_stock_level'] = floatval($row['min_stock_level'] ?? 0);
        $row['customizations'] = $customizations_map[$product_id] ?? [];
        $row['mix_items'] = $mix_items_map[$product_id] ?? [];

        $products[] = $row;
    }
    
    $response_data = json_encode(["success" => true, "products" => $products]);
    set_api_cache($cache_key, $response_data);

    http_response_code(200);
    echo $response_data;
    
} catch (Exception $e) {
    http_response_code(500);
    error_log('get_all_products.php error: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}

$conn->close();
