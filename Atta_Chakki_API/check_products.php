<?php
require_once __DIR__ . '/api/Config/connect.php';
header('Content-Type: application/json');

$res = $conn->query("SELECT id, name, price, discount_type, discount_value FROM products");
$products = [];
while ($row = $res->fetch_assoc()) {
    $products[] = $row;
}
echo json_encode($products, JSON_PRETTY_PRINT);
