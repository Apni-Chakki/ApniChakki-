<?php
// add expense api
include __DIR__ . '/../../config/connect.php';

$data = json_decode(file_get_contents("php://input"), true);

// checking required fields
if (
    !isset($data['user_id']) || 
    !isset($data['category']) || 
    !isset($data['amount']) || 
    !isset($data['expense_time'])
) {
    echo json_encode(["success" => false, "message" => "Missing required data"]);
    exit;
}

$user_id = intval($data['user_id']);
$category = $conn->real_escape_string($data['category']);
$amount = floatval($data['amount']);
$description = isset($data['description']) ? $conn->real_escape_string($data['description']) : null;
$expense_time = $conn->real_escape_string($data['expense_time']);

// inserting expense
$stmt = $conn->prepare("INSERT INTO expenses (user_id, category, amount, description, expense_time) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("isdss", $user_id, $category, $amount, $description, $expense_time);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Expense recorded successfully!"]);
} else {
    echo json_encode(["success" => false, "message" => "Database error: " . $stmt->error]);
}

$stmt->close();
