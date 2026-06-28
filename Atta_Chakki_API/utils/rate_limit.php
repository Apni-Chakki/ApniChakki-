<?php
/**
 * Simple rate limiting utility to stop spam and bots.
 */

function checkRateLimit($identifier, $limit = 5, $timeWindow = 60) {
    $tempDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'atta_chakki_rate_limits';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0777, true);
    }
    
    // Hashing the IP address so we can track requests
    $file = $tempDir . DIRECTORY_SEPARATOR . md5($identifier) . '.json';
    
    $currentTime = time();
    $requests = [];

    if (file_exists($file)) {
        $data = file_get_contents($file);
        if ($data) {
            $requests = json_decode($data, true);
        }
    }

    // Removing old requests that are outside the time window
    $validRequests = array_filter($requests, function($timestamp) use ($currentTime, $timeWindow) {
        return ($currentTime - $timestamp) < $timeWindow;
    });

    if (count($validRequests) >= $limit) {
        return false; // Limit crossed, block them
    }

    // Adding the new request timestamp
    $validRequests[] = $currentTime;
    
    // Saving the file back to disk
    file_put_contents($file, json_encode(array_values($validRequests)));
    
    return true; // All good, allow them
}
?>
