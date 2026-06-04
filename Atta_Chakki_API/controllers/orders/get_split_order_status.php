<?php
// get_split_order_status controller logic
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    $parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : 0;
    $order_id  = isset($_GET['order_id'])  ? intval($_GET['order_id'])  : 0;

    // If order_id given, find its parent (it may itself be a child)
    if ($order_id > 0 && $parent_id === 0) {
        $chk = $conn->prepare("SHOW COLUMNS FROM orders LIKE 'parent_order_id'");
        $chk->execute();
        $hasCol = $chk->get_result()->num_rows > 0;
        $chk->close();

        if ($hasCol) {
            $s = $conn->prepare("SELECT parent_order_id FROM orders WHERE id = ?");
            $s->bind_param("i", $order_id);
            $s->execute();
            $row = $s->get_result()->fetch_assoc();
            $s->close();

            if ($row && $row['parent_order_id']) {
                $parent_id = intval($row['parent_order_id']);
            } else {
                // This order itself is a parent — check for children
                $parent_id = $order_id;
            }
        }
    }

    if ($parent_id === 0) {
        echo json_encode(["success" => false, "message" => "No parent_id or order_id provided"]);
        exit;
    }

    // Check if parent_order_id column exists
    $chk = $conn->query("SHOW COLUMNS FROM orders LIKE 'parent_order_id'");
    if (!$chk || $chk->num_rows === 0) {
        echo json_encode([
            "success"     => true,
            "is_split"    => false,
            "all_ready"   => false,
            "batches"     => [],
            "message"     => "Split feature not yet migrated"
        ]);
        exit;
    }

    // Get all child batches
    $stmt = $conn->prepare("SELECT id, status, assigned_date, batch_index, total_weight_kg, total_amount FROM orders WHERE parent_order_id = ? ORDER BY batch_index ASC");
    $stmt->bind_param("i", $parent_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();

    $batches = [];
    while ($row = $result->fetch_assoc()) {
        $batches[] = $row;
    }

    $all_ready = count($batches) > 0 && count(array_filter($batches, fn($b) => $b['status'] === 'ready')) === count($batches);
    $all_complete = count($batches) > 0 && count(array_filter($batches, fn($b) => in_array($b['status'], ['ready', 'completed']))) === count($batches);

    echo json_encode([
        "success"      => true,
        "is_split"     => count($batches) > 0,
        "parent_id"    => $parent_id,
        "all_ready"    => $all_ready,
        "all_complete" => $all_complete,
        "batch_count"  => count($batches),
        "batches"      => $batches
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
