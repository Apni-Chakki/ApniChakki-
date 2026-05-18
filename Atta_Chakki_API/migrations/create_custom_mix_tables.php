<?php
/**
 * Migration: Create tables for Custom Mix product feature
 * - product_mix_items: stores ingredients for mix products
 * - custom_mix_requests: stores customer custom mix requests
 * Also adds is_custom_mix column to products table
 */

require_once dirname(__DIR__) . '/api/Config/connect.php';

header('Content-Type: application/json');

$results = [];

// 1. Add is_custom_mix column to products table
$sql1 = "ALTER TABLE products ADD COLUMN IF NOT EXISTS `is_custom_mix` TINYINT(1) DEFAULT 0 AFTER `is_grinding_service`";
if ($conn->query($sql1)) {
    $results[] = "✅ Added is_custom_mix column to products table";
} else {
    // Column might already exist
    if ($conn->errno == 1060) {
        $results[] = "ℹ️ is_custom_mix column already exists";
    } else {
        $results[] = "❌ Error adding is_custom_mix column: " . $conn->error;
    }
}

// 2. Create product_mix_items table
$sql2 = "CREATE TABLE IF NOT EXISTS `product_mix_items` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `product_id` INT(11) NOT NULL,
    `item_name` VARCHAR(100) NOT NULL,
    `price_per_kg` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `default_ratio` DECIMAL(5,2) DEFAULT 1.00 COMMENT 'Default proportion in kg',
    `sort_order` INT(11) DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `product_id` (`product_id`),
    CONSTRAINT `fk_mix_items_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";

if ($conn->query($sql2)) {
    $results[] = "✅ Created product_mix_items table";
} else {
    if ($conn->errno == 1050) {
        $results[] = "ℹ️ product_mix_items table already exists";
    } else {
        $results[] = "❌ Error creating product_mix_items: " . $conn->error;
    }
}

// 3. Create custom_mix_requests table
$sql3 = "CREATE TABLE IF NOT EXISTS `custom_mix_requests` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `product_id` INT(11) DEFAULT NULL,
    `product_name` VARCHAR(255) DEFAULT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `customer_email` VARCHAR(100) DEFAULT NULL,
    `selected_items` JSON DEFAULT NULL COMMENT 'Items selected from predefined list with quantities',
    `custom_items` TEXT DEFAULT NULL COMMENT 'Custom items/proportions requested by customer',
    `total_quantity` DECIMAL(10,2) DEFAULT 0.00,
    `estimated_price` DECIMAL(10,2) DEFAULT 0.00,
    `status` ENUM('pending','contacted','in_progress','completed','cancelled') DEFAULT 'pending',
    `admin_notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `product_id` (`product_id`),
    KEY `status` (`status`),
    KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";

if ($conn->query($sql3)) {
    $results[] = "✅ Created custom_mix_requests table";
} else {
    if ($conn->errno == 1050) {
        $results[] = "ℹ️ custom_mix_requests table already exists";
    } else {
        $results[] = "❌ Error creating custom_mix_requests: " . $conn->error;
    }
}

echo json_encode([
    "success" => true,
    "message" => "Custom Mix migration completed",
    "results" => $results
], JSON_PRETTY_PRINT);

$conn->close();
