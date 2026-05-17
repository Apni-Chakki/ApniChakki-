<?php
// reset password - verify OTP and update password
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

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

    // Verify OTP
    $stmt = $conn->prepare("SELECT id, user_id, expires_at FROM password_resets WHERE email = ? AND otp = ? AND used = 0 ORDER BY created_at DESC LIMIT 1");
    $stmt->bind_param("ss", $email, $otp);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        echo json_encode(['success' => false, 'message' => 'Invalid or expired OTP']);
        exit;
    }

    $reset = $result->fetch_assoc();
    $stmt->close();

    // Check if OTP expired
    if (strtotime($reset['expires_at']) < time()) {
        echo json_encode(['success' => false, 'message' => 'OTP has expired. Please request a new one.']);
        exit;
    }

    // Hash new password
    $password_hash = password_hash($new_password, PASSWORD_DEFAULT);

    // Update user password
    $update = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $update->bind_param("si", $password_hash, $reset['user_id']);
    
    if ($update->execute()) {
        $update->close();

        // Mark OTP as used
        $mark = $conn->prepare("UPDATE password_resets SET used = 1 WHERE id = ?");
        $mark->bind_param("i", $reset['id']);
        $mark->execute();
        $mark->close();

        echo json_encode([
            'success' => true,
            'message' => 'Password reset successful. You can now log in with your new password.'
        ]);
    } else {
        throw new Exception("Failed to update password");
    }

} catch (Exception $e) {
    error_log('Reset Password Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to reset password: ' . $e->getMessage()]);
}

$conn->close();
?>
