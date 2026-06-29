<?php
/**
 * Migration: Dynamic Service Customizations
 * Creates product_customizations and order_item_customizations tables.
 * Also migrates existing hardcoded cleaning/grinding data into the new dynamic system.
 */
require_once dirname(__DIR__) . '/config/connect.php';

header('Content-Type: application/json');

$results = [];

// 1) Create product_customizations table
$sql1 = "CREATE TABLE IF NOT EXISTS product_customizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    option_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

if ($conn->query($sql1)) {
    $results[] = "product_customizations table created/verified";
} else {
    $results[] = "Error creating product_customizations: " . $conn->error;
}

// 2) Create order_item_customizations table
$sql2 = "CREATE TABLE IF NOT EXISTS order_item_customizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id INT NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    option_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

if ($conn->query($sql2)) {
    $results[] = "order_item_customizations table created/verified";
} else {
    $results[] = "Error creating order_item_customizations: " . $conn->error;
}

// 3) Migrate existing grinding service products into the new customizations table
$existing = $conn->query("SELECT id, cleaning_price, grinding_price FROM products WHERE is_grinding_service = 1");
$migrated = 0;

if ($existing && $existing->num_rows > 0) {
    while ($product = $existing->fetch_assoc()) {
        $pid = (int)$product['id'];
        
        // Check if already migrated (avoid duplicates on re-run)
        $check = $conn->query("SELECT COUNT(*) as cnt FROM product_customizations WHERE product_id = $pid");
        $count = $check->fetch_assoc()['cnt'];
        
        if ($count == 0) {
            // Insert Cleaning option
            $cleanPrice = floatval($product['cleaning_price']);
            $stmt = $conn->prepare("INSERT INTO product_customizations (product_id, option_name, option_price, sort_order) VALUES (?, 'Cleaning', ?, 1)");
            $stmt->bind_param("id", $pid, $cleanPrice);
            $stmt->execute();
            $stmt->close();
            
            // Insert Grinding option
            $grindPrice = floatval($product['grinding_price']);
            $stmt2 = $conn->prepare("INSERT INTO product_customizations (product_id, option_name, option_price, sort_order) VALUES (?, 'Grinding', ?, 2)");
            $stmt2->bind_param("id", $pid, $grindPrice);
            $stmt2->execute();
            $stmt2->close();
            
            $migrated++;
        }
    }
}

$results[] = "Migrated $migrated existing grinding products to new customization system";

// 4) Migrate existing order_items that had is_cleaning/is_grinding into order_item_customizations
$orderItems = $conn->query("SELECT oi.id, oi.is_cleaning, oi.is_grinding, oi.product_id, p.cleaning_price, p.grinding_price 
                            FROM order_items oi 
                            JOIN products p ON oi.product_id = p.id 
                            WHERE (oi.is_cleaning = 1 OR oi.is_grinding = 1)");
$migratedItems = 0;

if ($orderItems && $orderItems->num_rows > 0) {
    while ($oi = $orderItems->fetch_assoc()) {
        $oiId = (int)$oi['id'];
        
        // Check if already migrated
        $check2 = $conn->query("SELECT COUNT(*) as cnt FROM order_item_customizations WHERE order_item_id = $oiId");
        $count2 = $check2->fetch_assoc()['cnt'];
        
        if ($count2 == 0) {
            if ($oi['is_cleaning'] == 1) {
                $cp = floatval($oi['cleaning_price']);
                $s = $conn->prepare("INSERT INTO order_item_customizations (order_item_id, option_name, option_price) VALUES (?, 'Cleaning', ?)");
                $s->bind_param("id", $oiId, $cp);
                $s->execute();
                $s->close();
            }
            if ($oi['is_grinding'] == 1) {
                $gp = floatval($oi['grinding_price']);
                $s2 = $conn->prepare("INSERT INTO order_item_customizations (order_item_id, option_name, option_price) VALUES (?, 'Grinding', ?)");
                $s2->bind_param("id", $oiId, $gp);
                $s2->execute();
                $s2->close();
            }
            $migratedItems++;
        }
    }
}

$results[] = "Migrated $migratedItems existing order items to new customization system";

echo json_encode(["success" => true, "results" => $results], JSON_PRETTY_PRINT);
