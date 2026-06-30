<?php
// get delivery orders for a specific driver
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();


if (!isset($_GET['driver_phone'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Driver phone is required"]);
    exit;
}

$driver_phone = $_GET['driver_phone'];

// Only fetch orders explicitly assigned to this driver by their phone number.
// No OR fallback — that was causing all unassigned 'ready' orders to leak to every driver.
$sql = "SELECT o.*, o.order_type, u.full_name as customer_name, u.phone as customer_phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.driver_phone = ?
        AND o.status IN ('out-for-delivery', 'pickup_assigned', 'coming_for_pickup', 'arrived_at_shop', 'ready')
        ORDER BY 
            CASE o.status
                WHEN 'out-for-delivery' THEN 1
                WHEN 'coming_for_pickup' THEN 2
                WHEN 'arrived_at_shop' THEN 3
                WHEN 'ready' THEN 4
                WHEN 'pickup_assigned' THEN 5
                ELSE 6
            END ASC,
            o.created_at ASC";


$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $driver_phone);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];
while ($row = $result->fetch_assoc()) {
    $order_id = $row['id'];
    $items = [];
    $item_res = $conn->query("SELECT id, quantity, product_id, price_at_purchase, original_price, is_cleaning, is_grinding FROM order_items WHERE order_id = '$order_id'");
    while($i = $item_res->fetch_assoc()) {
         $order_item_id = $i['id'];
         $cust_res = $conn->query("SELECT option_name, option_price FROM order_item_customizations WHERE order_item_id = '$order_item_id'");
         $customizations = [];
         while ($cust_row = $cust_res->fetch_assoc()) {
             $customizations[] = $cust_row;
         }
         $i['customizations'] = $customizations;

         $pid = $i['product_id'];
         $prod_res = $conn->query("SELECT name, unit FROM products WHERE id = '$pid'");
         if ($p = $prod_res->fetch_assoc()) {
             $i['name'] = $p['name'];
             $i['unit'] = $p['unit'];
         } else {
             $i['name'] = "Item #$pid";
             $i['unit'] = 'kg';
         }

         // Fetch rental details if any
         $rent_stmt = $conn->prepare("SELECT rental_start_date, rental_end_date, rental_days, rental_price_per_day, security_deposit, late_penalty_per_day, status as rental_status FROM rentals WHERE order_id = ? AND product_id = ? LIMIT 1");
         $rent_stmt->bind_param("ii", $order_id, $pid);
         $rent_stmt->execute();
         $rent_res = $rent_stmt->get_result();
         if ($rent_row = $rent_res->fetch_assoc()) {
             $i['is_rental'] = 1;
             $i['rental_start_date'] = $rent_row['rental_start_date'];
             $i['rental_end_date'] = $rent_row['rental_end_date'];
             $i['rental_days'] = $rent_row['rental_days'];
             $i['rental_price_per_day'] = $rent_row['rental_price_per_day'];
             $i['security_deposit'] = $rent_row['security_deposit'];
             $i['late_penalty_per_day'] = $rent_row['late_penalty_per_day'];
             $i['rental_status'] = $rent_row['rental_status'];
         } else {
             $i['is_rental'] = 0;
         }
         $rent_stmt->close();

         $items[] = $i;
    }
    $row['items'] = $items;
    $orders[] = $row;
}

$stmt->close();

echo json_encode([
    "success" => true,
    "orders" => $orders
]);
