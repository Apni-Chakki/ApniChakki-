<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$response = array("success" => false, "settings" => null);

try {
    $query = "SELECT base_fare, base_distance, per_km_rate FROM delivery_settings LIMIT 1";
    $result = $conn->query($query);

    if ($result && $result->num_rows > 0) {
        $settings = $result->fetch_assoc();
        
        $response["success"] = true;
        $response["settings"] = array(
            "base_fare" => (int)$settings['base_fare'],
            "base_distance" => (int)$settings['base_distance'],
            "per_km_rate" => (int)$settings['per_km_rate']
        );
    } else {
        // Return defaults if not found
        $response["success"] = true;
        $response["settings"] = array(
            "base_fare" => 50,
            "base_distance" => 10,
            "per_km_rate" => 10
        );
        $response["message"] = "Using default settings.";
    }
} catch (Exception $e) {
    http_response_code(500);
    $response["message"] = "Error: " . $e->getMessage();
}

echo json_encode($response);
?>
