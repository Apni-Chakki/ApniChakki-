<?php
require_once __DIR__ . '/config/connect.php';

$sql1 = "ALTER TABLE orders ADD COLUMN parent_order_id INT NULL DEFAULT NULL";
if ($conn->query($sql1) === TRUE) {
    echo "Added parent_order_id\n";
} else {
    echo "Error adding parent_order_id: " . $conn->error . "\n";
}

$sql2 = "ALTER TABLE orders ADD COLUMN is_batch TINYINT(1) DEFAULT 0";
if ($conn->query($sql2) === TRUE) {
    echo "Added is_batch\n";
} else {
    echo "Error adding is_batch: " . $conn->error . "\n";
}

$sql3 = "ALTER TABLE orders ADD COLUMN batch_index INT NULL DEFAULT NULL";
if ($conn->query($sql3) === TRUE) {
    echo "Added batch_index\n";
} else {
    echo "Error adding batch_index: " . $conn->error . "\n";
}

$conn->close();
?>
