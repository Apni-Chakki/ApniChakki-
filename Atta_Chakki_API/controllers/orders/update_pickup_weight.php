<?php
/* 
 * Controller: update actual weights for pickup items, recalc order totals and schedule
 */
include __DIR__ . '/../../config/connect.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_driver_or_admin();


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

    // recalc items subtotal from order_items
    $tot_stmt = $conn->prepare("SELECT COALESCE(SUM(quantity * price_at_purchase),0) as items_total FROM order_items WHERE order_id = ?");
    $tot_stmt->bind_param("i", $order_id);
    $tot_stmt->execute();
    $res = $tot_stmt->get_result();
    $row = $res->fetch_assoc();
    $items_subtotal = floatval($row['items_total']);
    $tot_stmt->close();

    // fetch order delivery_fee and coupon_discount
    $ord_stmt = $conn->prepare("SELECT delivery_fee, coupon_discount FROM orders WHERE id = ?");
    $ord_stmt->bind_param("i", $order_id);
    $ord_stmt->execute();
    $ord_res = $ord_stmt->get_result();
    $ord_row = $ord_res->fetch_assoc();
    $delivery_fee = floatval($ord_row['delivery_fee'] ?? 0);
    $coupon_discount = floatval($ord_row['coupon_discount'] ?? 0);
    $ord_stmt->close();

    // calculate full new total = items_subtotal + delivery_fee - coupon_discount
    $new_total = max(0, round($items_subtotal + $delivery_fee - $coupon_discount));

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

    require_once __DIR__ . '/../../utils/cache_helper.php';
    clear_api_cache();

    echo json_encode([
        'success' => true,
        'message' => 'Weights updated and order scheduled',
        'new_total' => $new_total,
        'items_subtotal' => $items_subtotal,
        'delivery_fee' => $delivery_fee,
        'schedule' => $schedule_result
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

?>
