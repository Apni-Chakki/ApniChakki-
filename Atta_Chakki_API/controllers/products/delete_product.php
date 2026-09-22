<?php
// delete product api
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cloudinary_helper.php';
require_once __DIR__ . '/../../utils/cache_helper.php';
require_once __DIR__ . '/../../utils/auth_middleware.php';

$user = require_admin();

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
try {
    $check = $conn->prepare("SELECT COUNT(*) as cnt FROM order_items WHERE product_id = ?");
    if ($check) {
        $check->bind_param("i", $id);
        $check->execute();
        $check_res = $check->get_result()->fetch_assoc();
        $check->close();
        
        if ($check_res && $check_res['cnt'] > 0) {
            echo json_encode([
                "success" => false, 
                "message" => "Cannot delete: This product is linked to {$check_res['cnt']} order(s). You can disable or mark it inactive instead."
            ]);
            exit;
        }
    }
} catch (Throwable $e) {
    error_log("Order items check error: " . $e->getMessage());
}

// checking if product is linked to rentals
try {
    $checkRentals = $conn->prepare("SELECT COUNT(*) as cnt FROM rentals WHERE product_id = ?");
    if ($checkRentals) {
        $checkRentals->bind_param("i", $id);
        $checkRentals->execute();
        $rentals_res = $checkRentals->get_result()->fetch_assoc();
        $checkRentals->close();

        if ($rentals_res && $rentals_res['cnt'] > 0) {
            echo json_encode([
                "success" => false,
                "message" => "Cannot delete: This product is linked to {$rentals_res['cnt']} rental record(s)."
            ]);
            exit;
        }
    }
} catch (Throwable $e) {
    error_log("Rentals check error: " . $e->getMessage());
}

// removing from cart_items if the table exists
try {
    $tblCheck = $conn->query("SHOW TABLES LIKE 'cart_items'");
    if ($tblCheck && $tblCheck->num_rows > 0) {
        $remove = $conn->prepare("DELETE FROM cart_items WHERE product_id = ?");
        if ($remove) {
            $remove->bind_param("i", $id);
            $remove->execute();
            $remove->close();
        }
    }
} catch (Throwable $e) {
    error_log("Cart item cleanup error: " . $e->getMessage());
}

// deleting image from cloudinary (best-effort, non-blocking)
if (!empty($imageUrl)) {
    try {
        $cloudinaryDeleteResult = deleteCloudinaryImageByUrl($imageUrl);
        if (!$cloudinaryDeleteResult['success']) {
            error_log("Cloudinary image deletion note: " . ($cloudinaryDeleteResult['message'] ?? 'Unknown'));
        }
    } catch (Throwable $e) {
        error_log("Cloudinary image deletion error: " . $e->getMessage());
    }
}

// deleting product from db
try {
    $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows === 0) {
            echo json_encode(["success" => false, "message" => "Product not found"]);
        } else {
            clear_api_cache();
            echo json_encode(["success" => true, "status" => "success", "message" => "Product deleted successfully"]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Error deleting product: " . $stmt->error]);
    }
    $stmt->close();
} catch (Throwable $e) {
    error_log("Product delete error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Cannot delete product: it is linked to existing order history or records."]);
}
