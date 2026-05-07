<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['user_id']) || !isset($data['items'])) {
    echo json_encode(["success" => false, "message" => "User ID and items are required"]);
    exit;
}

$user_id = intval($data['user_id']);
$items = $data['items'];

// Ensure cart exists
$conn->query("INSERT IGNORE INTO carts (user_id) VALUES ($user_id)");
$cart_res = $conn->query("SELECT id FROM carts WHERE user_id = $user_id");
$cart = $cart_res->fetch_assoc();
$cart_id = $cart['id'];

foreach ($items as $item) {
    $product_id = intval($item['service']['id']);
    $quantity = floatval($item['quantity']);
    $is_cleaning = isset($item['service']['is_cleaning']) ? intval($item['service']['is_cleaning']) : 0;
    $is_grinding = isset($item['service']['is_grinding']) ? intval($item['service']['is_grinding']) : 0;
    $is_weight_pending = isset($item['isWeightPending']) ? (int)$item['isWeightPending'] : 0;

    // Check if exists
    $check_stmt = $conn->prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND is_cleaning = ? AND is_grinding = ? AND is_weight_pending = ?");
    $check_stmt->bind_param("iiiii", $cart_id, $product_id, $is_cleaning, $is_grinding, $is_weight_pending);
    $check_stmt->execute();
    $check_res = $check_stmt->get_result();

    if ($row = $check_res->fetch_assoc()) {
        // We use the maximum quantity or sum? Let's use sum or just replace?
        // Usually, merging means summing or taking the most recent.
        // Let's sum for better user experience.
        $new_qty = $row['quantity'] + $quantity;
        $update_stmt = $conn->prepare("UPDATE cart_items SET quantity = ? WHERE id = ?");
        $update_stmt->bind_param("di", $new_qty, $row['id']);
        $update_stmt->execute();
        $update_stmt->close();
    } else {
        $insert_stmt = $conn->prepare("INSERT INTO cart_items (cart_id, product_id, quantity, is_cleaning, is_grinding, is_weight_pending) VALUES (?, ?, ?, ?, ?, ?)");
        $insert_stmt->bind_param("iidiii", $cart_id, $product_id, $quantity, $is_cleaning, $is_grinding, $is_weight_pending);
        $insert_stmt->execute();
        $insert_stmt->close();
    }
    $check_stmt->close();
}

echo json_encode(["success" => true, "message" => "Cart synced successfully"]);
$conn->close();
?>
