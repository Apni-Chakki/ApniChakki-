<?php
// update inventory api
require_once dirname(__DIR__, 2) . '/Config/connect.php';

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
        $sql = "UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?";
    } else if ($action === 'restore') {
        $sql = "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?";
    } else {
        $errors[] = "Invalid action: $action.";
        break;
    }

    // Check track_inventory flag before deducting/restoring stock
    $check_query = $conn->query("SELECT track_inventory, unit FROM products WHERE id = " . $productId);
    $row = $check_query->fetch_assoc();
    if ($row) {
        $trackInventory = isset($row['track_inventory']) ? (int)$row['track_inventory'] : 1;
        if ($trackInventory === 0 || strtolower(trim($row['unit'])) === 'trip') {
            continue; // Skip stock update if tracking is disabled or it's a delivery trip
        }
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


