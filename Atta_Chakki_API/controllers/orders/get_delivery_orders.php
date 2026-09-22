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
$where_clause .= ") AND o.status IN ('delivery_assigned', 'out-for-delivery', 'pickup_assigned', 'coming_for_pickup')";

// Total count for pagination
$count_sql = "SELECT COUNT(*) AS c FROM orders o WHERE $where_clause";
$countStmt = $conn->prepare($count_sql);
$countStmt->bind_param($types, ...$params);
$countStmt->execute();
$total = (int)$countStmt->get_result()->fetch_assoc()['c'];
$countStmt->close();

// Fetch orders
$sql = "SELECT o.*, o.order_type, 
        COALESCE(NULLIF(u.full_name, ''), 'Customer') as customer_name, 
        COALESCE(NULLIF(u.phone, ''), '') as customer_phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE $where_clause
        ORDER BY
            CASE o.status
                WHEN 'out-for-delivery' THEN 1
                WHEN 'delivery_assigned' THEN 2
                WHEN 'coming_for_pickup' THEN 3
                WHEN 'ready' THEN 4
                WHEN 'pickup_assigned' THEN 5
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
$order_ids = [];
while ($row = $result->fetch_assoc()) {
    $row['items'] = [];
    $row['delivery_fee'] = (float)($row['delivery_fee'] ?? 0);
    $orders[$row['id']] = $row;
    $order_ids[] = (int)$row['id'];
}
$stmt->close();

if (!empty($order_ids)) {
    $id_list = implode(',', $order_ids);

    // 1. Batch fetch all order items with product name and unit in a single query
    $item_sql = "SELECT oi.id, oi.order_id, oi.quantity, oi.product_id, oi.price_at_purchase, 
                        oi.original_price, oi.is_cleaning, oi.is_grinding,
                        COALESCE(p.name, CONCAT('Item #', oi.product_id)) as name,
                        COALESCE(p.unit, 'kg') as unit
                 FROM order_items oi
                 LEFT JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id IN ($id_list)
                 ORDER BY oi.id ASC";
    $item_res = $conn->query($item_sql);

    $items_by_id = [];
    $order_items_map = []; // order_id => [item, item, ...]

    if ($item_res) {
        while ($i = $item_res->fetch_assoc()) {
            $i['customizations'] = [];
            $i['is_rental'] = 0;
            $items_by_id[$i['id']] = $i;
            $order_items_map[$i['order_id']][] = $i['id'];
        }
    }

    // 2. Batch fetch customizations if any items exist
    if (!empty($items_by_id)) {
        $item_ids_list = implode(',', array_keys($items_by_id));
        try {
            $cust_res = $conn->query("SELECT order_item_id, option_name, option_price 
                                      FROM order_item_customizations 
                                      WHERE order_item_id IN ($item_ids_list)");
            if ($cust_res) {
                while ($cust_row = $cust_res->fetch_assoc()) {
                    $oid = $cust_row['order_item_id'];
                    if (isset($items_by_id[$oid])) {
                        $items_by_id[$oid]['customizations'][] = [
                            'option_name' => $cust_row['option_name'],
                            'option_price' => $cust_row['option_price']
                        ];
                    }
                }
            }
        } catch (Throwable $t) {
            // Table might not exist or error
        }

        // 3. Batch fetch rentals if any
        try {
            $rent_res = $conn->query("SELECT order_id, product_id, rental_start_date, rental_end_date, 
                                             rental_days, rental_price_per_day, security_deposit, 
                                             late_penalty_per_day, status as rental_status 
                                      FROM rentals 
                                      WHERE order_id IN ($id_list)");
            if ($rent_res) {
                while ($rent_row = $rent_res->fetch_assoc()) {
                    $roid = $rent_row['order_id'];
                    $rpid = $rent_row['product_id'];
                    // attach to the item with this order_id and product_id
                    if (isset($order_items_map[$roid])) {
                        foreach ($order_items_map[$roid] as $item_id) {
                            if ($items_by_id[$item_id]['product_id'] == $rpid) {
                                $items_by_id[$item_id]['is_rental'] = 1;
                                $items_by_id[$item_id]['rental_start_date'] = $rent_row['rental_start_date'];
                                $items_by_id[$item_id]['rental_end_date'] = $rent_row['rental_end_date'];
                                $items_by_id[$item_id]['rental_days'] = $rent_row['rental_days'];
                                $items_by_id[$item_id]['rental_price_per_day'] = $rent_row['rental_price_per_day'];
                                $items_by_id[$item_id]['security_deposit'] = $rent_row['security_deposit'];
                                $items_by_id[$item_id]['late_penalty_per_day'] = $rent_row['late_penalty_per_day'];
                                $items_by_id[$item_id]['rental_status'] = $rent_row['rental_status'];
                                break;
                            }
                        }
                    }
                }
            }
        } catch (Throwable $t) {
            // Rentals table error ignored
        }
    }

    // 4. Assemble items back into orders
    foreach ($orders as $oid => &$ord) {
        if (isset($order_items_map[$oid])) {
            foreach ($order_items_map[$oid] as $itemId) {
                $ord['items'][] = $items_by_id[$itemId];
            }
        }
    }
    unset($ord);
}

$orders = array_values($orders);

echo json_encode([
    "success" => true,
    "orders"  => $orders,
    "total"   => $total,
    "page"    => $page,
    "limit"   => $limit,
]);
