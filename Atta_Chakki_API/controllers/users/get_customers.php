<?php
// get_customers.php
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();


try {
    $sql = "
        SELECT 
            u.id, 
            u.full_name, 
            u.email, 
            u.phone, 
            u.role, 
            u.is_active, 
            u.is_vip, 
            u.vip_discount, 
            u.vip_free_shipping,
            (SELECT GROUP_CONCAT(privilege_id) FROM user_vip_privileges WHERE user_id = u.id) as privilege_ids,
            COUNT(o.id) as total_orders,
            IFNULL(SUM(o.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.role = 'customer'
        GROUP BY u.id
        ORDER BY u.id DESC
    ";
    
    $result = $conn->query($sql);
    $customers = [];
    
    while ($row = $result->fetch_assoc()) {
        $customers[] = [
            'id' => intval($row['id']),
            'full_name' => $row['full_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'role' => $row['role'],
            'is_active' => intval($row['is_active']) === 1,
            'is_vip' => intval($row['is_vip']) === 1,
            'vip_discount' => intval($row['vip_discount']) === 1,
            'vip_free_shipping' => intval($row['vip_free_shipping']) === 1,
            'privilege_ids' => $row['privilege_ids'] ? array_map('intval', explode(',', $row['privilege_ids'])) : [],
            'total_orders' => intval($row['total_orders']),
            'total_spent' => floatval($row['total_spent'])
        ];
    }
    
    echo json_encode([
        'success' => true,
        'customers' => $customers
    ]);

} catch (Exception $e) {
    error_log('Get Customers Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}

$conn->close();
?>
