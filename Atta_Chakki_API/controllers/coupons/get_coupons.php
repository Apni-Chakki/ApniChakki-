<?php
// Get all active coupons
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

    $sql = "SELECT id, code, description, discount_type, discount_value, min_order_amount, usage_limit, used_count, expiry_date, is_active 
            FROM coupons 
            WHERE is_active = 1";
    
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
                'usage_limit' => $row['usage_limit'] !== null ? (int)$row['usage_limit'] : null,
                'used_count' => (int)$row['used_count'],
                'expiry_date' => $row['expiry_date'],
                'is_active' => (int)$row['is_active']
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'coupons' => $coupons
    ]);

} catch (Exception $e) {
    error_log('Get Coupons Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
