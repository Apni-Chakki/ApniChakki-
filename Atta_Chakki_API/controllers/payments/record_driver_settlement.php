<?php
// record_driver_settlement.php - Admin records COD payment received from driver
include __DIR__ . '/../../config/cors.php';
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);

    $order_id     = isset($data['order_id']) ? intval($data['order_id']) : null;
    $driver_phone = isset($data['driver_phone']) ? trim($data['driver_phone']) : '';
    $driver_name  = isset($data['driver_name']) ? trim($data['driver_name']) : '';
    $amount       = isset($data['amount']) ? floatval($data['amount']) : 0.0;

    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Amount must be greater than 0"]);
        exit;
    }

    $conn->begin_transaction();

    // Mode 1: Settle specific Order ID
    if ($order_id) {
        $stmt = $conn->prepare("
            SELECT id, total_amount, payment_status, driver_name, driver_phone,
                   COALESCE((SELECT SUM(amount) FROM payments WHERE order_id = orders.id), COALESCE(amount_paid, 0)) as amount_paid
            FROM orders
            WHERE id = ? AND status <> 'cancelled'
        ");
        $stmt->bind_param("i", $order_id);
        $stmt->execute();
        $orderRes = $stmt->get_result();
        
        if ($orderRes->num_rows === 0) {
            throw new Exception("Order #$order_id not found or is cancelled.");
        }
        $order = $orderRes->fetch_assoc();
        $stmt->close();

        $totalAmount = (float)$order['total_amount'];
        $alreadyPaid = (float)$order['amount_paid'];
        $outstanding = max(0, $totalAmount - $alreadyPaid);

        if ($outstanding <= 0) {
            throw new Exception("Order #$order_id is already fully paid.");
        }

        $paymentAmount = min($amount, $outstanding);
        $driverLabel = !empty($order['driver_name']) ? $order['driver_name'] : ($driver_name ?: 'Driver');

        // Insert payment record
        $description = "COD cash collected from driver {$driverLabel} for order #{$order_id}";
        $payStmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, description, created_at) VALUES (?, ?, 'cash', ?, NOW())");
        $payStmt->bind_param("ids", $order_id, $paymentAmount, $description);
        if (!$payStmt->execute()) {
            throw new Exception("Failed to insert payment: " . $payStmt->error);
        }
        $payStmt->close();

        // Update order status
        $newTotalPaid = $alreadyPaid + $paymentAmount;
        $newStatus = ($newTotalPaid >= $totalAmount) ? 'paid' : 'partial';

        $updStmt = $conn->prepare("UPDATE orders SET payment_status = ?, amount_paid = ?, updated_at = NOW() WHERE id = ?");
        $updStmt->bind_param("sdi", $newStatus, $newTotalPaid, $order_id);
        if (!$updStmt->execute()) {
            throw new Exception("Failed to update order: " . $updStmt->error);
        }
        $updStmt->close();

        $conn->commit();

        echo json_encode([
            "success" => true,
            "message" => "Payment of Rs. " . number_format($paymentAmount, 2) . " for order #{$order_id} recorded successfully",
            "order_id" => $order_id,
            "amount_settled" => $paymentAmount,
            "payment_status" => $newStatus
        ]);
        exit;
    }

    // Mode 2: Lump-sum settlement for a Driver across their pending orders
    if (empty($driver_phone) && empty($driver_name)) {
        throw new Exception("Driver phone or name is required for batch settlement.");
    }

    // Find driver pending orders
    $ordersSql = "
        SELECT id, total_amount,
               COALESCE((SELECT SUM(amount) FROM payments WHERE order_id = orders.id), COALESCE(amount_paid, 0)) as amount_paid
        FROM orders
        WHERE (driver_phone = ? OR driver_name = ?)
          AND payment_status IN ('pending', 'partial')
          AND status <> 'cancelled'
        ORDER BY created_at ASC
    ";
    $stmt = $conn->prepare($ordersSql);
    $stmt->bind_param("ss", $driver_phone, $driver_name);
    $stmt->execute();
    $orders = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    if (empty($orders)) {
        throw new Exception("No pending cash orders found for driver {$driver_name}.");
    }

    $remainingAmount = $amount;
    $settledOrdersCount = 0;
    $driverLabel = $driver_name ?: $driver_phone;

    foreach ($orders as $ord) {
        if ($remainingAmount <= 0) break;

        $ordId       = (int)$ord['id'];
        $totalAmount = (float)$ord['total_amount'];
        $alreadyPaid = (float)$ord['amount_paid'];
        $outstanding = max(0, $totalAmount - $alreadyPaid);

        if ($outstanding <= 0) continue;

        $payPortion = min($remainingAmount, $outstanding);
        $description = "Driver {$driverLabel} cash settlement for order #{$ordId}";

        // Record payment
        $payStmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, description, created_at) VALUES (?, ?, 'cash', ?, NOW())");
        $payStmt->bind_param("ids", $ordId, $payPortion, $description);
        if (!$payStmt->execute()) {
            throw new Exception("Failed to insert payment: " . $payStmt->error);
        }
        $payStmt->close();

        // Update order status
        $newTotalPaid = $alreadyPaid + $payPortion;
        $newStatus = ($newTotalPaid >= $totalAmount) ? 'paid' : 'partial';

        $updStmt = $conn->prepare("UPDATE orders SET payment_status = ?, amount_paid = ?, updated_at = NOW() WHERE id = ?");
        $updStmt->bind_param("sdi", $newStatus, $newTotalPaid, $ordId);
        if (!$updStmt->execute()) {
            throw new Exception("Failed to update order status: " . $updStmt->error);
        }
        $updStmt->close();

        $remainingAmount -= $payPortion;
        $settledOrdersCount++;
    }

    $conn->commit();

    $actualSettled = $amount - $remainingAmount;

    require_once __DIR__ . '/../../utils/cache_helper.php';
    clear_api_cache();

    echo json_encode([
        "success" => true,
        "message" => "Driver settlement of Rs. " . number_format($actualSettled, 2) . " across {$settledOrdersCount} orders recorded successfully",
        "amount_settled" => $actualSettled,
        "orders_count" => $settledOrdersCount
    ]);

} catch (Exception $e) {
    if ($conn) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Settlement error: " . $e->getMessage()
    ]);
}
