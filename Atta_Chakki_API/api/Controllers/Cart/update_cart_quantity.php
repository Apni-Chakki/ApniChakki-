<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['user_id']) || !isset($data['product_id']) || !isset($data['quantity'])) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$user_id = intval($data['user_id']);
$product_id = intval($data['product_id']);
$quantity = floatval($data['quantity']);
$is_cleaning = isset($data['is_cleaning']) ? intval($data['is_cleaning']) : 0;
$is_grinding = isset($data['is_grinding']) ? intval($data['is_grinding']) : 0;
$is_weight_pending = isset($data['is_weight_pending']) ? intval($data['is_weight_pending']) : 0;

if ($quantity <= 0) {
    // Delete if quantity is 0 or less
    $sql = "DELETE ci FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            WHERE c.user_id = ? AND ci.product_id = ? AND ci.is_cleaning = ? AND ci.is_grinding = ? AND ci.is_weight_pending = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iiiii", $user_id, $product_id, $is_cleaning, $is_grinding, $is_weight_pending);
} else {
    // Update quantity
    $sql = "UPDATE cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            SET ci.quantity = ?
            WHERE c.user_id = ? AND ci.product_id = ? AND ci.is_cleaning = ? AND ci.is_grinding = ? AND ci.is_weight_pending = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("diiiii", $quantity, $user_id, $product_id, $is_cleaning, $is_grinding, $is_weight_pending);
}

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Cart updated"]);
} else {
    echo json_encode(["success" => false, "message" => "Error updating cart: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
