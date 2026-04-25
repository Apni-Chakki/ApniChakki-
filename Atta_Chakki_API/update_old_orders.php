<?php
require_once __DIR__ . '/config/connect.php';
$conn->query("UPDATE orders SET source = 'manual' WHERE user_id = 1");
$conn->query("UPDATE orders o JOIN users u ON o.user_id = u.id SET o.source = 'manual' WHERE u.email LIKE '%_dummy@apnichakki.com'");
echo 'Rows updated: ' . $conn->affected_rows;
?>