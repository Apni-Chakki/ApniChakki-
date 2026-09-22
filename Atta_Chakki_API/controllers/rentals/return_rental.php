<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../utils/cache_helper.php';
require_once __DIR__ . '/../../utils/auth_middleware.php';

$user = require_admin();

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

    $quantity = intval($rental['quantity']);
    $already_returned = intval($rental['returned_quantity'] ?? 0);
    $remaining_qty = max(0, $quantity - $already_returned);

    if ($remaining_qty <= 0) {
        echo json_encode(["success" => false, "message" => "All items for this rental have already been returned"]);
        exit;
    }

    $returned_quantity = isset($data['returned_quantity']) ? intval($data['returned_quantity']) : $remaining_qty;
    if ($returned_quantity <= 0 || $returned_quantity > $remaining_qty) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid returned quantity: $returned_quantity. Must be between 1 and $remaining_qty"
        ]);
        exit;
    }

    $is_lost = !empty($data['is_lost']);
    $amount_collected = isset($data['amount_collected']) ? max(0, floatval($data['amount_collected'])) : 0.0;

    // Calculate late days
    $end_date = new DateTime($rental['rental_end_date']);
    $return_date = new DateTime($actual_return_date);
    $diff = $return_date->diff($end_date);
    $late_days = 0;

    if ($return_date > $end_date) {
        $late_days = $diff->days;
    }

    $late_penalty_per_day = floatval($rental['late_penalty_per_day']);
    $unit_security_deposit = floatval($rental['security_deposit']);
    $returned_deposit_subtotal = $unit_security_deposit * $returned_quantity;
    $late_penalty_total = $late_days * $late_penalty_per_day;

    $new_returned_total = $already_returned + $returned_quantity;
    $is_full_return = ($new_returned_total >= $quantity);

    if ($is_lost) {
        // Lost item: Security deposit is completely forfeited by the customer
        $current_deposit_refund = 0;
        $deposit_status = 'forfeited';
        $new_total_refund = floatval($rental['deposit_refund_amount'] ?? 0);
        $new_total_penalty = floatval($rental['late_penalty_total'] ?? 0);
        $rental_status = $is_full_return ? 'returned' : 'active';
    } else {
        // Normal return: calculate refund minus penalties
        $current_deposit_refund = max(0, $returned_deposit_subtotal - $late_penalty_total);
        $new_total_refund = floatval($rental['deposit_refund_amount'] ?? 0) + $current_deposit_refund;
        $new_total_penalty = floatval($rental['late_penalty_total'] ?? 0) + $late_penalty_total;

        if ($is_full_return) {
            $rental_status = 'returned';
            if ($new_total_penalty <= 0) {
                $deposit_status = 'refunded';
            } elseif ($new_total_refund <= 0) {
                $deposit_status = 'forfeited';
            } else {
                $deposit_status = 'partial_refund';
            }
        } else {
            $rental_status = 'active';
            $deposit_status = 'partial_refund';
        }
    }

    $product_id = intval($rental['product_id']);
    $order_id = intval($rental['order_id']);

    // Build notes
    $notes = '';
    if (!empty($rental['notes'])) {
        $notes = $rental['notes'] . "\n";
    }

    if ($is_lost) {
        $notes .= "[" . date('Y-m-d H:i') . "] [LOST/MISPLACED] $returned_quantity unit(s) permanently lost. Security deposit forfeited (Rs. $returned_deposit_subtotal kept as store recovery).";
        if ($amount_collected > 0) {
            $notes .= " Additional compensation received: Rs. $amount_collected.";
        }
    } else {
        $notes .= "[" . date('Y-m-d H:i') . "] Returned $returned_quantity unit(s). Refund: Rs. $current_deposit_refund.";
        if ($late_days > 0) {
            $notes .= " (Late: $late_days day(s), Penalty: Rs. $late_penalty_total)";
        }
    }
    if (!empty($condition_notes)) {
        $notes .= " Notes: " . $condition_notes;
    }

    // Begin transaction
    $conn->begin_transaction();

    // Update rental record
    $stmt = $conn->prepare("UPDATE rentals SET status = ?, returned_quantity = ?, actual_return_date = ?, late_penalty_total = ?, deposit_refund_amount = ?, deposit_status = ?, notes = ?, updated_at = NOW() WHERE id = ?");
    $stmt->bind_param("sisddssi", $rental_status, $new_returned_total, $actual_return_date, $new_total_penalty, $new_total_refund, $deposit_status, $notes, $rental_id);
    $stmt->execute();
    $stmt->close();

    // If all items are accounted for (returned or lost), update order status
    if ($is_full_return) {
        if ($is_lost) {
            // If lost compensation was collected, add to order total and record payment
            if ($amount_collected > 0) {
                $stmt = $conn->prepare("UPDATE orders SET total_amount = total_amount + ?, amount_paid = amount_paid + ?, status = 'completed', payment_status = 'paid', updated_at = NOW() WHERE id = ?");
                $stmt->bind_param("ddi", $amount_collected, $amount_collected, $order_id);
                $stmt->execute();
                $stmt->close();

                // Insert into payments table so financial analytics picks up the compensation
                $pay_desc = "Lost item compensation for {$rental['product_name']} (Rental #$rental_id)";
                $trans_id = "LOST-{$rental_id}-" . time();
                $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, description, transaction_id, created_at, updated_at) VALUES (?, ?, 'cash', ?, ?, NOW(), NOW())");
                $pay_stmt->bind_param("idss", $order_id, $amount_collected, $pay_desc, $trans_id);
                $pay_stmt->execute();
                $pay_stmt->close();
            } else {
                $stmt = $conn->prepare("UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = ?");
                $stmt->bind_param("i", $order_id);
                $stmt->execute();
                $stmt->close();
            }
        } else {
            $stmt = $conn->prepare("UPDATE orders SET status = 'rental_returned', updated_at = NOW() WHERE id = ?");
            $stmt->bind_param("i", $order_id);
            $stmt->execute();
            $stmt->close();
        }
    }

    // ONLY increment rental_available_qty and stock_quantity if the item was ACTUALLY returned (not lost)
    if (!$is_lost) {
        $stmt = $conn->prepare("UPDATE products SET rental_available_qty = rental_available_qty + ?, stock_quantity = GREATEST(0, stock_quantity + ?) WHERE id = ?");
        $stmt->bind_param("iii", $returned_quantity, $returned_quantity, $product_id);
        $stmt->execute();
        $stmt->close();
    }

    $conn->commit();
    clear_api_cache();

    echo json_encode([
        "success" => true,
        "message" => $is_lost ? "Lost item settlement processed successfully" : "Rental return processed successfully",
        "data" => [
            "rental_id" => $rental_id,
            "product_name" => $rental['product_name'],
            "is_lost" => $is_lost,
            "amount_collected" => $amount_collected,
            "returned_quantity" => $returned_quantity,
            "total_returned_quantity" => $new_returned_total,
            "total_quantity" => $quantity,
            "remaining_quantity" => max(0, $quantity - $new_returned_total),
            "is_full_return" => $is_full_return,
            "actual_return_date" => $actual_return_date,
            "unit_security_deposit" => $unit_security_deposit,
            "deposit_refund_amount" => $current_deposit_refund,
            "total_deposit_refunded" => $new_total_refund,
            "deposit_status" => $deposit_status,
            "rental_status" => $rental_status
        ]
    ]);

} catch (Exception $e) {
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    echo json_encode(["success" => false, "message" => "Error processing rental return: " . $e->getMessage()]);
}
