<?php
// update inventory api
require_once 'config/cors.php';
require_once 'config/connect.php';

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);

if (!isset($data['action']) || !isset($data['items'])) {
    echo json_encode(["success" => false, "message" => "Missing action or items parameter."]);
    exit();
}

$action = $data['action'];
$items = $data['items'];

if (!is_array($items)) {
    echo json_encode(["success" => false, "message" => "Items must be an array."]);
    exit();
}

$successCount = 0;
$errors = [];

foreach ($items as $item) {
    if (!isset($item['product_id']) || !isset($item['quantity'])) {
        $errors[] = "Missing product_id or quantity for an item.";
        continue;
    }

    $productId = (int)$item['product_id'];
    $quantity = (float)$item['quantity'];

    if ($action === 'deduct') {
        $sql = "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?";
    } else if ($action === 'restore') {
        $sql = "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?";
    } else {
        $errors[] = "Invalid action: $action.";
        break;
    }

    // Check if unit is trip before deducting/restoring stock
    $unit_check = $conn->query("SELECT unit FROM products WHERE id = " . $productId);
    $unit_row = $unit_check->fetch_assoc();
    if ($unit_row && strtolower(trim($unit_row['unit'])) === 'trip') {
        continue; // Skip stock update for service items
    }

    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->bind_param("di", $quantity, $productId);
        if ($stmt->execute()) {
            $successCount++;
        } else {
            $errors[] = "Failed to update product ID: $productId. Error: " . $stmt->error;
        }
        $stmt->close();
    } else {
        $errors[] = "Failed to prepare statement for product ID: $productId.";
    }
}

if (count($errors) > 0) {
    echo json_encode([
        "success" => false,
        "message" => "Encountered errors during inventory update.",
        "errors" => $errors,
        "success_count" => $successCount
    ]);
} else {
    echo json_encode([
        "success" => true,
        "message" => "Inventory updated successfully.",
        "success_count" => $successCount
    ]);
}
$conn->close();
?>