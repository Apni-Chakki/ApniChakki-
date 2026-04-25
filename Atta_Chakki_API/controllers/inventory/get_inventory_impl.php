<?php
// get inventory api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $low_stock = isset($_GET['low_stock']) && $_GET['low_stock'] === 'true';
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    
    $sql = "SELECT 
                p.id,
                p.name,
                p.category_id,
                c.name as category_name,
                p.price,
                p.unit,
                p.stock_quantity,
                p.min_stock_level,
                p.max_stock_level,
                p.updated_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1";
    
    if ($low_stock) {
        $sql .= " AND p.stock_quantity < p.min_stock_level";
    }
    
    if ($category) {
        $sql .= " AND c.name = ?";
    }
    
    $sql .= " ORDER BY p.stock_quantity ASC";
    
    if ($category) {
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        $stmt->bind_param("s", $category);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query($sql);
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }
    }
    
    $inventory = [];
    while ($row = $result->fetch_assoc()) {
        $stock_qty = floatval($row['stock_quantity']);
        // mapping fields for frontend
        $inventory[] = [
            'id' => (int)$row['id'],
            'productName' => $row['name'],
            'name' => $row['name'],
            'category_id' => (int)$row['category_id'],
            'category' => $row['category_name'],
            'category_name' => $row['category_name'],
            'price' => floatval($row['price']),
            'unit' => $row['unit'],
            'currentStock' => $stock_qty,
            'stock_quantity' => $stock_qty,
            'minStockLevel' => floatval($row['min_stock_level']),
            'min_stock_level' => floatval($row['min_stock_level']),
            'maxStockLevel' => floatval($row['max_stock_level']),
            'max_stock_level' => floatval($row['max_stock_level']),
            'status' => ($stock_qty < floatval($row['min_stock_level'])) ? 'low' : 'normal',
            'lastUpdated' => $row['updated_at'],
            'updated_at' => $row['updated_at']
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'inventory' => $inventory,
        'count' => count($inventory)
    ]);
    
} catch (Exception $e) {
    error_log('Get Inventory Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
