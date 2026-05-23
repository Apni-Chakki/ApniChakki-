<?php
// Get featured/active coupons for homepage display
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    // Create coupons table if it doesn't exist
    $conn->query("CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        discount_type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
        discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
        min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        usage_limit INT NULL,
        used_count INT NOT NULL DEFAULT 0,
        expiry_date DATETIME NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        is_featured TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_active_featured (is_active, is_featured)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

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
    
    echo json_encode([
        'success' => true,
        'coupons' => $coupons
    ]);

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
