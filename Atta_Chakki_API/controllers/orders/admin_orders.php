<?php
// admin orders controller
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $status_filter = isset($_GET['status']) ? strtolower(trim($_GET['status'])) : '';

    $sql = "SELECT * FROM orders";

    // filtering by status
    if ($status_filter === 'pending') {
        $sql .= " WHERE TRIM(LOWER(status)) = 'pending'";
    } elseif ($status_filter === 'ready') {
        $sql .= " WHERE TRIM(LOWER(status)) = 'ready'";
    } elseif ($status_filter === 'active') {
        $sql .= " WHERE TRIM(LOWER(status)) IN ('processing', 'ready', 'shipped')";
    } elseif ($status_filter === 'history') {
        $sql .= " WHERE TRIM(LOWER(status)) IN ('completed', 'cancelled')";
    }

    $sql .= " ORDER BY created_at DESC";

    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $orders = [];

    while($row = $result->fetch_assoc()) {
        
        // getting customer info
        $user_id = (int)$row['user_id'];
        if ($user_id > 0) {
            $user_stmt = $conn->prepare("SELECT full_name, phone FROM users WHERE id = ?");
            $user_stmt->bind_param("i", $user_id);
            $user_stmt->execute();
            $user_res = $user_stmt->get_result();
            
            if ($user_res && $user_row = $user_res->fetch_assoc()) {
                $row['customer_name'] = $user_row['full_name'];
                $row['customer_phone'] = $user_row['phone'];
            } else {
                $row['customer_name'] = "Walk-in Customer";
                $row['customer_phone'] = "No Phone";
            }
            $user_stmt->close();
        } else {
            $row['customer_name'] = "Walk-in Customer";
            $row['customer_phone'] = "No Phone";
        }

        // getting order items
        $order_id = (int)$row['id'];
        $items = [];
        $item_stmt = $conn->prepare("SELECT quantity, product_id FROM order_items WHERE order_id = ?");
        $item_stmt->bind_param("i", $order_id);
        $item_stmt->execute();
        $item_res = $item_stmt->get_result();
        
        if ($item_res) {
            while($i = $item_res->fetch_assoc()) {
                 $pid = (int)$i['product_id'];
                 
                 // getting product name
                 $prod_stmt = $conn->prepare("SELECT name FROM products WHERE id = ?");
                 $prod_stmt->bind_param("i", $pid);
                 $prod_stmt->execute();
                 $prod_res = $prod_stmt->get_result();
                 
                 if ($prod_res && $p = $prod_res->fetch_assoc()) {
                     $i['name'] = $p['name'];
                 } else {
                     $i['name'] = "Item #$pid";
                 }
                 $prod_stmt->close();
                 
                 $items[] = $i;
            }
        }
        $item_stmt->close();
        $row['items'] = $items;
        
        $orders[] = $row;
    }

    http_response_code(200);
    echo json_encode(["success" => true, "orders" => $orders]);

} catch (Exception $e) {
    http_response_code(500);
    $error_msg = $e->getMessage();
    error_log('admin_orders.php error: ' . $error_msg);
    echo json_encode(["success" => false, "message" => "Error: " . $error_msg]);
}
