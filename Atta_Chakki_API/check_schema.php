<?php
require_once 'api/Config/connect.php';

function check_table($conn, $table) {
    echo "Columns for table: $table\n";
    $result = $conn->query("DESCRIBE $table");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            print_r($row);
        }
    } else {
        echo "Error describing $table: " . $conn->error . "\n";
    }
    echo "--------------------------\n";
}

check_table($conn, 'products');
check_table($conn, 'categories');
