<?php
// track order api
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
$auth_payload = require_auth();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // IDOR Protection: Extract user identity from verified JWT token
    $token_user_id = (int)($auth_payload['id'] ?? 0);
    $token_role = $auth_payload['role'] ?? 'customer';

    // If client supplied user_id, ensure non-admins cannot query on behalf of others
    $param_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    if ($param_user_id > 0 && $token_role !== 'admin' && $param_user_id !== $token_user_id) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "Forbidden: You cannot access orders for another account.", "orders" => []]);
        exit;
    }

    $logged_in_user_id = ($token_role === 'admin' && $param_user_id > 0) ? $param_user_id : $token_user_id;

    if ($logged_in_user_id <= 0 && $token_role !== 'admin') {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Unauthorized access. Invalid token.", "orders" => []]);
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

                // getting items with product name joined
                $order_id_fetched = (int)$row['id'];
                $item_stmt = $conn->prepare("
                    SELECT oi.quantity, oi.product_id, oi.price_at_purchase, oi.is_cleaning, oi.is_grinding,
                           COALESCE(p.name, CONCAT('Item #', oi.product_id)) as name,
                           COALESCE(p.unit, 'kg') as unit
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                ");
                $item_stmt->bind_param("i", $order_id_fetched);
                $item_stmt->execute();
                $item_res = $item_stmt->get_result();
                $items = [];
                while($i = $item_res->fetch_assoc()) {
                    $items[] = $i;
                }
                $item_stmt->close();
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

                        // getting items with JOIN
                        $order_id_fetched = $row['id'];
                        $items = [];
                        $item_stmt = $conn->prepare("SELECT oi.quantity, oi.product_id, oi.price_at_purchase, oi.is_cleaning, oi.is_grinding, p.name 
                                                      FROM order_items oi 
                                                      LEFT JOIN products p ON oi.product_id = p.id 
                                                      WHERE oi.order_id = ?");
                        $item_stmt->bind_param("i", $order_id_fetched);
                        $item_stmt->execute();
                        $item_res = $item_stmt->get_result();
                        while($i = $item_res->fetch_assoc()) {
                             if (empty($i['name'])) {
                                 $pid = $i['product_id'];
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
