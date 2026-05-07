<?php
require_once dirname(__DIR__, 2) . '/Config/connect.php';

function executeQuery($conn, $sql, $successMsg) {
    if ($conn->query($sql) === TRUE) {
        echo "[SUCCESS] $successMsg\n";
    } else {
        echo "[ERROR] Could not execute query ($sql): " . $conn->error . "\n";
    }
}

echo "Starting Database Optimization...\n\n";

// 1. Drop unused tables
executeQuery($conn, "DROP TABLE IF EXISTS `reviews`", "Dropped 'reviews' table.");
executeQuery($conn, "DROP TABLE IF EXISTS `addresses`", "Dropped 'addresses' table.");
executeQuery($conn, "DROP TABLE IF EXISTS `cart_items`", "Dropped 'cart_items' table (replaced by client-side storage).");
executeQuery($conn, "DROP TABLE IF EXISTS `carts`", "Dropped 'carts' table (replaced by client-side storage).");

// 2. Drop unused columns from 'orders'
// These are either redundant (replaced by newer systems) or never used
$ordersColumns = ['delivery_date', 'special_instructions', 'transaction_id'];
foreach ($ordersColumns as $col) {
    $check = $conn->query("SHOW COLUMNS FROM `orders` LIKE '$col'");
    if ($check && $check->num_rows > 0) {
        executeQuery($conn, "ALTER TABLE `orders` DROP COLUMN `$col`", "Dropped '$col' from 'orders'.");
    } else {
        echo "[INFO] Column '$col' in 'orders' already dropped or does not exist.\n";
    }
}

// 3. Drop redundant columns from 'tracking_tokens'
// We use fallback to 'orders' table for driver info now
$trackingColumns = ['driver_name', 'driver_phone'];
foreach ($trackingColumns as $col) {
    $check = $conn->query("SHOW COLUMNS FROM `tracking_tokens` LIKE '$col'");
    if ($check && $check->num_rows > 0) {
        executeQuery($conn, "ALTER TABLE `tracking_tokens` DROP COLUMN `$col`", "Dropped '$col' from 'tracking_tokens'.");
    } else {
        echo "[INFO] Column '$col' in 'tracking_tokens' already dropped or does not exist.\n";
    }
}

echo "\nDatabase Optimization Complete!\n";

$conn->close();
?>




