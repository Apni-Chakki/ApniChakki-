<?php
// login controller logic
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../config/cors.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    $phone = trim($input['phone'] ?? $input['username'] ?? '');
    $password = $input['password'] ?? '';
    $login_type = $input['login_type'] ?? 'customer';

require_once __DIR__ . '/../../utils/rate_limiter.php';

if (empty($phone) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Phone/username and password are required']);
    exit;
}

// Rate Limiting: 5 attempts per 15 minutes (900 seconds)
$client_ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rate_key = 'login_' . md5($phone . '_' . $client_ip);

$rate_status = check_rate_limit($rate_key, 5, 900);
if (!$rate_status['allowed']) {
    http_response_code(429);
    $minutes = ceil($rate_status['retry_after'] / 60);
    echo json_encode([
        'success' => false,
        'message' => "Too many failed login attempts. Please try again in $minutes minute(s)."
    ]);
    exit;
}

    if ($login_type === 'delivery') {
        // delivery boy login
        $stmt = $conn->prepare("
            SELECT u.id, u.full_name as name, u.phone, u.password_hash, u.is_active, d.cnic 
            FROM users u 
            LEFT JOIN delivery_personnel d ON u.phone = d.phone 
            WHERE u.phone = ? AND u.role IN ('delivery_boy', 'delivery', 'admin')
        ");
        $stmt->bind_param("s", $phone);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $stmt->close();
            hit_rate_limit($rate_key, 900);
            echo json_encode(['success' => false, 'message' => 'Invalid phone number, password, or not a delivery account']);
            exit;
        }

        $user = $result->fetch_assoc();
        $stmt->close();

        if (!password_verify($password, $user['password_hash'])) {
            hit_rate_limit($rate_key, 900);
            echo json_encode(['success' => false, 'message' => 'Invalid phone number or password']);
            exit;
        }

        if (!$user['is_active']) {
            echo json_encode(['success' => false, 'message' => 'Account is deactivated']);
            exit;
        }

        clear_rate_limit($rate_key);

        require_once __DIR__ . '/../../utils/jwt_helper.php';
        $payload = [
            'id' => $user['id'],
            'phone' => $user['phone'],
            'role' => 'delivery_boy'
        ];
        $token = generate_jwt($payload);

        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'phone' => $user['phone'],
                'cnic' => $user['cnic'],
                'role' => 'delivery_boy'
            ]
        ]);

    } else {
        // customer or admin login
        $stmt = $conn->prepare("SELECT id, full_name, email, phone, password_hash, address, role, is_active FROM users WHERE phone = ? OR email = ?");
        $stmt->bind_param("ss", $phone, $phone);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $stmt->close();
            hit_rate_limit($rate_key, 900);
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
            exit;
        }

        $user = $result->fetch_assoc();
        $stmt->close();

        if (!password_verify($password, $user['password_hash'])) {
            hit_rate_limit($rate_key, 900);
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
            exit;
        }

        if (!$user['is_active']) {
            echo json_encode(['success' => false, 'message' => 'Account is deactivated']);
            exit;
        }

        clear_rate_limit($rate_key);

        // Generate JWT Token
        require_once __DIR__ . '/../../utils/jwt_helper.php';
        $payload = [
            'id' => $user['id'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'role' => $user['role']
        ];
        $token = generate_jwt($payload);

        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
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
    }

} catch (Exception $e) {
    error_log('Login Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Login failed: ' . $e->getMessage()]);
}

$conn->close();
?>
