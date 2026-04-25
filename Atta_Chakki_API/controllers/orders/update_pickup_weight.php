<?php
/**
 * Controller: update actual weights for pickup items, recalc order totals and schedule
 */
include __DIR__ . '/../../config/connect.php';
header('Content-Type: application/json');

$raw = file_get_contents('php://input');
$data = json_decode($raw);

if (!$data || !isset($data->order_id) || !isset($data->items) || !is_array($data->items)) {
    echo json_encode(["success" => false, "message" => "Invalid payload"]);
    exit;
}

$order_id = intval($data->order_id);
$items = $data->items; // expect array of {order_item_id, actual_weight_kg}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn->begin_transaction();

    // update each order_item quantity
    $update_stmt = $conn->prepare("UPDATE order_items SET quantity = ? WHERE id = ? AND order_id = ?");
    foreach ($items as $it) {
        $item_id = isset($it->order_item_id) ? intval($it->order_item_id) : 0;
        $actual_w = isset($it->actual_weight_kg) ? floatval($it->actual_weight_kg) : 0;

        if ($item_id <= 0 || $actual_w <= 0) {
            throw new Exception("Invalid item payload");
        }

        $update_stmt->bind_param("dii", $actual_w, $item_id, $order_id);
        if (!$update_stmt->execute()) {
            throw new Exception("Failed updating item weight for item: " . $item_id);
        }
    }
    $update_stmt->close();

    // recalc total_amount from order_items
    $tot_stmt = $conn->prepare("SELECT COALESCE(SUM(quantity * price_at_purchase),0) as total FROM order_items WHERE order_id = ?");
    $tot_stmt->bind_param("i", $order_id);
    $tot_stmt->execute();
    $res = $tot_stmt->get_result();
    $row = $res->fetch_assoc();
    $new_total = floatval($row['total']);
    $tot_stmt->close();

    // update orders total_amount
    $upd_order = $conn->prepare("UPDATE orders SET total_amount = ?, updated_at = NOW() WHERE id = ?");
    $upd_order->bind_param("di", $new_total, $order_id);
    if (!$upd_order->execute()) {
        throw new Exception("Failed updating order total");
    }
    $upd_order->close();

    // call scheduler to assign date/time and update order's weight/processing time
    require_once __DIR__ . '/order_scheduler.php';
    $schedule_result = scheduleOrder($conn, $order_id);

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Weights updated and order scheduled',
        'schedule' => $schedule_result
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

?>
