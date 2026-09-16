<?php
// delete category controller logic
require_once __DIR__ . '/../../utils/cache_helper.php';
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['id'])) {
        throw new Exception('Category ID is required');
    }
    
    $id = intval($data['id']);
    
    // checking if exists
    $checkSql = "SELECT id FROM categories WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    if (!$checkStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $checkStmt->bind_param("i", $id);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        // Category already deleted or missing from DB - invalidate stale cache and return success
        clear_api_cache();
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Category removed successfully',
            'id' => $id
        ]);
        exit;
    }
    
    // Reassign any products referencing this category to another active category or NULL to prevent FK constraint error
    $fallback_cat_stmt = $conn->prepare("SELECT id FROM categories WHERE id != ? AND is_active = 1 ORDER BY id ASC LIMIT 1");
    if ($fallback_cat_stmt) {
        $fallback_cat_stmt->bind_param("i", $id);
        $fallback_cat_stmt->execute();
        $fallback_res = $fallback_cat_stmt->get_result();
        $fallback_id = ($fallback_res && $fallback_res->num_rows > 0) ? intval($fallback_res->fetch_assoc()['id']) : null;
        $fallback_cat_stmt->close();

        if ($fallback_id) {
            $upd_stmt = $conn->prepare("UPDATE products SET category_id = ? WHERE category_id = ?");
            if ($upd_stmt) {
                $upd_stmt->bind_param("ii", $fallback_id, $id);
                $upd_stmt->execute();
                $upd_stmt->close();
            }
        } else {
            $upd_stmt = $conn->prepare("UPDATE products SET category_id = NULL WHERE category_id = ?");
            if ($upd_stmt) {
                $upd_stmt->bind_param("i", $id);
                $upd_stmt->execute();
                $upd_stmt->close();
            }
        }
    }

    // deleting it
    $sql = "DELETE FROM categories WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("i", $id);
    $stmt->execute();
    
    // Invalidate API cache
    clear_api_cache();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Category deleted successfully',
        'id' => $id
    ]);
    
} catch (Exception $e) {
    error_log('Delete Category Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
