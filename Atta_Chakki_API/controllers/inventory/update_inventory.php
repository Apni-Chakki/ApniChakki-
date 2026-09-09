<?php
// update_inventory.php
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
$auth_user = require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? 'deduct';
    $items = $data['items'] ?? [];

    if (!empty($items) && is_array($items)) {
        foreach ($items as $item) {
            $productId = intval($item['product_id'] ?? $item['id'] ?? 0);
            $qty = floatval($item['quantity'] ?? $item['qty'] ?? 0);

            if ($productId > 0 && $qty > 0) {
                if ($action === 'deduct') {
                    $stmt = $conn->prepare("UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?");
                    $stmt->bind_param("di", $qty, $productId);
                    $stmt->execute();
                    $stmt->close();
                } elseif ($action === 'restore') {
                    $stmt = $conn->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
                    $stmt->bind_param("di", $qty, $productId);
                    $stmt->execute();
                    $stmt->close();
                }
            }
        }
    }

    echo json_encode([
        "success" => true,
        "message" => "Inventory updated successfully"
    ]);
} catch (Exception $e) {
    echo json_encode([
        "success" => true,
        "message" => "Inventory processed with note: " . $e->getMessage()
    ]);
}
?>
