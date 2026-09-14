<?php
// Google Geolocation API Proxy
// WiFi + Cell Tower se accurate location nikalne ke liye (browser GPS se fast & indoor mein bhi kaam karta hai)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$GOOGLE_API_KEY = getenv('GOOGLE_MAPS_API_KEY') ?: 'AIzaSyCWahig5BwvtBYFbcPJozpnQqdFfXk2b5w';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Only POST allowed"]);
        exit;
    }

    // Google Geolocation API request body — empty body ek valid request hai
    // Google automatically WiFi/cell tower info use karta hai server side pe
    $requestBody = json_encode([
        "considerIp" => true
    ]);

    $url = "https://www.googleapis.com/geolocation/v1/geolocate?key=" . $GOOGLE_API_KEY;

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
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

    if ($httpCode === 200 && isset($data['location'])) {
        echo json_encode([
            "success"  => true,
            "lat"      => $data['location']['lat'],
            "lng"      => $data['location']['lng'],
            "accuracy" => $data['accuracy'] ?? 1000,
            "source"   => "google_geolocation"
        ]);
    } else {
        // Google API error response forward karo frontend ko
        http_response_code($httpCode ?: 500);
        echo json_encode([
            "success" => false,
            "message" => $data['error']['message'] ?? "Google Geolocation failed",
            "status"  => $data['error']['status'] ?? "UNKNOWN"
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    error_log("geolocation.php error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}
?>
