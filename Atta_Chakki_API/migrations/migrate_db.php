<?php
require_once dirname(__DIR__) . '/config/connect.php';

echo "Starting database migration...\n";

function add_column_if_not_exists($conn, $table, $column, $definition) {
    $tbl_check = $conn->query("SHOW TABLES LIKE '$table'");
    if (!$tbl_check || $tbl_check->num_rows === 0) {
        echo "Table $table does not exist. Skipping.\n";
        return;
    }
    $result = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
    if ($result && $result->num_rows === 0) {
        $sql = "ALTER TABLE `$table` ADD COLUMN `$column` $definition";
        echo "Executing: $sql\n";
        if ($conn->query($sql)) {
            echo "Success.\n";
        } else {
            echo "Error adding $column to $table: " . $conn->error . "\n";
        }
    } else {
        echo "Column $column already exists in $table. Skipping.\n";
    }
}

add_column_if_not_exists($conn, 'products', 'is_grinding_service', 'TINYINT(1) DEFAULT 0 AFTER image_url');
add_column_if_not_exists($conn, 'products', 'cleaning_price', 'DECIMAL(10,2) DEFAULT 0.00 AFTER is_grinding_service');
add_column_if_not_exists($conn, 'products', 'grinding_price', 'DECIMAL(10,2) DEFAULT 0.00 AFTER cleaning_price');

add_column_if_not_exists($conn, 'cart_items', 'is_cleaning', 'TINYINT(1) DEFAULT 0');
add_column_if_not_exists($conn, 'cart_items', 'is_grinding', 'TINYINT(1) DEFAULT 0');
add_column_if_not_exists($conn, 'cart_items', 'is_weight_pending', 'TINYINT(1) DEFAULT 0');

add_column_if_not_exists($conn, 'order_items', 'is_cleaning', 'TINYINT(1) DEFAULT 0');
add_column_if_not_exists($conn, 'order_items', 'is_grinding', 'TINYINT(1) DEFAULT 0');
add_column_if_not_exists($conn, 'order_items', 'is_weight_pending', 'TINYINT(1) DEFAULT 0');
add_column_if_not_exists($conn, 'order_items', 'original_price', 'DECIMAL(10,2) DEFAULT NULL');
add_column_if_not_exists($conn, 'order_items', 'is_rental', 'TINYINT(1) DEFAULT 0');
add_column_if_not_exists($conn, 'order_items', 'rental_days', 'INT(11) DEFAULT NULL');
add_column_if_not_exists($conn, 'order_items', 'rental_start_date', 'DATE DEFAULT NULL');
add_column_if_not_exists($conn, 'order_items', 'rental_price_per_day', 'DECIMAL(10,2) DEFAULT NULL');
add_column_if_not_exists($conn, 'order_items', 'security_deposit', 'DECIMAL(10,2) DEFAULT NULL');
add_column_if_not_exists($conn, 'order_items', 'late_penalty_per_day', 'DECIMAL(10,2) DEFAULT NULL');

echo "Migration finished.\n";
?>
