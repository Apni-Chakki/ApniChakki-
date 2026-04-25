<?php
// snap to road api proxy
require_once __DIR__ . '/config/cors.php';

header('Content-Type: application/json');

// google maps api key
$GOOGLE_API_KEY = 'AIzaSyCWahig5BwvtBYFbcPJozpnQqdFfXk2b5w';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Only GET allowed"]);
        exit;
    }

    $path = isset($_GET['path']) ? trim($_GET['path']) : '';
    $interpolate = isset($_GET['interpolate']) ? filter_var($_GET['interpolate'], FILTER_VALIDATE_BOOLEAN) : true;

    if (empty($path)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "path parameter is required (format: lat,lng|lat,lng)"]);
        exit;
    }

    // checking max points
    $points = explode('|', $path);
    if (count($points) > 100) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Maximum 100 points per request"]);
        exit;
    }

    // validating coordinates
    foreach ($points as $point) {
        $coords = explode(',', $point);
        if (count($coords) !== 2 || !is_numeric(trim($coords[0])) || !is_numeric(trim($coords[1]))) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid coordinate: {$point}. Expected format: lat,lng"]);
            exit;
        }
    }

    // calling google roads api
    $url = "https://roads.googleapis.com/v1/snapToRoads"
        . "?path=" . urlencode($path)
        . "&interpolate=" . ($interpolate ? 'true' : 'false')
        . "&key=" . $GOOGLE_API_KEY;

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER => ['Accept: application/json']
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
            "message" => "Roads API error",
            "error" => $data['error']['message'] ?? 'Unknown error',
            "status" => $data['error']['status'] ?? 'UNKNOWN'
        ]);
        exit;
    }

    // formatting the response
    $snappedPoints = [];
    if (isset($data['snappedPoints'])) {
        foreach ($data['snappedPoints'] as $point) {
            $snappedPoints[] = [
                'latitude' => $point['location']['latitude'],
                'longitude' => $point['location']['longitude'],
                'originalIndex' => $point['originalIndex'] ?? null,
                'placeId' => $point['placeId'] ?? null
            ];
        }
    }

    echo json_encode([
        "success" => true,
        "snappedPoints" => $snappedPoints,
        "count" => count($snappedPoints)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("snap_to_road.php error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}
?>
