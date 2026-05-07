<?php
require_once dirname(__DIR__) . '/api/Config/connect.php';
header('Content-Type: application/json');

$r = $conn->query("ALTER TABLE products ADD COLUMN track_inventory TINYINT(1) NOT NULL DEFAULT 1");
if ($r) {
    // Set service-category products to NOT track inventory by default
    $conn->query("UPDATE products p JOIN categories c ON p.category_id = c.id SET p.track_inventory = 0 WHERE c.name = 'service'");
    echo json_encode(["success" => true, "message" => "track_inventory column added successfully"]);
} else {
    echo json_encode(["success" => false, "message" => $conn->error]);
}
