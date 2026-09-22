<?php
// utils/jwt_helper.php

function get_jwt_secret() {
    global $envVars;
    if (isset($envVars['JWT_SECRET']) && !empty($envVars['JWT_SECRET'])) {
        return $envVars['JWT_SECRET'];
    }
    $envSecret = getenv('JWT_SECRET');
    if ($envSecret) {
        return $envSecret;
    }
    // Try reading directly from .env file if global not populated
    $envPath = __DIR__ . '/../.env';
    if (file_exists($envPath)) {
        $parsed = parse_ini_file($envPath);
        if (!empty($parsed['JWT_SECRET'])) {
            return $parsed['JWT_SECRET'];
        }
    }
    // If still missing, throw an exception to prevent signing with an insecure key
    throw new Exception("Security Error: JWT_SECRET environment variable is not configured.");
}

function generate_jwt($payload) {
    $secret = get_jwt_secret();
    
    // Header
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    
    // Payload
    $payload['exp'] = time() + (86400 * 30); // 30 days expiration
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    
    // Signature
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verify_jwt($token) {
    try {
        $secret = get_jwt_secret();
    } catch (Exception $e) {
        error_log("JWT Verification Error: " . $e->getMessage());
        return false;
    }
    
    $tokenParts = explode('.', $token);
    if (count($tokenParts) !== 3) {
        return false;
    }
    
    $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[0]));
    $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1]));
    $signature_provided = $tokenParts[2];
    
    // Check expiration
    $payload_data = json_decode($payload, true);
    if (isset($payload_data['exp']) && $payload_data['exp'] < time()) {
        return false; // Token expired
    }
    
    $base64UrlHeader = $tokenParts[0];
    $base64UrlPayload = $tokenParts[1];
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    if (hash_equals($base64UrlSignature, $signature_provided)) {
        return $payload_data;
    }
    
    return false;
}
?>
