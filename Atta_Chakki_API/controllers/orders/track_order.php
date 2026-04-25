<?php
// track order api
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // checking auth
    $logged_in_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    if ($logged_in_user_id <= 0) {
        echo json_encode(["success" => false, "message" => "Unauthorized access. Please log in.", "orders" => []]);
        exit;
    }

    $order_id = isset($_GET['order_id']) ? intval($_GET['order_id']) : null;
    $phone = isset($_GET['phone']) ? trim($_GET['phone']) : null;

    $orders = [];

    if ($order_id) {
        // searching by order id
        $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $order_id, $logged_in_user_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result && $result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                // getting customer info
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
                        $row['customer_phone'] = $phone ?: "No Phone";
                    }
                } else {
                    $row['customer_name'] = "Unknown Customer";
                    $row['customer_phone'] = $phone ?: "No Phone";
                }

                // getting items
                $order_id_fetched = $row['id'];
                $items = [];
                $item_stmt = $conn->prepare("SELECT quantity, product_id, price_at_purchase FROM order_items WHERE order_id = ?");
                $item_stmt->bind_param("i", $order_id_fetched);
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
    } elseif ($phone) {
        // searching by phone number
        $user_stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
        $user_stmt->bind_param("s", $phone);
        $user_stmt->execute();
        $user_res = $user_stmt->get_result();
        
        if ($user_res && $user_res->num_rows > 0) {
            while($user_row = $user_res->fetch_assoc()) {
                $user_id = $user_row['id'];
                if ($user_id != $logged_in_user_id) continue;

                $orders_stmt = $conn->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC");
                $orders_stmt->bind_param("i", $user_id);
                $orders_stmt->execute();
                $result = $orders_stmt->get_result();

                if ($result) {
                    while($row = $result->fetch_assoc()) {
                        // getting customer info
                        $user_info_stmt = $conn->prepare("SELECT full_name, phone FROM users WHERE id = ?");
                        $user_info_stmt->bind_param("i", $user_id);
                        $user_info_stmt->execute();
                        $user_info_res = $user_info_stmt->get_result();
                        if ($user_info_row = $user_info_res->fetch_assoc()) {
                            $row['customer_name'] = $user_info_row['full_name'];
                            $row['customer_phone'] = $user_info_row['phone'];
                        } else {
                            $row['customer_name'] = "Unknown Customer";
                            $row['customer_phone'] = $phone;
                        }

                        // getting items
                        $order_id_fetched = $row['id'];
                        $items = [];
                        $item_stmt = $conn->prepare("SELECT quantity, product_id, price_at_purchase FROM order_items WHERE order_id = ?");
                        $item_stmt->bind_param("i", $order_id_fetched);
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
            }
        }
    }

    if (count($orders) > 0) {
        echo json_encode(["success" => true, "orders" => $orders]);
    } else {
        echo json_encode(["success" => false, "message" => "No orders found", "orders" => []]);
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
