<?php
// get user orders api
include __DIR__ . '/../../config/connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

    if (!$user_id) {
        echo json_encode(["success" => false, "message" => "Missing user_id"]);
        exit;
    }

    $orders = [];
    $sql = "SELECT * FROM orders WHERE user_id = '$user_id' ORDER BY created_at DESC";
    $result = $conn->query($sql);

    if ($result) {
        while($row = $result->fetch_assoc()) {
            // getting customer info
            $user_res = $conn->query("SELECT full_name, phone FROM users WHERE id = '$user_id'");
            if ($user_row = $user_res->fetch_assoc()) {
                $row['customer_name'] = $user_row['full_name'];
                $row['customer_phone'] = $user_row['phone'];
            } else {
                $row['customer_name'] = "Unknown Customer";
                $row['customer_phone'] = "No Phone";
            }

            // getting items
            $order_id = $row['id'];
            $items = [];
            $item_res = $conn->query("SELECT quantity, product_id, price_at_purchase FROM order_items WHERE order_id = '$order_id'");
            while($i = $item_res->fetch_assoc()) {
                 $pid = $i['product_id'];
                 $prod_res = $conn->query("SELECT name FROM products WHERE id = '$pid'");
                 if ($p = $prod_res->fetch_assoc()) {
                     $i['name'] = $p['name'];
                 } else {
                     $i['name'] = "Item #$pid";
                 }
                 $items[] = $i;
            }
            $row['items'] = $items;
            
            // mapping for frontend
            $row['total'] = $row['total_amount'];
            
            $orders[] = $row;
        }
    }

    echo json_encode(["success" => true, "orders" => $orders]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
