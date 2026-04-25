<?php
// delete product api
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cloudinary_helper.php';

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

// removing from carts if exists
$check2 = $conn->prepare("SELECT COUNT(*) as cnt FROM cart_items WHERE product_id = ?");
if ($check2) {
    $check2->bind_param("i", $id);
    $check2->execute();
    $check_res2 = $check2->get_result()->fetch_assoc();
    $check2->close();
    
    if ($check_res2['cnt'] > 0) {
        $remove = $conn->prepare("DELETE FROM cart_items WHERE product_id = ?");
        $remove->bind_param("i", $id);
        $remove->execute();
        $remove->close();
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
