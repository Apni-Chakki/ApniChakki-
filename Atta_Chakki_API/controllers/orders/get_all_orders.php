<?php
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $sql = "SELECT * FROM orders ORDER BY created_at DESC LIMIT 5000";
    $result = $conn->query($sql);
    $orders = [];

    if ($result) {
        while($row = $result->fetch_assoc()) {
            $user_id = $row['user_id'];
            if ($user_id > 0) {
                $user_stmt = $conn->prepare("SELECT full_name, phone FROM users WHERE id = ?");
                $user_stmt->bind_param("i", $user_id);
                $user_stmt->execute();
                $user_res = $user_stmt->get_result();
                if ($user_row = $user_res->fetch_assoc()) {
                    $row['customer_name'] = $user_row['full_name'];
                    $row['customer_phone'] = $user_row['phone'];
                } else {
                    $row['customer_name'] = "Unknown Customer";
                    $row['customer_phone'] = "No Phone";
                }
            } else {
                $row['customer_name'] = "Unknown Customer";
                $row['customer_phone'] = "Unknown";
            }

            $order_id = $row['id'];
            $items = [];
            $item_stmt = $conn->prepare("SELECT quantity, product_id, price_at_purchase FROM order_items WHERE order_id = ?");
            $item_stmt->bind_param("i", $order_id);
            $item_stmt->execute();
            $item_res = $item_stmt->get_result();
            while($i = $item_res->fetch_assoc()) {
                 $pid = $i['product_id'];
                 $prod_stmt = $conn->prepare("SELECT name FROM products WHERE id = ?");
                 $prod_stmt->bind_param("i", $pid);
                 $prod_stmt->execute();
                 $prod_res = $prod_stmt->get_result();
                 if ($p = $prod_res->fetch_assoc()) {
                     $i['name'] = $p['name'];
                 } else {
                     $i['name'] = "Item #$pid";
                 }
                 $items[] = $i;
            }
            $row['items'] = $items;
            $row['total'] = $row['total_amount'];
            $orders[] = $row;
        }
    }

    echo json_encode(["success" => true, "orders" => $orders, "total" => count($orders)]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
