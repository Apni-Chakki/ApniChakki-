<?php
require_once dirname(__DIR__, 2) . '/Config/connect.php';

function executeQuery($conn, $sql, $successMsg) {
    if ($conn->query($sql) === TRUE) {
        echo "[SUCCESS] $successMsg\n";
    } else {
        echo "[ERROR] Could not execute query ($sql): " . $conn->error . "\n";
    }
}

echo "Starting Cart Table Migration...\n\n";

// 1. Re-create carts table if dropped
$sqlCarts = "CREATE TABLE IF NOT EXISTS `carts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;";
executeQuery($conn, $sqlCarts, "Ensured 'carts' table exists.");

// 2. Re-create cart_items table with extra fields
$sqlCartItems = "CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cart_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 1.00,
  `is_cleaning` tinyint(1) DEFAULT 0,
  `is_grinding` tinyint(1) DEFAULT 0,
  `is_weight_pending` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `cart_id` (`cart_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;";
executeQuery($conn, $sqlCartItems, "Ensured 'cart_items' table exists with cleaning/grinding fields.");

echo "\nMigration Complete!\n";
$conn->close();
?>
