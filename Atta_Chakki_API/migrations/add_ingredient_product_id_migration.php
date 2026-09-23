<?php
require_once __DIR__ . '/../config/connect.php';

header('Content-Type: text/plain');
echo "=== Running Migration: add_ingredient_product_id_migration ===\n";

// 1. Add product_ingredient_id to product_mix_items
$checkCol1 = $conn->query("SHOW COLUMNS FROM `product_mix_items` LIKE 'product_ingredient_id'");
if ($checkCol1 && $checkCol1->num_rows == 0) {
    $sql1 = "ALTER TABLE `product_mix_items` ADD COLUMN `product_ingredient_id` INT NULL AFTER `product_id`";
    if ($conn->query($sql1)) {
        echo "✅ Added 'product_ingredient_id' column to product_mix_items table.\n";
    } else {
        echo "❌ Error adding product_ingredient_id: " . $conn->error . "\n";
    }
} else {
    echo "ℹ️ Column 'product_ingredient_id' already exists in product_mix_items.\n";
}

// 2. Add linked_product_id to product_customizations
$checkCol2 = $conn->query("SHOW COLUMNS FROM `product_customizations` LIKE 'linked_product_id'");
if ($checkCol2 && $checkCol2->num_rows == 0) {
    $sql2 = "ALTER TABLE `product_customizations` ADD COLUMN `linked_product_id` INT NULL AFTER `product_id`";
    if ($conn->query($sql2)) {
        echo "✅ Added 'linked_product_id' column to product_customizations table.\n";
    } else {
        echo "❌ Error adding linked_product_id: " . $conn->error . "\n";
    }
} else {
    echo "ℹ️ Column 'linked_product_id' already exists in product_customizations.\n";
}

echo "=== Migration Complete ===\n";
