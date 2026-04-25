<?php
/**
 * API Endpoint Diagnostics
 * Tests all critical endpoints for CORS headers and JSON responses
 */

$baseUrl = 'http://localhost/atta_chakki_api';

$endpoints = [
    'login.php' => ['POST'],
    'register.php' => ['POST'],
    'get_products.php' => ['GET'],
    'get_categories.php' => ['GET'],
    'get_store_settings.php' => ['GET'],
    'admin_orders.php?status=pending' => ['GET'],
    'get_financial_analytics.php' => ['GET'],
    'manage_delivery.php' => ['GET'],
    'upload_image.php' => ['POST'],
];

echo "=" . str_repeat("=", 78) . "\n";
echo "API Endpoint Diagnostics\n";
echo "=" . str_repeat("=", 78) . "\n\n";

foreach ($endpoints as $endpoint => $methods) {
    $url = "$baseUrl/$endpoint";
    echo "Testing: $endpoint\n";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $methods[0]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        echo "  ❌ ERROR: $error\n";
    } else {
        echo "  HTTP Code: $httpCode\n";
        
        // Check for CORS headers
        if (strpos($response, 'Access-Control-Allow-Origin') !== false) {
            echo "  ✓ CORS Headers Present\n";
        } else {
            echo "  ✗ No CORS Headers\n";
        }
        
        // Check for JSON response
        if (strpos($response, '{') !== false || strpos($response, '[') !== false) {
            echo "  ✓ JSON Response Found\n";
        } else {
            echo "  ✗ No JSON in Response\n";
        }
    }
    
    echo "\n";
}

echo "=" . str_repeat("=", 78) . "\n";
echo "Diagnostics Complete\n";
echo "=" . str_repeat("=", 78) . "\n";
?>