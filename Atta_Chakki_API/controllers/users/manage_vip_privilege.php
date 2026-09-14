<?php
// manage_vip_privilege.php
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();


$method = $_SERVER['REQUEST_METHOD'];

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Resolve the action
    $action = strtolower($input['action'] ?? '');
    if (empty($action)) {
        if ($method === 'POST') {
            $action = 'create';
        } elseif ($method === 'PUT') {
            $action = 'edit';
        } elseif ($method === 'DELETE') {
            $action = 'delete';
        }
    }

    if (!in_array($action, ['create', 'edit', 'delete'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action. Must be create, edit, or delete.']);
        exit;
    }

    if ($action === 'create') {
        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $type = trim($input['type'] ?? 'custom'); // e.g. discount, free_shipping, custom
        $value = intval($input['value'] ?? 0);

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Privilege name is required.']);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO vip_privileges (name, description, type, value) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("sssi", $name, $description, $type, $value);
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'VIP Privilege created successfully.',
                'privilege_id' => $stmt->insert_id
            ]);
        } else {
            throw new Exception("Failed to insert privilege: " . $stmt->error);
        }
        $stmt->close();

    } elseif ($action === 'edit') {
        $id = intval($input['id'] ?? 0);
        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $type = trim($input['type'] ?? 'custom');
        $value = intval($input['value'] ?? 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid Privilege ID is required.']);
            exit;
        }
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Privilege name is required.']);
            exit;
        }

        $stmt = $conn->prepare("UPDATE vip_privileges SET name = ?, description = ?, type = ?, value = ? WHERE id = ?");
        $stmt->bind_param("sssii", $name, $description, $type, $value, $id);
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'VIP Privilege updated successfully.'
            ]);
        } else {
            throw new Exception("Failed to update privilege: " . $stmt->error);
        }
        $stmt->close();

    } elseif ($action === 'delete') {
        $id = intval($input['id'] ?? 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid Privilege ID is required.']);
            exit;
        }

        // Prevent deleting system critical privileges if they are default ones, or allow it but caution
        // Let's just allow it since the admin wants total control (create, edit, delete)
        $stmt = $conn->prepare("DELETE FROM vip_privileges WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'VIP Privilege deleted successfully.'
            ]);
        } else {
            throw new Exception("Failed to delete privilege: " . $stmt->error);
        }
        $stmt->close();
    }

} catch (Exception $e) {
    error_log('Manage VIP Privilege Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}

$conn->close();
?>
