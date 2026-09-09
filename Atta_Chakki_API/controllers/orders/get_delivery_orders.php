<?php
// get delivery orders for a specific driver
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
$auth_user = require_driver_or_admin();

$driver_phone = isset($_GET['driver_phone']) ? trim($_GET['driver_phone']) : ($auth_user['phone'] ?? '');

if (empty($driver_phone)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Driver phone is required"]);
    exit;
}

$page   = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
$limit  = max(1, min(200, isset($_GET['limit']) ? (int)$_GET['limit'] : 5));
$offset = ($page - 1) * $limit;

// Generate phone variations for flexible matching
$raw_clean = preg_replace('/\D/', '', $driver_phone);
$phone_variants = array_values(array_unique(array_filter([
    $driver_phone,
    $raw_clean,
    str_starts_with($raw_clean, '0') ? ('92' . substr($raw_clean, 1)) : '',
    str_starts_with($raw_clean, '0') ? substr($raw_clean, 1) : '',
    str_starts_with($raw_clean, '92') ? ('0' . substr($raw_clean, 2)) : '',
    str_starts_with($raw_clean, '92') ? substr($raw_clean, 2) : '',
    ('0' . $raw_clean),
    ('+92' . (str_starts_with($raw_clean, '0') ? substr($raw_clean, 1) : $raw_clean))
])));

// Also find driver name associated with this phone if possible
$driver_name = '';
$name_check = $conn->prepare("SELECT name FROM delivery_personnel WHERE phone = ? LIMIT 1");
$name_check->bind_param("s", $driver_phone);
$name_check->execute();
$name_res = $name_check->get_result();
if ($name_res && $name_row = $name_res->fetch_assoc()) {
    $driver_name = $name_row['name'];
}
$name_check->close();

if (empty($driver_name)) {
    $u_name_check = $conn->prepare("SELECT full_name FROM users WHERE phone = ? AND role IN ('delivery_boy', 'delivery') LIMIT 1");
    $u_name_check->bind_param("s", $driver_phone);
    $u_name_check->execute();
    $u_name_res = $u_name_check->get_result();
    if ($u_name_res && $u_row = $u_name_res->fetch_assoc()) {
        $driver_name = $u_row['full_name'];
    }
    $u_name_check->close();
}

// Build query with dynamic IN list for phone variants and driver name
$placeholders = implode(',', array_fill(0, count($phone_variants), '?'));
$types = str_repeat('s', count($phone_variants));
$params = $phone_variants;

$where_clause = "(o.driver_phone IN ($placeholders)";
if (!empty($driver_name)) {
    $where_clause .= " OR o.driver_name = ?";
    $types .= 's';
    $params[] = $driver_name;
}
$where_clause .= ") AND o.status IN ('out-for-delivery','pickup_assigned','coming_for_pickup','arrived_at_shop','ready','pending','processing','scheduled','scheduled-tomorrow')";

// Total count for pagination
$count_sql = "SELECT COUNT(*) AS c FROM orders o WHERE $where_clause";
$countStmt = $conn->prepare($count_sql);
$countStmt->bind_param($types, ...$params);
$countStmt->execute();
$total = (int)$countStmt->get_result()->fetch_assoc()['c'];
$countStmt->close();

// Fetch orders
$sql = "SELECT o.*, o.order_type, u.full_name as customer_name, u.phone as customer_phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE $where_clause
        ORDER BY
            CASE o.status
                WHEN 'out-for-delivery' THEN 1
                WHEN 'coming_for_pickup' THEN 2
                WHEN 'ready' THEN 3
                WHEN 'pickup_assigned' THEN 4
                WHEN 'arrived_at_shop' THEN 5
                WHEN 'processing' THEN 6
                WHEN 'pending' THEN 7
                WHEN 'scheduled' THEN 8
                WHEN 'scheduled-tomorrow' THEN 9
                ELSE 10
            END ASC,
            o.created_at DESC
        LIMIT ? OFFSET ?";

$types_with_limit = $types . 'ii';
$params_with_limit = array_merge($params, [$limit, $offset]);

$stmt = $conn->prepare($sql);
$stmt->bind_param($types_with_limit, ...$params_with_limit);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];
while ($row = $result->fetch_assoc()) {
    $order_id = $row['id'];
    $items = [];
    $item_res = $conn->query("SELECT id, quantity, product_id, price_at_purchase, original_price, is_cleaning, is_grinding FROM order_items WHERE order_id = '$order_id'");
    while($i = $item_res->fetch_assoc()) {
         $order_item_id = $i['id'];
         $customizations = [];
         try {
             $cust_res = $conn->query("SELECT option_name, option_price FROM order_item_customizations WHERE order_item_id = '$order_item_id'");
             if ($cust_res) {
                 while ($cust_row = $cust_res->fetch_assoc()) {
                     $customizations[] = $cust_row;
                 }
             }
         } catch (Throwable $t) {
             // Table might be initializing
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
    "orders"  => $orders,
    "total"   => $total,
    "page"    => $page,
    "limit"   => $limit,
]);
