<?php
require_once 'config/connect.php';

$out = "";
$out .= "=== ALL TABLES ===\n";
$tables = $conn->query("SHOW TABLES");
$tableNames = [];
while ($row = $tables->fetch_array()) {
    $tableNames[] = $row[0];
    $out .= $row[0] . "\n";
}

$out .= "\n=== TABLE SCHEMAS ===\n";
foreach ($tableNames as $table) {
    $out .= "\n--- $table ---\n";
    $result = $conn->query("SHOW CREATE TABLE `$table`");
    $row = $result->fetch_assoc();
    $out .= $row['Create Table'] . "\n";
}

$conn->close();
file_put_contents(__DIR__ . '/schema_dump.txt', $out);
echo "Done. Written to schema_dump.txt\n";
