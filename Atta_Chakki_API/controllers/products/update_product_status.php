<?php
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cache_helper.php';

header('Content-Type: application/json');
// Never cache the mutation response itself — always tell the client this was fresh.
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Only POST method is allowed");
    }

    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->id) || (!isset($data->is_active) && !isset($data->status))) {
        throw new Exception("Product ID and status are required");
    }

    $id = intval($data->id);
    $is_active = isset($data->is_active) ? (intval($data->is_active) ? 1 : 0) : (intval($data->status) ? 1 : 0);

    $stmt = $conn->prepare("UPDATE products SET is_active = ? WHERE id = ?");
    $stmt->bind_param("ii", $is_active, $id);

    if ($stmt->execute()) {
        // Invalidate the server-side product/category caches so the next reload sees the change.
        clear_api_cache();
        echo json_encode([
            "success" => true,
            "status"  => "success",
            "message" => "Product status updated successfully"
        ]);
    } else {
        throw new Exception("Failed to update product status");
    }

    $stmt->close();
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>
