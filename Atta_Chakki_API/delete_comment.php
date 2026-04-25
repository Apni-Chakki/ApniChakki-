<?php
// delete comment api
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    $id = $input['id'] ?? null;
    $user_id = $input['user_id'] ?? null;
    $role = $input['role'] ?? 'customer';

    if (!$id || !$user_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing ID or User ID']);
        exit;
    }

    // checking ownership or admin
    $verify = $conn->prepare("SELECT user_id FROM comments WHERE id = ?");
    $verify->bind_param("i", $id);
    $verify->execute();
    $result = $verify->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Comment not found']);
        exit;
    }

    $comment = $result->fetch_assoc();
    if ($comment['user_id'] != $user_id && $role !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized: You can only delete your own comments']);
        exit;
    }
    $verify->close();

    // deleting comment
    $stmt = $conn->prepare("DELETE FROM comments WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Comment deleted successfully']);
    } else {
        throw new Exception($stmt->error);
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>