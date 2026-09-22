<?php
// Connecting to the database
require_once __DIR__ . '/../../config/connect.php'; 
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_once __DIR__ . '/../../utils/cache_helper.php';

header('Content-Type: application/json');

$user = require_admin();

// Get the posted data
$data = json_decode(file_get_contents("php://input"));

// Verify all the data arrived safely
if (isset($data->base_fare) && isset($data->base_distance) && isset($data->per_km_rate)) {
    
    $base_fare = (int)$data->base_fare;
    $base_distance = (int)$data->base_distance;
    $per_km_rate = (int)$data->per_km_rate;

    // Update the single row in the delivery_settings table
    $stmt = $conn->prepare("UPDATE delivery_settings SET base_fare = ?, base_distance = ?, per_km_rate = ?");
    if ($stmt) {
        $stmt->bind_param("iii", $base_fare, $base_distance, $per_km_rate);
        if ($stmt->execute()) {
            clear_api_cache();
            echo json_encode(array("success" => true, "message" => "Delivery settings updated successfully."));
        } else {
            echo json_encode(array("success" => false, "message" => "Failed to update database."));
        }
        $stmt->close();
    } else {
        echo json_encode(array("success" => false, "message" => "Database prepare error."));
    }
} else {
    echo json_encode(array("success" => false, "message" => "Incomplete data sent."));
}

?>
