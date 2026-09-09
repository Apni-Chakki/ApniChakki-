<?php
require_once dirname(__DIR__) . '/config/connect.php';
header('Content-Type: application/json');

$check = $conn->query("SHOW COLUMNS FROM products LIKE 'track_inventory'");
if ($check && $check->num_rows === 0) {
    $r = $conn->query("ALTER TABLE products ADD COLUMN track_inventory TINYINT(1) NOT NULL DEFAULT 1");
    if ($r) {
        $conn->query("UPDATE products p JOIN categories c ON p.category_id = c.id SET p.track_inventory = 0 WHERE c.name = 'service'");
        echo json_encode(["success" => true, "message" => "track_inventory column added successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => $conn->error]);
    }
} else {
    echo json_encode(["success" => true, "message" => "track_inventory column already exists"]);
}
?>
