<?php
require_once dirname(__DIR__) . '/api/Config/connect.php';

echo "Starting database migration...\n";

// Add columns to products table
$queries = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_grinding_service TINYINT(1) DEFAULT 0 AFTER image_url",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS cleaning_price DECIMAL(10,2) DEFAULT 0.00 AFTER is_grinding_service",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS grinding_price DECIMAL(10,2) DEFAULT 0.00 AFTER cleaning_price",
    
    "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS is_cleaning TINYINT(1) DEFAULT 0",
    "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS is_grinding TINYINT(1) DEFAULT 0",
    "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS is_weight_pending TINYINT(1) DEFAULT 0",
    
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_cleaning TINYINT(1) DEFAULT 0",
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_grinding TINYINT(1) DEFAULT 0",
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_weight_pending TINYINT(1) DEFAULT 0"
];

foreach ($queries as $sql) {
    echo "Executing: $sql\n";
    if ($conn->query($sql)) {
        echo "Success.\n";
    } else {
        echo "Error: " . $conn->error . "\n";
    }
}

echo "Migration finished.\n";
