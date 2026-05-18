<?php
// forgot password - generate OTP and send via email using Node.js Email Server
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

    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email is required']);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email address']);
        exit;
    }

    // Check if user exists with this email OR phone
    $stmt = $conn->prepare("SELECT id, full_name, email, phone FROM users WHERE (email = ? OR phone = ?)");
    $stmt->bind_param("ss", $email, $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        // Don't reveal if email exists or not for security, but still return success
        echo json_encode(['success' => true, 'message' => 'If this email or phone is registered, an OTP has been sent.']);
        exit;
    }

    $user = $result->fetch_assoc();
    $stmt->close();

    // Generate 6-digit OTP
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));

    // Create password_resets table if not exists
    $conn->query("CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_otp (email, otp)
    )");

    // Delete old OTPs for this email
    $del = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
    $del->bind_param("s", $email);
    $del->execute();
    $del->close();

    // Insert new OTP
    $insert = $conn->prepare("INSERT INTO password_resets (user_id, email, otp, expires_at) VALUES (?, ?, ?, ?)");
    $insert->bind_param("isss", $user['id'], $email, $otp, $expires_at);
    $insert->execute();
    $insert->close();

    // Send OTP via Node.js Email Server
    $emailServerUrl = 'http://localhost:3002/send-password-reset';
    $resetLink = 'http://localhost:5173/reset-password?email=' . urlencode($email) . '&otp=' . $otp;
    
    $data = [
        'email' => $email,
        'name' => $user['full_name'],
        'resetLink' => $resetLink,
        'otp' => $otp
    ];

    $ch = curl_init($emailServerUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        echo json_encode([
            'success' => true,
            'message' => 'OTP has been sent to your email. Valid for 10 minutes.',
        ]);
    } else {
        // Fallback message
        echo json_encode([
            'success' => true,
            'message' => 'OTP has been sent. Check your email for verification code.',
            'otp' => $otp  // Only for development/debugging
        ]);
    }

} catch (Exception $e) {
    error_log('Forgot Password Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to process request']);
}

$conn->close();
?>
