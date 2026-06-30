<?php
// get user orders api
include __DIR__ . '/../../config/connect.php';

require_once __DIR__ . '/../../utils/auth_middleware.php';
$payload = require_auth();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Extract user_id from token instead of GET param
    $user_id = $payload['id'];

    if (!$user_id) {
        echo json_encode(["success" => false, "message" => "Missing user_id in token"]);
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
            $item_res = $conn->query("SELECT quantity, product_id, price_at_purchase, is_cleaning, is_grinding, is_weight_pending FROM order_items WHERE order_id = '$order_id'");
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

            // Get payment rejection details if unpaid
            $pt_stmt = $conn->prepare("
                SELECT error_message, updated_at 
                FROM payment_transactions 
                WHERE order_id = ? AND payment_status = 'failed' 
                ORDER BY created_at DESC LIMIT 1
            ");
            $pt_stmt->bind_param("i", $order_id);
            $pt_stmt->execute();
            $pt_res = $pt_stmt->get_result();
            if ($pt_row = $pt_res->fetch_assoc()) {
                $row['payment_reject_reason'] = $pt_row['error_message'];
                $row['payment_reject_date'] = $pt_row['updated_at'];
            } else {
                $row['payment_reject_reason'] = null;
                $row['payment_reject_date'] = null;
            }
            $pt_stmt->close();
            
            $orders[] = $row;
        }
    }

    echo json_encode(["success" => true, "orders" => $orders]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
