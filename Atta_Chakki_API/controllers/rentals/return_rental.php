<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/connect.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);

    // Validate required fields
    if (empty($data['rental_id'])) {
        echo json_encode(["success" => false, "message" => "Missing required field: rental_id"]);
        exit;
    }

    $rental_id = intval($data['rental_id']);
    $condition_notes = isset($data['condition_notes']) ? trim($data['condition_notes']) : '';
    $actual_return_date = isset($data['actual_return_date']) && !empty($data['actual_return_date'])
        ? $data['actual_return_date']
        : date('Y-m-d');

    // Look up the rental record
    $stmt = $conn->prepare("SELECT r.*, p.name AS product_name FROM rentals r JOIN products p ON r.product_id = p.id WHERE r.id = ?");
    $stmt->bind_param("i", $rental_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Rental not found"]);
        exit;
    }

    $rental = $result->fetch_assoc();
    $stmt->close();

    // Validate status
    if (!in_array($rental['status'], ['active', 'overdue'])) {
        echo json_encode(["success" => false, "message" => "Rental cannot be returned. Current status: " . $rental['status']]);
        exit;
    }

    // Calculate late days
    $end_date = new DateTime($rental['rental_end_date']);
    $return_date = new DateTime($actual_return_date);
    $diff = $return_date->diff($end_date);
    $late_days = 0;

    if ($return_date > $end_date) {
        $late_days = $diff->days;
    }

    // Calculate penalties and refund
    $late_penalty_per_day = floatval($rental['late_penalty_per_day']);
    $security_deposit = floatval($rental['security_deposit']);
    $late_penalty_total = $late_days * $late_penalty_per_day;
    $deposit_refund_amount = max(0, $security_deposit - $late_penalty_total);

    // Determine deposit_status
    if ($late_penalty_total <= 0) {
        $deposit_status = 'refunded';
    } elseif ($late_penalty_total >= $security_deposit) {
        $deposit_status = 'forfeited';
    } else {
        $deposit_status = 'partial_refund';
    }

    $quantity = intval($rental['quantity']);
    $product_id = intval($rental['product_id']);
    $order_id = intval($rental['order_id']);

    // Build notes
    $notes = '';
    if (!empty($rental['notes'])) {
        $notes = $rental['notes'] . "\n";
    }
    if (!empty($condition_notes)) {
        $notes .= "Return notes: " . $condition_notes;
    }
    if ($late_days > 0) {
        $notes .= ($notes ? "\n" : '') . "Late by $late_days day(s). Penalty: $late_penalty_total";
    }

    // Begin transaction
    $conn->begin_transaction();

    // Update rental record
    $stmt = $conn->prepare("UPDATE rentals SET status = 'returned', actual_return_date = ?, late_penalty_total = ?, deposit_refund_amount = ?, deposit_status = ?, notes = ?, updated_at = NOW() WHERE id = ?");
    $stmt->bind_param("sddssi", $actual_return_date, $late_penalty_total, $deposit_refund_amount, $deposit_status, $notes, $rental_id);
    $stmt->execute();
    $stmt->close();

    // Update order status
    $stmt = $conn->prepare("UPDATE orders SET status = 'rental_returned', updated_at = NOW() WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $stmt->close();

    // Increment rental_available_qty back on the product
    $stmt = $conn->prepare("UPDATE products SET rental_available_qty = rental_available_qty + ? WHERE id = ?");
    $stmt->bind_param("ii", $quantity, $product_id);
    $stmt->execute();
    $stmt->close();

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Rental returned successfully",
        "data" => [
            "rental_id" => $rental_id,
            "product_name" => $rental['product_name'],
            "actual_return_date" => $actual_return_date,
            "rental_end_date" => $rental['rental_end_date'],
            "late_days" => $late_days,
            "late_penalty_per_day" => $late_penalty_per_day,
            "late_penalty_total" => $late_penalty_total,
            "security_deposit" => $security_deposit,
            "deposit_refund_amount" => $deposit_refund_amount,
            "deposit_status" => $deposit_status
        ]
    ]);

} catch (Exception $e) {
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    echo json_encode(["success" => false, "message" => "Error processing rental return: " . $e->getMessage()]);
}
