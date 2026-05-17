<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

if (!$user_id) {
    echo json_encode(["success" => false, "message" => "User ID is required"]);
    exit;
}

// Ensure cart exists
$conn->query("INSERT IGNORE INTO carts (user_id) VALUES ($user_id)");

$sql = "SELECT ci.*, p.name, p.price, p.image_url, p.unit 
        FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        JOIN products p ON ci.product_id = p.id
        WHERE c.user_id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = [
        "service" => [
            "id" => intval($row['product_id']),
            "name" => $row['name'],
            "price" => floatval($row['price']),
            "image_url" => $row['image_url'],
            "unit" => $row['unit'],
            "is_cleaning" => intval($row['is_cleaning']),
            "is_grinding" => intval($row['is_grinding'])
        ],
        "quantity" => floatval($row['quantity']),
        "isWeightPending" => intval($row['is_weight_pending']) === 1
    ];
}

echo json_encode(["success" => true, "cart" => $items]);
$stmt->close();
$conn->close();
?>
