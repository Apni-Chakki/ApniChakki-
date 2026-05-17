<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json; charset=UTF-8");

// Update this path if your database connection file is named differently
include_once 'config/connect.php';

$response = array("success" => false, "settings" => null);

try {
    // We only need the first row, as there's only one set of delivery rules
    $query = "SELECT base_fare, base_distance, per_km_rate FROM delivery_settings LIMIT 1";
    $result = mysqli_query($conn, $query);

    if (mysqli_num_rows($result) > 0) {
        $settings = mysqli_fetch_assoc($result);
        
        $response["success"] = true;
        $response["settings"] = array(
            "base_fare" => (int)$settings['base_fare'],
            "base_distance" => (int)$settings['base_distance'],
            "per_km_rate" => (int)$settings['per_km_rate']
        );
    } else {
        $response["message"] = "No delivery settings found in database.";
    }
} catch (Exception $e) {
    $response["message"] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>