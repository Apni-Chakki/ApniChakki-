<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

try {
    $data = json_decode(file_get_contents("php://input"));

    if (isset($data->base_fare) && isset($data->base_distance) && isset($data->per_km_rate)) {
        
        $base_fare = (int)$data->base_fare;
        $base_distance = (int)$data->base_distance;
        $per_km_rate = (int)$data->per_km_rate;

        // Ensure at least one row exists
        $check = $conn->query("SELECT id FROM delivery_settings LIMIT 1");
        if ($check->num_rows === 0) {
            $query = "INSERT INTO delivery_settings (base_fare, base_distance, per_km_rate) VALUES (?, ?, ?)";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("iii", $base_fare, $base_distance, $per_km_rate);
        } else {
            $query = "UPDATE delivery_settings SET base_fare = ?, base_distance = ?, per_km_rate = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("iii", $base_fare, $base_distance, $per_km_rate);
        }
        
        if ($stmt->execute()) {
            echo json_encode(array("success" => true, "message" => "Delivery settings updated successfully."));
        } else {
            throw new Exception("Database update failed: " . $stmt->error);
        }
    } else {
        echo json_encode(array("success" => false, "message" => "Incomplete data sent."));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "message" => $e->getMessage()));
}
?>
