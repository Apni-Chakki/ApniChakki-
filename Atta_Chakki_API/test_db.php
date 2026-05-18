<?php
include 'Config/connect.php';
header('Content-Type: application/json');

$query = $conn->query("SELECT id, name, is_custom_mix, price, unit FROM products WHERE name LIKE '%Multi%'");
$products = [];
while($row = $query->fetch_assoc()) {
    $pid = $row['id'];
    $mix_query = $conn->query("SELECT * FROM product_mix_items WHERE product_id = $pid");
    $mix_items = [];
    while($m = $mix_query->fetch_assoc()) {
        $mix_items[] = $m;
    }
    $row['mix_items'] = $mix_items;
    $products[] = $row;
}
echo json_encode($products, JSON_PRETTY_PRINT);
?>
