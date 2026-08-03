<?php
// Route Optimization API Proxy
// Multiple deliveries ka optimal order calculate karta hai
// Project ID: thematic-fort-477106-n3

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$GOOGLE_API_KEY = getenv('GOOGLE_MAPS_API_KEY') ?: 'AIzaSyCWahig5BwvtBYFbcPJozpnQqdFfXk2b5w';
$PROJECT_ID = 'thematic-fort-477106-n3';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Only POST allowed"]);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    // Expected input: { "depot": { "lat": x, "lng": y }, "orders": [{ "id": 1, "lat": x, "lng": y, "address": "..." }, ...] }
    $depot = $input['depot'] ?? null;
    $orders = $input['orders'] ?? [];

    if (!$depot || empty($orders)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "depot and orders are required"]);
        exit;
    }

    if (count($orders) > 25) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Maximum 25 orders per optimization request"]);
        exit;
    }

    // Build Route Optimization API request body
    // depot = chakki/shop ka location (starting + ending point)
    // orders = delivery locations
    $shipments = [];
    foreach ($orders as $order) {
        $shipments[] = [
            "deliveries" => [[
                "arrivalLocation" => [
                    "latitude"  => (float)$order['lat'],
                    "longitude" => (float)$order['lng']
                ],
                "duration" => "120s"  // 2 minute per delivery estimate
            ]],
            "label" => "Order #" . ($order['id'] ?? 'N/A')
        ];
    }

    $requestBody = json_encode([
        "model" => [
            "shipments" => $shipments,
            "vehicles"  => [[
                "startLocation" => [
                    "latitude"  => (float)$depot['lat'],
                    "longitude" => (float)$depot['lng']
                ],
                "endLocation" => [
                    "latitude"  => (float)$depot['lat'],
                    "longitude" => (float)$depot['lng']
                ],
                "costPerKilometer" => 1.0,
                "label" => "Driver Vehicle"
            ]]
        ]
    ]);

    $url = "https://routeoptimization.googleapis.com/v1/projects/{$PROJECT_ID}:optimizeTours?key=" . $GOOGLE_API_KEY;

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $requestBody,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($requestBody)
        ]
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new Exception("cURL error: " . $curlError);
    }

    $data = json_decode($response, true);

    if ($httpCode !== 200) {
        http_response_code($httpCode);
        echo json_encode([
            "success" => false,
            "message" => $data['error']['message'] ?? "Route Optimization API error",
            "status"  => $data['error']['status'] ?? "UNKNOWN"
        ]);
        exit;
    }

    // Extract optimized visit order from response
    $optimizedOrder = [];
    if (isset($data['routes'][0]['visits'])) {
        foreach ($data['routes'][0]['visits'] as $visit) {
            $shipmentIdx = $visit['shipmentIndex'] ?? 0;
            if (isset($orders[$shipmentIdx])) {
                $optimizedOrder[] = $orders[$shipmentIdx];
            }
        }
    }

    // Calculate total metrics
    $totalDurationSec = 0;
    $totalDistanceM = 0;
    if (isset($data['routes'][0]['metrics'])) {
        $metrics = $data['routes'][0]['metrics'];
        $totalDurationSec = isset($metrics['totalDuration'])
            ? (int)rtrim($metrics['totalDuration'], 's')
            : 0;
        $totalDistanceM = $metrics['travelDistanceMeters'] ?? 0;
    }

    echo json_encode([
        "success"        => true,
        "optimizedOrder" => $optimizedOrder,
        "totalOrders"    => count($optimizedOrder),
        "totalDistanceKm"=> round($totalDistanceM / 1000, 1),
        "totalTimeMin"   => round($totalDurationSec / 60),
        "rawResponse"    => $data  // debug ke liye
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("optimize_routes.php error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}
?>
