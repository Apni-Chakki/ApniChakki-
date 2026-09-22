<?php
require_once __DIR__ . '/../config/connect.php';

echo "=== Adding Performance Indexes ===\n";

$indexes = [
    [
        'table' => 'orders',
        'name' => 'idx_orders_status_created_at',
        'sql' => 'ALTER TABLE `orders` ADD INDEX `idx_orders_status_created_at` (`status`, `created_at`)'
    ],
    [
        'table' => 'orders',
        'name' => 'idx_orders_driver_phone',
        'sql' => 'ALTER TABLE `orders` ADD INDEX `idx_orders_driver_phone` (`driver_phone`)'
    ],
    [
        'table' => 'orders',
        'name' => 'idx_orders_user_id',
        'sql' => 'ALTER TABLE `orders` ADD INDEX `idx_orders_user_id` (`user_id`)'
    ],
    [
        'table' => 'order_items',
        'name' => 'idx_order_items_order_id',
        'sql' => 'ALTER TABLE `order_items` ADD INDEX `idx_order_items_order_id` (`order_id`)'
    ],
    [
        'table' => 'order_items',
        'name' => 'idx_order_items_product_id',
        'sql' => 'ALTER TABLE `order_items` ADD INDEX `idx_order_items_product_id` (`product_id`)'
    ],
    [
        'table' => 'order_item_customizations',
        'name' => 'idx_oic_order_item_id',
        'sql' => 'ALTER TABLE `order_item_customizations` ADD INDEX `idx_oic_order_item_id` (`order_item_id`)'
    ],
    [
        'table' => 'rentals',
        'name' => 'idx_rentals_order_product',
        'sql' => 'ALTER TABLE `rentals` ADD INDEX `idx_rentals_order_product` (`order_id`, `product_id`)'
    ]
];

foreach ($indexes as $idx) {
    $table = $idx['table'];
    $indexName = $idx['name'];
    $sql = $idx['sql'];

    // Check if table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE '$table'");
    if (!$tableCheck || $tableCheck->num_rows === 0) {
        echo "[SKIP] Table `$table` does not exist.\n";
        continue;
    }

    // Check if index already exists
    $checkQuery = "SHOW INDEX FROM `$table` WHERE Key_name = '$indexName'";
    $checkRes = $conn->query($checkQuery);

    if ($checkRes && $checkRes->num_rows > 0) {
        echo "[EXISTS] Index `$indexName` on `$table` already exists.\n";
    } else {
        if ($conn->query($sql)) {
            echo "[SUCCESS] Created index `$indexName` on `$table`.\n";
        } else {
            echo "[ERROR] Failed to create index `$indexName` on `$table`: " . $conn->error . "\n";
        }
    }
}

echo "=== Index Migration Complete ===\n";
