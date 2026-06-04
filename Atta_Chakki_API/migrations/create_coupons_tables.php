<?php
// Migration: create coupons + coupon_usage tables
require_once dirname(__DIR__) . '/api/Config/connect.php';
header('Content-Type: application/json');

$results = [];

$sql_coupons = "CREATE TABLE IF NOT EXISTS coupons (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
$results[] = $conn->query($sql_coupons) ? 'coupons table created/exists' : 'coupons FAILED: ' . $conn->error;

$sql_usage = "CREATE TABLE IF NOT EXISTS coupon_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coupon_id INT NOT NULL,
    user_id INT NULL,
    order_id INT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_coupon (coupon_id),
    INDEX idx_user (user_id),
    INDEX idx_order (order_id),
    CONSTRAINT fk_coupon_usage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
$results[] = $conn->query($sql_usage) ? 'coupon_usage table created/exists' : 'coupon_usage FAILED: ' . $conn->error;

// Add coupon columns to orders table (if not present)
$col_check = $conn->query("SHOW COLUMNS FROM orders LIKE 'coupon_code'");
if ($col_check && $col_check->num_rows === 0) {
    $r1 = $conn->query("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) NULL AFTER total_amount");
    $r2 = $conn->query("ALTER TABLE orders ADD COLUMN coupon_discount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER coupon_code");
    $results[] = ($r1 && $r2) ? 'orders coupon columns added' : 'orders FAILED: ' . $conn->error;
} else {
    $results[] = 'orders coupon columns exist';
}

echo json_encode(["success" => true, "results" => $results]);
