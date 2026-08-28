<?php
// utils/email_helper.php
require_once __DIR__ . '/../config/connect.php';

/**
 * Make a non-blocking asynchronous POST request to the email/notification server
 * This returns immediately without waiting for the response.
 *
 * @param string $endpoint The endpoint path (e.g. '/send-order-status-update')
 * @param array $payload The JSON-serializable data payload
 * @return bool True if socket successfully opened and wrote request, false otherwise
 */
function send_email_async($endpoint, $payload) {
    if (!defined('EMAIL_SERVER_URL')) {
        return false;
    }
    
    $url = EMAIL_SERVER_URL . $endpoint;
    $parts = parse_url($url);
    if ($parts === false) {
        return false;
    }

    $host = $parts['host'];
    $port = isset($parts['port']) ? $parts['port'] : ($parts['scheme'] === 'https' ? 443 : 80);
    $path = isset($parts['path']) ? $parts['path'] : '/';
    if (isset($parts['query'])) {
        $path .= '?' . $parts['query'];
    }

    $scheme = ($parts['scheme'] === 'https') ? 'ssl://' : '';
    
    // Open socket with 1.0 second timeout for the connection
    $fp = @fsockopen($scheme . $host, $port, $errno, $errstr, 1.0);
    if (!$fp) {
        // Log connection failure for debugging (silently)
        error_log("Async email socket connection failed to $host:$port - Error: $errstr ($errno)");
        return false;
    }

    // Set write timeout to 1 second
    stream_set_timeout($fp, 1);

    $post_data = json_encode($payload);

    $out = "POST " . $path . " HTTP/1.1\r\n";
    $out .= "Host: " . $host . "\r\n";
    $out .= "Content-Type: application/json\r\n";
    $out .= "Content-Length: " . strlen($post_data) . "\r\n";
    $out .= "Connection: Close\r\n\r\n";
    $out .= $post_data;

    fwrite($fp, $out);
    fclose($fp);
    return true;
}
?>
