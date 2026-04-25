<?php
// edit comment api
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    $id = $input['id'] ?? null;
    $user_id = $input['user_id'] ?? null;
    $rating = $input['rating'] ?? null;
    $comment_text = trim($input['comment_text'] ?? '');

    if (!$id || !$user_id || !$rating || empty($comment_text)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }

    // checking if user owns this comment
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
    if ($comment['user_id'] != $user_id) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized: You can only edit your own comments']);
        exit;
    }
    $verify->close();

    // updating the comment
    $stmt = $conn->prepare("UPDATE comments SET rating = ?, comment_text = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("isii", $rating, $comment_text, $id, $user_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Comment updated successfully']);
    } else {
        throw new Exception($stmt->error);
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>