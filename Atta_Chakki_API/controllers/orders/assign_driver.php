<?php
// assign driver to order
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['order_id']) || !isset($data['driver_name'])) {
    echo json_encode(["success" => false, "message" => "Missing order_id or driver_name"]);
    exit;
}

$order_id    = intval($data['order_id']);
$driver_name = $data['driver_name'];
$driver_phone = isset($data['driver_phone']) ? $data['driver_phone'] : null;

// checking if order exists
$check = $conn->prepare("SELECT id, status FROM orders WHERE id = ?");
$check->bind_param("i", $order_id);
$check->execute();
$result = $check->get_result();
if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Order not found"]);
    $check->close();
    exit;
}
$order = $result->fetch_assoc();
$check->close();

// get driver phone if not provided
if (!$driver_phone && $driver_name !== '') {
    $driverCheck = $conn->prepare("SELECT phone FROM delivery_personnel WHERE name = ?");
    $driverCheck->bind_param("s", $driver_name);
    $driverCheck->execute();
    $dResult = $driverCheck->get_result();
    if ($dResult->num_rows > 0) {
        $driver_phone = $dResult->fetch_assoc()['phone'];
    }
    $driverCheck->close();
}

$current_status = $order['status'];
$new_status = $current_status;

if ($driver_name !== '') {
    // Determine new status when assigning driver
    if ($current_status === 'pickup_pending') {
        $new_status = 'pickup_assigned';
    } else if (in_array($current_status, ['pending', 'processing', 'ready'])) {
        $new_status = 'out-for-delivery';
    }
}

// assigning driver
$stmt = $conn->prepare("UPDATE orders SET driver_name = ?, driver_phone = ?, status = ? WHERE id = ?");
$stmt->bind_param("sssi", $driver_name, $driver_phone, $new_status, $order_id);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Driver '$driver_name' assigned to order #$order_id",
        "new_status" => $new_status
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Database Error: " . $stmt->error]);
}

$stmt->close();
