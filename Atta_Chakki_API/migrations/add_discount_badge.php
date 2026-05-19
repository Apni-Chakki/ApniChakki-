<?php
// Migration: add discount and badge columns to products
require_once dirname(__DIR__) . '/api/Config/connect.php';
header('Content-Type: application/json');

$results = [];

// Check & add discount_type
$check = $conn->query("SHOW COLUMNS FROM products LIKE 'discount_type'");
if ($check && $check->num_rows === 0) {
    $r = $conn->query("ALTER TABLE products ADD COLUMN discount_type ENUM('none','percentage','fixed') NOT NULL DEFAULT 'none' AFTER price");
    $results[] = $r ? 'discount_type added' : 'discount_type FAILED: ' . $conn->error;
} else {
    $results[] = 'discount_type exists';
}

// Check & add discount_value
$check = $conn->query("SHOW COLUMNS FROM products LIKE 'discount_value'");
if ($check && $check->num_rows === 0) {
    $r = $conn->query("ALTER TABLE products ADD COLUMN discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER discount_type");
    $results[] = $r ? 'discount_value added' : 'discount_value FAILED: ' . $conn->error;
} else {
    $results[] = 'discount_value exists';
}

// Check & add badge_text
$check = $conn->query("SHOW COLUMNS FROM products LIKE 'badge_text'");
if ($check && $check->num_rows === 0) {
    $r = $conn->query("ALTER TABLE products ADD COLUMN badge_text VARCHAR(50) NULL DEFAULT NULL AFTER discount_value");
    $results[] = $r ? 'badge_text added' : 'badge_text FAILED: ' . $conn->error;
} else {
    $results[] = 'badge_text exists';
}

echo json_encode(["success" => true, "results" => $results]);
