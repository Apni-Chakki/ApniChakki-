<?php
// Connecting to the database
include_once __DIR__ . '/../../config/connect.php'; 

// Get the posted data
$data = json_decode(file_get_contents("php://input"));

// Verify all the data arrived safely
if (isset($data->base_fare) && isset($data->base_distance) && isset($data->per_km_rate)) {
    
    $base_fare = (int)$data->base_fare;
    $base_distance = (int)$data->base_distance;
    $per_km_rate = (int)$data->per_km_rate;

    // Update the single row in the delivery_settings table
    $query = "UPDATE delivery_settings SET base_fare = $base_fare, base_distance = $base_distance, per_km_rate = $per_km_rate";
    
    if (mysqli_query($conn, $query)) {
        echo json_encode(array("success" => true, "message" => "Delivery settings updated successfully."));
    } else {
        echo json_encode(array("success" => false, "message" => "Failed to update database."));
    }
} else {
    echo json_encode(array("success" => false, "message" => "Incomplete data sent."));
}
?>
