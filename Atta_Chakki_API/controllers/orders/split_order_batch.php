<?php
// split_order_batch.php
// Splits a heavy order into today + tomorrow batches
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/order_scheduler.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);

    // Validate input
    // Expected: { order_id: int, batches: [ { weight: float, date: 'today'|'tomorrow' }, ... ] }
    if (!isset($data['order_id']) || !isset($data['batches']) || !is_array($data['batches'])) {
        throw new Exception("Missing order_id or batches array.");
    }

    $order_id = intval($data['order_id']);
    $batches  = $data['batches']; // Each batch: { weight: float, date: 'today'|'tomorrow' }

    if (count($batches) < 1) {
        throw new Exception("At least one batch is required.");
    }

    // ── 1. Get original order details ──────────────────────────────────────────
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $origOrder = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$origOrder) {
        throw new Exception("Original order not found.");
    }

    // Prevent double-splitting
    if ($origOrder['status'] === 'split_parent') {
        throw new Exception("Order #$order_id is already split.");
    }

    // ── 2. Get processing speed from settings ─────────────────────────────────
    $hours = getOperationalHours($conn);
    $processing_speed = floatval($hours['processing_time_per_kg'] ?? 2);

    // ── 3. Mark original order as split_parent ────────────────────────────────
    $conn->begin_transaction();

    $upd = $conn->prepare("UPDATE orders SET status = 'split_parent', updated_at = NOW() WHERE id = ?");
    $upd->bind_param("i", $order_id);
    $upd->execute();
    $upd->close();

    // ── 4. Create child orders ─────────────────────────────────────────────────
    $today    = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    $new_ids  = [];

    // Ensure parent_order_id and batch_index columns exist (graceful fallback)
    $colCheck = $conn->query("SHOW COLUMNS FROM orders LIKE 'parent_order_id'");
    $hasParentCol = ($colCheck && $colCheck->num_rows > 0);

    $colCheck2 = $conn->query("SHOW COLUMNS FROM orders LIKE 'batch_index'");
    $hasBatchCol = ($colCheck2 && $colCheck2->num_rows > 0);

    foreach ($batches as $index => $batch) {
        $batch_weight = floatval($batch['weight'] ?? 0);
        $raw_date = $batch['date'] ?? 'today';
        if ($raw_date === 'today') {
            $batch_date = $today;
        } else if ($raw_date === 'tomorrow') {
            $batch_date = $tomorrow;
        } else {
            $batch_date = date('Y-m-d', strtotime($raw_date));
        }
        $batch_number = $index + 1;

        if ($batch_weight <= 0) continue; // skip zero-weight batches

        $batch_mins = ceil($batch_weight * $processing_speed);

        // Calculate proportional total_amount for this batch
        $orig_weight = floatval($origOrder['total_weight_kg'] ?? 0);
        if ($orig_weight > 0) {
            $batch_amount = ($batch_weight / $orig_weight) * floatval($origOrder['total_amount']);
        } else {
            $batch_amount = floatval($origOrder['total_amount']) / count($batches);
        }
        $batch_amount = round($batch_amount, 2);

        // Build INSERT depending on available columns
        if ($hasParentCol && $hasBatchCol) {
            $insSql = "INSERT INTO orders (
                user_id, total_amount, amount_paid, status, shipping_address,
                payment_method, payment_status, created_at, assigned_date,
                total_weight_kg, processing_time_minutes, parent_order_id, batch_index,
                special_instructions, driver_name, driver_phone, source
            ) VALUES (?, ?, 0, 'processing', ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $insStmt = $conn->prepare($insSql);
            $insStmt->bind_param(
                "idsssssdiissss",
                $origOrder['user_id'],
                $batch_amount,
                $origOrder['shipping_address'],
                $origOrder['payment_method'],
                $origOrder['payment_status'],
                $batch_date,
                $batch_weight,
                $batch_mins,
                $order_id,
                $batch_number,
                $origOrder['special_instructions'],
                $origOrder['driver_name'],
                $origOrder['driver_phone'],
                $origOrder['source']
            );
        } else {
            // Fallback without parent columns
            $insSql = "INSERT INTO orders (
                user_id, total_amount, amount_paid, status, shipping_address,
                payment_method, payment_status, created_at, assigned_date,
                total_weight_kg, processing_time_minutes, source
            ) VALUES (?, ?, 0, 'processing', ?, ?, ?, NOW(), ?, ?, ?, ?)";

            $insStmt = $conn->prepare($insSql);
            $insStmt->bind_param(
                "idsssssdis",
                $origOrder['user_id'],
                $batch_amount,
                $origOrder['shipping_address'],
                $origOrder['payment_method'],
                $origOrder['payment_status'],
                $batch_date,
                $batch_weight,
                $batch_mins,
                $origOrder['source']
            );
        }

        if (!$insStmt->execute()) {
            throw new Exception("Failed to create batch #$batch_number: " . $insStmt->error);
        }

        $new_order_id = $conn->insert_id;
        $insStmt->close();
        $new_ids[] = [
            'id'    => $new_order_id,
            'date'  => $batch_date,
            'index' => $batch_number,
            'weight'=> $batch_weight
        ];

        // Copy order items to child batch
        $itemRes = $conn->query("SELECT product_id, quantity, price_at_purchase FROM order_items WHERE order_id = $order_id");
        if ($itemRes) {
            $itemInsStmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)");
            while ($item = $itemRes->fetch_assoc()) {
                // Proportional quantity for this batch
                $orig_qty = floatval($item['quantity']);
                if ($orig_weight > 0) {
                    $batch_qty = round(($batch_weight / $orig_weight) * $orig_qty, 3);
                } else {
                    $batch_qty = $orig_qty / count($batches);
                }
                $itemInsStmt->bind_param("iidd", $new_order_id, $item['product_id'], $batch_qty, $item['price_at_purchase']);
                $itemInsStmt->execute();
            }
            $itemInsStmt->close();
        }

        // Auto-schedule this batch
        scheduleOrder($conn, $new_order_id);
    }

    $conn->commit();

    echo json_encode([
        "success"         => true,
        "message"         => count($new_ids) . " batch(es) created and scheduled successfully.",
        "parent_order_id" => $order_id,
        "batches"         => $new_ids
    ]);

} catch (Exception $e) {
    if (isset($conn) && $conn->in_transaction ?? false) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
