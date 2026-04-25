<?php
/**
 * Add a new category
 * API Endpoint: POST /add_category.php
 * Request body: { "name": "...", "image_url": "..." }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['name']) || empty(trim($data['name']))) {
        throw new Exception('Category name is required');
    }
    
    $name = trim($data['name']);
    $image_url = isset($data['image_url']) ? trim($data['image_url']) : null;
    
    // Check if category already exists
    $checkSql = "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)";
    $checkStmt = $conn->prepare($checkSql);
    if (!$checkStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $checkStmt->bind_param("s", $name);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        throw new Exception("Category '" . $name . "' already exists");
    }
    
    // Insert new category
    $sql = "INSERT INTO categories (name, image_url) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("ss", $name, $image_url);
    $stmt->execute();
    
    $categoryId = $conn->insert_id;
    
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Category added successfully',
        'category' => [
            'id' => $categoryId,
            'name' => $name,
            'image_url' => $image_url
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Add Category Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
