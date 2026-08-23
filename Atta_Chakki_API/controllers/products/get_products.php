<?php
/* 
 * Get products with optional category filter (Optimized with Bulk Batch Queries & Caching)
 * API Endpoint: GET /get_products.php?category=wheat
 */

require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cache_helper.php';

header('Content-Type: application/json');
header('Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600');

try {
    $category = isset($_GET['category']) && trim($_GET['category']) !== '' ? trim($_GET['category']) : null;
    $cache_key = 'products_' . ($category ? strtolower($category) : 'all');

    // Return cached response if available
    $cached = get_api_cache($cache_key, 300);
    if ($cached !== false) {
        http_response_code(200);
        echo $cached;
        exit;
    }
    
    if ($category) {
        $sql = "SELECT p.*, c.name as category
                FROM products p IGNORE INDEX (idx_products_is_active)
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
        $sql = "SELECT p.*, c.name as category
                FROM products p IGNORE INDEX (idx_products_is_active)
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.is_active = 1 AND (c.id IS NULL OR c.is_active = 1)
                ORDER BY p.priority DESC, p.created_at DESC";
        
        $result = $conn->query($sql);
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }
    }
    
    $raw_products = [];
    $product_ids = [];
    while ($row = $result->fetch_assoc()) {
        $raw_products[] = $row;
        $product_ids[] = (int)$row['id'];
    }

    $customizations_map = [];
    $mix_items_map = [];

    // BULK BATCH QUERY 1: Fetch all customizations for retrieved products in 1 query
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

        // BULK BATCH QUERY 2: Fetch all mix items for retrieved products in 1 query
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
            'customizations' => $customizations_map[$product_id] ?? [],
            'mix_items' => $mix_items_map[$product_id] ?? []
        ];
    }
    
    $response_data = json_encode([
        'success' => true,
        'products' => $products,
        'count' => count($products)
    ]);

    set_api_cache($cache_key, $response_data);
    
    http_response_code(200);
    echo $response_data;
    
} catch (Exception $e) {
    error_log('Get Products Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch products: ' . $e->getMessage()
    ]);
}

$conn->close();
