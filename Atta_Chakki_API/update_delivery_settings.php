<?php
// 1. Allow any website (or port) to talk to this file
header("Access-Control-Allow-Origin: *");
// 2. Allow POST requests and the "ghost" OPTIONS preflight request
header("Access-Control-Allow-Methods: POST, OPTIONS");
// 3. Allow JSON data to be sent
header("Access-Control-Allow-Headers: Content-Type");

// 4. If this is just the "ghost" preflight request, say OK and stop here.
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Connecting to the database
include_once 'config/connect.php'; 

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