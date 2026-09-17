<?php
require_once __DIR__ . '/../config/connect.php';

function addColIfNotExists($conn, $table, $col, $def) {
    $check = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$col'");
    if ($check && $check->num_rows == 0) {
        $sql = "ALTER TABLE `$table` ADD COLUMN `$col` $def";
        if ($conn->query($sql)) {
            echo "Added $col to $table\n";
        } else {
            echo "Error adding $col: " . $conn->error . "\n";
        }
    } else {
        echo "Column $col already exists in $table\n";
    }
}

addColIfNotExists($conn, 'orders', 'parent_order_id', 'INT(11) NULL DEFAULT NULL AFTER id');
addColIfNotExists($conn, 'orders', 'batch_index', 'INT(11) NULL DEFAULT NULL AFTER parent_order_id');
addColIfNotExists($conn, 'orders', 'total_batches', 'INT(11) NULL DEFAULT NULL AFTER batch_index');

$idx = $conn->query("SHOW INDEX FROM orders WHERE Key_name = 'idx_orders_parent_order_id'");
if ($idx && $idx->num_rows == 0) {
    if ($conn->query("ALTER TABLE orders ADD INDEX idx_orders_parent_order_id (parent_order_id)")) {
        echo "Added index idx_orders_parent_order_id\n";
    }
}
echo "Migration finished successfully.\n";
