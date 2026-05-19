<?php
require_once __DIR__ . '/api/Config/connect.php';

$category = null;
$sql = "SELECT p.*, c.name as category 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.name LIKE '%Abdur Rehman%'";

$result = $conn->query($sql);
$row = $result->fetch_assoc();
echo "ROW IN DB:\n";
print_r($row);
