<?php
require_once __DIR__ . '/../config/connect.php';

// Add description_ur column to products table
$sql = "ALTER TABLE products ADD COLUMN description_ur TEXT DEFAULT NULL AFTER description";

if ($conn->query($sql)) {
    echo "✅ Column 'description_ur' added successfully to products table.\n";
} else {
    if (strpos($conn->error, 'Duplicate column') !== false) {
        echo "ℹ️ Column 'description_ur' already exists.\n";
    } else {
        echo "❌ Error: " . $conn->error . "\n";
    }
}
$conn->close();
