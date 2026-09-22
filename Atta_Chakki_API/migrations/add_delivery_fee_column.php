<?php
require_once dirname(__DIR__) . '/config/connect.php';

echo "Adding delivery_fee column to orders table if not exists...\n";

$result = $conn->query("SHOW COLUMNS FROM `orders` LIKE 'delivery_fee'");
if ($result && $result->num_rows === 0) {
    $sql = "ALTER TABLE `orders` ADD COLUMN `delivery_fee` DECIMAL(10,2) DEFAULT 0.00 AFTER `total_amount`";
    if ($conn->query($sql)) {
        echo "Successfully added delivery_fee column to orders table.\n";
    } else {
        echo "Error adding delivery_fee column: " . $conn->error . "\n";
    }
} else {
    echo "Column delivery_fee already exists in orders table.\n";
}
