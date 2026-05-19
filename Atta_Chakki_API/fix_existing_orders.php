<?php
require_once __DIR__ . '/api/Config/connect.php';
header('Content-Type: application/json');

$sql = "UPDATE order_items SET original_price = 1230.00 WHERE product_id = 39 AND (original_price IS NULL OR original_price = price_at_purchase)";
if ($conn->query($sql)) {
    $affected = $conn->affected_rows;
    echo json_encode(["success" => true, "message" => "Successfully updated $affected order items for Abdur Rehman."]);
} else {
    echo json_encode(["success" => false, "error" => $conn->error]);
}
