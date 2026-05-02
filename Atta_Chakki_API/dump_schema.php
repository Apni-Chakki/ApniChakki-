<?php
require_once 'config/connect.php';

echo "=== ALL TABLES ===\n";
$tables = $conn->query("SHOW TABLES");
$tableNames = [];
while ($row = $tables->fetch_array()) {
    $tableNames[] = $row[0];
    echo $row[0] . "\n";
}

echo "\n=== TABLE SCHEMAS ===\n";
foreach ($tableNames as $table) {
    echo "\n--- $table ---\n";
    $result = $conn->query("SHOW CREATE TABLE `$table`");
    $row = $result->fetch_assoc();
    echo $row['Create Table'] . "\n";
}

$conn->close();
