<?php
// forgot_password controller logic
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

    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email is required']);
        exit;
    }

    // Check if user exists
    $stmt = $conn->prepare("SELECT id, full_name FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Email not found in our records']);
        $stmt->close();
        exit;
    }

    $user = $result->fetch_assoc();
    $user_id = $user['id'];
    $customer_name = $user['full_name'] ?? 'Customer';
    $stmt->close();

    // Generate 6 digit OTP code
    $otp = sprintf("%06d", mt_rand(100000, 999999));
    $expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    // Insert into password_resets
    $stmt = $conn->prepare("INSERT INTO password_resets (user_id, email, identifier, otp, expires_at) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("issss", $user_id, $email, $email, $otp, $expires_at);
    $stmt->execute();
    $stmt->close();

    // Send email via Node.js Email Server
    $emailData = [
        'email' => $email,
        'name' => $customer_name,
        'otp' => $otp
    ];
    $ch = curl_init('http://localhost:3001/send-password-reset');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    curl_exec($ch);
    curl_close($ch);

    // Return the response, including OTP in debug mode for local testing
    echo json_encode([
        'success' => true,
        'message' => 'OTP has been sent to your email address.',
        'debug' => true,
        'otp' => $otp
    ]);

} catch (Exception $e) {
    error_log('Forgot Password Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}

$conn->close();
?>
