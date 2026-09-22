<?php
/**
 * Test script to simulate concurrency race condition on product stock.
 * Tests atomic transaction locking (SELECT ... FOR UPDATE) and atomic decrement.
 */

require_once __DIR__ . '/../config/connect.php';

echo "=== Concurrency & Race Condition Simulation ===\n";

// 1. Setup a test product with exactly 50 units
$test_sku = "TEST-CONCURRENCY-" . time();
$conn->query("INSERT INTO products (name, price, stock_quantity, unit, is_active) VALUES ('Concurrency Test Wheat', 100.00, 50, 'kg', 1)");
$test_product_id = $conn->insert_id;

echo "Created test product ID #$test_product_id with 50 units.\n";

// 2. Fetch a valid user ID for test order
$u_res = $conn->query("SELECT id FROM users LIMIT 1");
$user_id = $u_res->fetch_assoc()['id'] ?? 1;

// 3. Prepare payload for 50 units
$payload = json_encode([
    'cart_items' => [
        [
            'id' => $test_product_id,
            'qty' => 50,
            'price' => 100,
            'unit' => 'kg'
        ]
    ],
    'payment_method' => 'cod',
    'address' => 'Concurrency Test Address, Lahore'
]);

// 4. Generate a valid JWT token
require_once __DIR__ . '/../utils/jwt_helper.php';
$token = generate_jwt(['id' => $user_id, 'phone' => '03001234567', 'role' => 'customer']);

// 5. Fire two concurrent requests via cURL multi
$url = "http://localhost/Atta_Chakki_API/controllers/orders/place_order.php";

$mh = curl_multi_init();
$ch1 = curl_init($url);
$ch2 = curl_init($url);

$headers = [
    'Content-Type: application/json',
    "Authorization: Bearer $token"
];

foreach ([$ch1, $ch2] as $ch) {
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_multi_add_handle($mh, $ch);
}

$running = null;
do {
    curl_multi_exec($mh, $running);
    curl_multi_select($mh);
} while ($running > 0);

$res1 = curl_multi_getcontent($ch1);
$res2 = curl_multi_getcontent($ch2);
$http1 = curl_getinfo($ch1, CURLINFO_HTTP_CODE);
$http2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);

curl_multi_remove_handle($mh, $ch1);
curl_multi_remove_handle($mh, $ch2);
curl_multi_close($mh);

echo "Request 1 Status: $http1 | Response: $res1\n";
echo "Request 2 Status: $http2 | Response: $res2\n";

// 6. Verify database state
$p_check = $conn->query("SELECT stock_quantity FROM products WHERE id = $test_product_id")->fetch_assoc();
$final_stock = $p_check['stock_quantity'];

$o_check = $conn->query("SELECT COUNT(*) as count FROM order_items WHERE product_id = $test_product_id")->fetch_assoc();
$order_items_count = $o_check['count'];

echo "Final Stock in DB: $final_stock (Expected: 0)\n";
echo "Order items created: $order_items_count (Expected: 1)\n";

// Cleanup test product
$conn->query("DELETE FROM products WHERE id = $test_product_id");

if (($http1 == 200 && $http2 == 409) || ($http1 == 409 && $http2 == 200)) {
    echo "\n>>> SUCCESS: Race condition prevented! Exactly 1 order succeeded and 1 was rejected with 409 Conflict. <<<\n";
} else {
    echo "\n>>> Result: http1=$http1, http2=$http2 <<<\n";
}
