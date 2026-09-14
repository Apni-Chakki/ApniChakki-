<?php
// get_vip_privileges.php
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $result = $conn->query("SELECT id, name, description, type, value, created_at FROM vip_privileges ORDER BY id ASC");
    $privileges = [];
    
    while ($row = $result->fetch_assoc()) {
        $privileges[] = [
            'id' => intval($row['id']),
            'name' => $row['name'],
            'description' => $row['description'],
            'type' => $row['type'],
            'value' => intval($row['value']),
            'created_at' => $row['created_at']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'privileges' => $privileges
    ]);

} catch (Exception $e) {
    error_log('Get VIP Privileges Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}

$conn->close();
?>
