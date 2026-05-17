<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['user_id'])) {
    echo json_encode(["success" => false, "message" => "User ID is required"]);
    exit;
}

$user_id = intval($data['user_id']);

$sql = "DELETE ci FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        WHERE c.user_id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Cart cleared"]);
} else {
    echo json_encode(["success" => false, "message" => "Error clearing cart: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
