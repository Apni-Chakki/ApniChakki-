<?php
// Migration: add is_combined_order and hybrid_stage to orders
require_once __DIR__ . '/../config/connect.php';

try {
    echo "Running migration: add_hybrid_order_columns...\n";

    // 1. Check is_combined_order
    $chk1 = $conn->query("SHOW COLUMNS FROM orders LIKE 'is_combined_order'");
    if ($chk1 && $chk1->num_rows === 0) {
        $conn->query("ALTER TABLE orders ADD COLUMN is_combined_order TINYINT(1) DEFAULT 0 AFTER is_manually_overridden");
        echo "Added column 'is_combined_order'.\n";
    } else {
        echo "Column 'is_combined_order' already exists.\n";
    }

    // 2. Check hybrid_stage
    $chk2 = $conn->query("SHOW COLUMNS FROM orders LIKE 'hybrid_stage'");
    if ($chk2 && $chk2->num_rows === 0) {
        $conn->query("ALTER TABLE orders ADD COLUMN hybrid_stage VARCHAR(50) DEFAULT NULL AFTER is_combined_order");
        echo "Added column 'hybrid_stage'.\n";
    } else {
        echo "Column 'hybrid_stage' already exists.\n";
    }

    // 3. Add index
    $chk3 = $conn->query("SHOW INDEX FROM orders WHERE Key_name = 'idx_hybrid_order'");
    if ($chk3 && $chk3->num_rows === 0) {
        $conn->query("ALTER TABLE orders ADD INDEX idx_hybrid_order (is_combined_order, hybrid_stage)");
        echo "Added index 'idx_hybrid_order'.\n";
    } else {
        echo "Index 'idx_hybrid_order' already exists.\n";
    }

    echo "Migration completed successfully!\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
