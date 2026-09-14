<?php
// register controller logic
include __DIR__ . '/../../config/connect.php';

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
    $check = $conn->prepare("SELECT id, role FROM users WHERE phone = ?");
    $check->bind_param("s", $phone);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        $existing_id = null;
        $existing_role = null;
        $check->bind_result($existing_id, $existing_role);
        $check->fetch();
        $check->close();
        
        // If it is a delivery boy/delivery role, check if they are still in delivery_personnel
        if (in_array($existing_role, ['delivery_boy', 'delivery'])) {
            $dp_check = $conn->prepare("SELECT id FROM delivery_personnel WHERE phone = ?");
            $dp_check->bind_param("s", $phone);
            $dp_check->execute();
            $dp_check->store_result();
            $in_dp = $dp_check->num_rows > 0;
            $dp_check->close();
            
            if (!$in_dp) {
                // It is a leftover orphan! Delete it.
                $del_orphan = $conn->prepare("DELETE FROM users WHERE id = ?");
                $del_orphan->bind_param("i", $existing_id);
                $del_orphan->execute();
                $del_orphan->close();
                
                // Allow registration to proceed since orphan is deleted!
            } else {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Phone number already registered']);
                exit;
            }
        } else {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Phone number already registered']);
            exit;
        }
    } else {
        $check->close();
    }

    // hashing password
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // inserting user into db
    $stmt = $conn->prepare("INSERT INTO users (full_name, phone, password_hash, address, role) VALUES (?, ?, ?, ?, 'customer')");
    $stmt->bind_param("ssss", $full_name, $phone, $password_hash, $address);
    $stmt->execute();

    $user_id = $stmt->insert_id;
    $stmt->close();

    require_once __DIR__ . '/../../utils/jwt_helper.php';
    $payload = [
        'id' => $user_id,
        'phone' => $phone,
        'role' => 'customer'
    ];
    $token = generate_jwt($payload);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'token' => $token,
        'user' => [
            'id' => $user_id,
            'name' => $full_name,
            'full_name' => $full_name,
            'phone' => $phone,
            'address' => $address,
            'role' => 'customer'
        ]
    ]);

} catch (Exception $e) {
    error_log('Registration Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
}

$conn->close();
?>
