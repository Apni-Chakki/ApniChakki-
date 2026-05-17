<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['user_id']) || !isset($data['product_id'])) {
    echo json_encode(["success" => false, "message" => "User ID and Product ID are required"]);
    exit;
}

$user_id = intval($data['user_id']);
$product_id = intval($data['product_id']);
$is_cleaning = isset($data['is_cleaning']) ? intval($data['is_cleaning']) : 0;
$is_grinding = isset($data['is_grinding']) ? intval($data['is_grinding']) : 0;
$is_weight_pending = isset($data['is_weight_pending']) ? intval($data['is_weight_pending']) : 0;

$sql = "DELETE ci FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        WHERE c.user_id = ? AND ci.product_id = ? AND ci.is_cleaning = ? AND ci.is_grinding = ? AND ci.is_weight_pending = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iiiii", $user_id, $product_id, $is_cleaning, $is_grinding, $is_weight_pending);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Item removed from cart"]);
} else {
    echo json_encode(["success" => false, "message" => "Error removing item: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
