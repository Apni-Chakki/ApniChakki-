<?php
// google login api
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
    $credential = $input['credential'] ?? '';
    
    if (empty($credential)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Token is required']);
        exit;
    }
    
    // Verify Google Token (Access Token)
    $verify_url = 'https://www.googleapis.com/oauth2/v3/userinfo?access_token=' . $credential;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $verify_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode != 200 || !$response) {
        throw new Exception("Failed to verify token with Google.");
    }
    
    $payload = json_decode($response, true);
    
    if (isset($payload['error'])) {
        throw new Exception("Invalid Google Token.");
    }
    
    $email = $payload['email'];
    $name = $payload['name'] ?? 'Google User';
    $google_id = $payload['sub'];
    
    // Check if user exists by email
    $stmt = $conn->prepare("SELECT id, full_name, email, phone, password_hash, address, role, is_active FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $stmt->close();
        
        if (!$user['is_active']) {
            echo json_encode(['success' => false, 'message' => 'Account is deactivated']);
            exit;
        }
        
        // Log them in
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
        
        // Create new user
        // Generate dummy phone number from Google ID (remove G- prefix)
        $dummy_phone = '03' . substr($google_id, 0, 9); 
        $password_hash = password_hash(bin2hex(random_bytes(10)), PASSWORD_DEFAULT); // random password
        
        $insert = $conn->prepare("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'customer')");
        $insert->bind_param("ssss", $name, $email, $dummy_phone, $password_hash);
        
        if ($insert->execute()) {
            $user_id = $insert->insert_id;
            $insert->close();
            
            // Send welcome email via Node.js Email Server
            $emailServerUrl = 'http://localhost:3002/send-welcome-email';
            
            $emailData = [
                'email' => $email,
                'name' => $name
            ];

            $ch = curl_init($emailServerUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            
            curl_exec($ch);
            curl_close($ch);
            
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user_id,
                    'name' => $name,
                    'full_name' => $name,
                    'email' => $email,
                    'phone' => $dummy_phone,
                    'address' => null,
                    'role' => 'customer'
                ]
            ]);
        } else {
            throw new Exception("Failed to create user account: " . $conn->error);
        }
    }

} catch (Exception $e) {
    error_log('Google Login Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Google Login failed: ' . $e->getMessage()]);
}

$conn->close();
?>
