<?php
// Diagnostic script to identify actual errors
header('Content-Type: application/json');

$diagnostics = [];

// 1. Test database connection
try {
    include __DIR__ . '/config/connect.php';
    
    if ($conn) {
        $diagnostics['database_connection'] = 'SUCCESS';
        
        // Test basic query
        $result = $conn->query("SELECT COUNT(*) as count FROM products");
        if ($result) {
            $row = $result->fetch_assoc();
            $diagnostics['products_count'] = $row['count'];
        }
        
        // Check tables exist
        $tables_to_check = ['products', 'orders', 'users', 'categories', 'order_items'];
        $tables_found = [];
        foreach ($tables_to_check as $table) {
            $check = $conn->query("SHOW TABLES LIKE '$table'");
            $tables_found[$table] = $check && $check->num_rows > 0 ? 'EXISTS' : 'MISSING';
        }
        $diagnostics['tables'] = $tables_found;
        
        // Check product columns
        $cols = $conn->query("DESCRIBE products");
        $columns = [];
        while ($col = $cols->fetch_assoc()) {
            $columns[] = $col['Field'];
        }
        $diagnostics['product_columns'] = $columns;
        
    } else {
        $diagnostics['database_connection'] = 'FAILED';
    }
} catch (Exception $e) {
    $diagnostics['database_connection'] = 'ERROR: ' . $e->getMessage();
}

// 2. Test admin_orders endpoint
try {
    $diagnostics['admin_orders_test'] = 'Testing...';
    
    // Simulate the admin_orders.php query
    include __DIR__ . '/config/connect.php';
    
    if (!$conn) {
        throw new Exception("No database connection");
    }
    
    $status_filter = 'pending';
    $sql = "SELECT * FROM orders WHERE TRIM(LOWER(status)) = 'pending' ORDER BY created_at DESC";
    
    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception("Orders query failed: " . $conn->error);
    }
    
    $count = 0;
    while ($row = $result->fetch_assoc()) {
        $count++;
        // Try the prepared statement for user info
        $user_id = (int)$row['user_id'];
        if ($user_id > 0) {
            $user_stmt = $conn->prepare("SELECT full_name, phone FROM users WHERE id = ?");
            if (!$user_stmt) {
                throw new Exception("User prepare failed: " . $conn->error);
            }
            $user_stmt->bind_param("i", $user_id);
            if (!$user_stmt->execute()) {
                throw new Exception("User execute failed: " . $user_stmt->error);
            }
        }
    }
    
    $diagnostics['admin_orders_test'] = 'SUCCESS - Found ' . $count . ' pending orders';
    
} catch (Exception $e) {
    $diagnostics['admin_orders_test'] = 'FAILED: ' . $e->getMessage();
}

// 3. Test add_product endpoint parameters
try {
    $diagnostics['add_product_test'] = 'Testing...';
    
    include __DIR__ . '/config/connect.php';
    
    if (!$conn) {
        throw new Exception("No database connection");
    }
    
    // Simulate add_product
    $test_data = [
        'name' => 'Test Product',
        'price' => 45.00,
        'unit' => 'kg',
        'category' => 'wheat',
        'description' => 'Test',
        'image' => ''
    ];
    
    $category_name = $test_data['category'];
    $cat_stmt = $conn->prepare("SELECT id FROM categories WHERE name = ?");
    if (!$cat_stmt) {
        throw new Exception("Category prepare failed: " . $conn->error);
    }
    
    $cat_stmt->bind_param("s", $category_name);
    if (!$cat_stmt->execute()) {
        throw new Exception("Category execute failed: " . $cat_stmt->error);
    }
    
    $cat_result = $cat_stmt->get_result();
    
    if ($cat_result->num_rows === 0) {
        throw new Exception("Category 'wheat' not found in database!");
    }
    
    $diagnostics['add_product_test'] = 'SUCCESS - Category lookup works';
    
} catch (Exception $e) {
    $diagnostics['add_product_test'] = 'FAILED: ' . $e->getMessage();
}

echo json_encode($diagnostics, JSON_PRETTY_PRINT);
?>
