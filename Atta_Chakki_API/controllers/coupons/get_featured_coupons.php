<?php
// Get featured/active coupons for homepage display with caching
require_once __DIR__ . '/../../utils/cache_helper.php';

header('Content-Type: application/json');
header('Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600');

$cache_key = 'featured_coupons';
$cached = get_api_cache($cache_key, 120);
if ($cached !== false) {
    echo $cached;
    exit;
}

include __DIR__ . '/../../config/connect.php';

try {
    $sql = "SELECT id, code, description, discount_type, discount_value, min_order_amount, expiry_date 
            FROM coupons 
            WHERE is_active = 1 
              AND is_featured = 1
              AND (expiry_date IS NULL OR expiry_date > NOW())
            ORDER BY created_at DESC";
    
    $result = $conn->query($sql);
    
    $coupons = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $coupons[] = [
                'id' => (int)$row['id'],
                'code' => $row['code'],
                'description' => $row['description'],
                'discount_type' => $row['discount_type'],
                'discount_value' => (float)$row['discount_value'],
                'min_order_amount' => (float)$row['min_order_amount'],
                'expiry_date' => $row['expiry_date']
            ];
        }
    }
    
    $response = json_encode([
        'success' => true,
        'coupons' => $coupons
    ]);

    set_api_cache($cache_key, $response);
    echo $response;

} catch (Exception $e) {
    error_log('Get Featured Coupons Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
