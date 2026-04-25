<?php
// login api
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

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

    if (empty($phone) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Phone/username and password are required']);
        exit;
    }

    if ($login_type === 'delivery') {
        // delivery boy login
        $stmt = $conn->prepare("
            SELECT u.id, u.full_name as name, u.phone, u.password_hash, u.is_active, d.vehicle_number 
            FROM users u 
            LEFT JOIN delivery_personnel d ON u.phone = d.phone 
            WHERE u.phone = ? AND u.role IN ('delivery_boy', 'delivery', 'admin')
        ");
        $stmt->bind_param("s", $phone);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $stmt->close();
            echo json_encode(['success' => false, 'message' => 'Invalid phone number, password, or not a delivery account']);
            exit;
        }

        $user = $result->fetch_assoc();
        $stmt->close();

        if (!password_verify($password, $user['password_hash'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid phone number or password']);
            exit;
        }

        if (!$user['is_active']) {
            echo json_encode(['success' => false, 'message' => 'Account is deactivated']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'phone' => $user['phone'],
                'vehicle_number' => $user['vehicle_number'],
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
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
            $stmt->close();
            exit;
        }

        $user = $result->fetch_assoc();
        $stmt->close();

        if (!password_verify($password, $user['password_hash'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
            exit;
        }

        if (!$user['is_active']) {
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
    }

} catch (Exception $e) {
    error_log('Login Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Login failed: ' . $e->getMessage()]);
}

$conn->close();
