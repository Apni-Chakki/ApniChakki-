<?php
// google login controller logic
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $accessToken = $input['credential'] ?? '';

    if (empty($accessToken)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Access token is required']);
        exit;
    }

    // Call Google's userinfo endpoint to verify token and get user profile
    $url = 'https://www.googleapis.com/oauth2/v3/userinfo?access_token=' . urlencode($accessToken);
    
    // Use curl for better reliability and control over timeouts/errors
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For local XAMPP environments
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if ($http_code !== 200 || !$response) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid Google access token or failed to communicate with Google API',
            'debug_code' => $http_code,
            'debug_error' => $curl_error
        ]);
        exit;
    }

    $google_user = json_decode($response, true);
    if (!isset($google_user['email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Failed to retrieve email from Google profile']);
        exit;
    }

    $email = trim($google_user['email']);
    $full_name = trim($google_user['name'] ?? '');
    $google_id = trim($google_user['sub'] ?? '');

    // Check if the user already exists by email
    $stmt = $conn->prepare("SELECT id, full_name, email, phone, address, role, is_active FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // User exists!
        $user = $result->fetch_assoc();
        $stmt->close();

        if (!$user['is_active']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Account is deactivated']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'name' => $user['full_name'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'address' => $user['address'],
                'role' => $user['role']
            ]
        ]);
    } else {
        $stmt->close();
        
        // Check if a placeholder phone number is needed
        // Format of placeholder: G-<google_id> or G-<uniqid>
        $placeholder_phone = 'G-' . ($google_id ? $google_id : uniqid());
        
        // Insert new user
        $stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, password_hash, role, is_active) VALUES (?, ?, ?, NULL, 'customer', 1)");
        $stmt->bind_param("sss", $full_name, $email, $placeholder_phone);
        
        if ($stmt->execute()) {
            $user_id = $stmt->insert_id;
            $stmt->close();

            echo json_encode([
                'success' => true,
                'message' => 'Registration and login successful',
                'user' => [
                    'id' => $user_id,
                    'name' => $full_name,
                    'full_name' => $full_name,
                    'email' => $email,
                    'phone' => $placeholder_phone,
                    'address' => '',
                    'role' => 'customer'
                ]
            ]);
        } else {
            $stmt->close();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create user account']);
        }
    }

} catch (Exception $e) {
    error_log('Google Login Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Google login failed: ' . $e->getMessage()]);
}

$conn->close();
?>
