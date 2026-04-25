<?php
// update category api
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

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
    
    if (!isset($data['name']) || empty(trim($data['name']))) {
        throw new Exception('Category name is required');
    }
    
    $id = intval($data['id']);
    $name = trim($data['name']);
    $image_url = isset($data['image_url']) ? trim($data['image_url']) : null;
    
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
        throw new Exception("Category not found");
    }
    
    // updating it
    $sql = "UPDATE categories SET name = ?, image_url = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("ssi", $name, $image_url, $id);
    $stmt->execute();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Category updated successfully',
        'category' => [
            'id' => $id,
            'name' => $name,
            'image_url' => $image_url
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Update Category Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
