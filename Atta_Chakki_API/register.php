<?php
// register api
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

    $full_name = trim($input['full_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $password = $input['password'] ?? '';
    $address = trim($input['address'] ?? '');

    // checking if fields are empty
    if (empty($full_name) || empty($phone) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Name, phone, and password are required']);
        exit;
    }

    // checking duplicate phone
    $check = $conn->prepare("SELECT id FROM users WHERE phone = ?");
    $check->bind_param("s", $phone);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Phone number already registered']);
        $check->close();
        exit;
    }
    $check->close();

    // hashing password
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // inserting user into db
    $stmt = $conn->prepare("INSERT INTO users (full_name, phone, password_hash, address, role) VALUES (?, ?, ?, ?, 'customer')");
    $stmt->bind_param("ssss", $full_name, $phone, $password_hash, $address);
    $stmt->execute();

    $user_id = $stmt->insert_id;
    $stmt->close();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'user_id' => $user_id
    ]);

} catch (Exception $e) {
    error_log('Registration Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
}

$conn->close();
