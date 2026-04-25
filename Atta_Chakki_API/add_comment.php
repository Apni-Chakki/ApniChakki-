<?php
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    $user_id = $input['user_id'] ?? null;
    $rating = $input['rating'] ?? null;
    $comment_text = trim($input['comment_text'] ?? '');

    if (!$user_id || !$rating || empty($comment_text)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO comments (user_id, rating, comment_text, status) VALUES (?, ?, ?, 'active')");
    $stmt->bind_param("iis", $user_id, $rating, $comment_text);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Comment posted successfully', 'comment_id' => $stmt->insert_id]);
    } else {
        throw new Exception($stmt->error);
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>