<?php
// add priority column script
include __DIR__ . '/../config/connect.php';

header('Content-Type: application/json');

try {
    $query = "SHOW COLUMNS FROM products LIKE 'priority'";
    $result = $conn->query($query);

    if ($result && $result->num_rows > 0) {
        echo json_encode(["success" => true, "message" => "Column 'priority' already exists in 'products' table."]);
    } else {
        $alter = "ALTER TABLE products ADD COLUMN priority INT DEFAULT 0 COMMENT 'priority for displaying products'";
        if ($conn->query($alter)) {
            echo json_encode(["success" => true, "message" => "Column 'priority' successfully added to 'products' table."]);
        } else {
            echo json_encode(["success" => false, "message" => "Failed to add column: " . $conn->error]);
        }
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
