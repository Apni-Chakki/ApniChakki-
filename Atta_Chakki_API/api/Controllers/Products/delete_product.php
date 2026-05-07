<?php
// delete product api
require_once dirname(__DIR__, 2) . '/Config/connect.php';
require_once __DIR__ . '/../../Utils/cloudinary_helper.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['id'])) {
    echo json_encode(["success" => false, "message" => "Product ID is required"]);
    exit;
}

$id = intval($data['id']);

$productStmt = $conn->prepare("SELECT image_url FROM products WHERE id = ?");
if ($productStmt) {
    $productStmt->bind_param("i", $id);
    $productStmt->execute();
    $productResult = $productStmt->get_result()->fetch_assoc();
    $productStmt->close();

    if (!$productResult) {
        echo json_encode(["success" => false, "message" => "Product not found"]);
        exit;
    }

    $imageUrl = $productResult['image_url'] ?? null;
} else {
    echo json_encode(["success" => false, "message" => "Unable to load product details"]);
    exit;
}

// checking if product is in any orders
$check = $conn->prepare("SELECT COUNT(*) as cnt FROM order_items WHERE product_id = ?");
if ($check) {
    $check->bind_param("i", $id);
    $check->execute();
    $check_res = $check->get_result()->fetch_assoc();
    $check->close();
    
    if ($check_res['cnt'] > 0) {
        echo json_encode(["success" => false, "message" => "Cannot delete: This product is linked to {$check_res['cnt']} order(s). Consider disabling it instead."]);
        exit;
    }
}


// deleting image from cloudinary
$cloudinaryDeleteResult = deleteCloudinaryImageByUrl($imageUrl ?? null);
if (!$cloudinaryDeleteResult['success']) {
    echo json_encode([
        "success" => false,
        "message" => "Product image could not be deleted from Cloudinary: " . $cloudinaryDeleteResult['message']
    ]);
    exit;
}

// deleting product from db
$stmt = $conn->prepare("DELETE FROM products WHERE id=?");
$stmt->bind_param("i", $id);

try {
    if ($stmt->execute()) {
        if ($stmt->affected_rows === 0) {
            echo json_encode(["success" => false, "message" => "Product not found"]);
        } else {
            echo json_encode(["success" => true, "message" => "Product deleted successfully"]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Cannot delete product: it is linked to existing order history."]);
}
$stmt->close();



