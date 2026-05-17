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
$quantity = isset($data['quantity']) ? floatval($data['quantity']) : 1.0;
$is_cleaning = isset($data['is_cleaning']) ? intval($data['is_cleaning']) : 0;
$is_grinding = isset($data['is_grinding']) ? intval($data['is_grinding']) : 0;
$is_weight_pending = isset($data['is_weight_pending']) ? intval($data['is_weight_pending']) : 0;

// Ensure cart exists
$conn->query("INSERT IGNORE INTO carts (user_id) VALUES ($user_id)");
$cart_res = $conn->query("SELECT id FROM carts WHERE user_id = $user_id");
$cart = $cart_res->fetch_assoc();
$cart_id = $cart['id'];

// Check if item already exists with same options
$check_sql = "SELECT id, quantity FROM cart_items 
              WHERE cart_id = ? AND product_id = ? AND is_cleaning = ? AND is_grinding = ? AND is_weight_pending = ?";
$check_stmt = $conn->prepare($check_sql);
$check_stmt->bind_param("iiiii", $cart_id, $product_id, $is_cleaning, $is_grinding, $is_weight_pending);
$check_stmt->execute();
$check_res = $check_stmt->get_result();

if ($row = $check_res->fetch_assoc()) {
    // Update existing
    $new_qty = $row['quantity'] + $quantity;
    $update_stmt = $conn->prepare("UPDATE cart_items SET quantity = ? WHERE id = ?");
    $update_stmt->bind_param("di", $new_qty, $row['id']);
    $update_stmt->execute();
    $update_stmt->close();
} else {
    // Insert new
    $insert_stmt = $conn->prepare("INSERT INTO cart_items (cart_id, product_id, quantity, is_cleaning, is_grinding, is_weight_pending) VALUES (?, ?, ?, ?, ?, ?)");
    $insert_stmt->bind_param("iidiii", $cart_id, $product_id, $quantity, $is_cleaning, $is_grinding, $is_weight_pending);
    $insert_stmt->execute();
    $insert_stmt->close();
}

echo json_encode(["success" => true, "message" => "Cart updated"]);
$check_stmt->close();
$conn->close();
?>
