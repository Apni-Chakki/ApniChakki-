<?php
// reset_password controller logic
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($input['email'] ?? '');
    $otp = trim($input['otp'] ?? '');
    $new_password = $input['new_password'] ?? '';

    if (empty($email) || empty($otp) || empty($new_password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email, OTP, and new password are required']);
        exit;
    }

    // Verify OTP matches email, is not used, and not expired
    $now = date('Y-m-d H:i:s');
    $stmt = $conn->prepare("
        SELECT id, user_id 
        FROM password_resets 
        WHERE email = ? AND otp = ? AND used = 0 AND expires_at > ? 
        ORDER BY created_at DESC 
        LIMIT 1
    ");
    $stmt->bind_param("sss", $email, $otp, $now);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired OTP code']);
        $stmt->close();
        exit;
    }

    $reset_record = $result->fetch_assoc();
    $reset_id = $reset_record['id'];
    $user_id = $reset_record['user_id'];
    $stmt->close();

    // Hash new password
    $password_hash = password_hash($new_password, PASSWORD_DEFAULT);

    // Update user's password in db
    $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $stmt->bind_param("si", $password_hash, $user_id);
    $stmt->execute();
    $stmt->close();

    // Mark OTP as used
    $stmt = $conn->prepare("UPDATE password_resets SET used = 1 WHERE id = ?");
    $stmt->bind_param("i", $reset_id);
    $stmt->execute();
    $stmt->close();

    echo json_encode([
        'success' => true,
        'message' => 'Password reset successful!'
    ]);

} catch (Exception $e) {
    error_log('Reset Password Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}

$conn->close();
?>
