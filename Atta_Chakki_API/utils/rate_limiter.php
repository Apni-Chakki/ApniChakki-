<?php
// utils/rate_limiter.php

/**
 * Checks and records rate limiting attempts.
 * Uses file-based storage in sys_get_temp_dir() or API cache directory.
 * 
 * @param string $key Unique identifier for action + subject 
 * @param int $max_attempts Maximum allowed attempts within window
 * @param int $decay_seconds Window duration in seconds
 * @return array ['allowed' => bool, 'remaining' => int, 'retry_after' => int]
 */
function check_rate_limit($key, $max_attempts = 5, $decay_seconds = 900)
{
    $storage_dir = __DIR__ . '/../cache/rate_limits';
    if (!is_dir($storage_dir)) {
        @mkdir($storage_dir, 0755, true);
    }

    $hash = md5($key);
    $file = $storage_dir . '/' . $hash . '.json';
    $now = time();

    $data = ['attempts' => 0, 'reset_at' => $now + $decay_seconds];

    if (file_exists($file)) {
        $content = @file_get_contents($file);
        if ($content) {
            $parsed = json_decode($content, true);
            if ($parsed && isset($parsed['reset_at']) && $parsed['reset_at'] > $now) {
                $data = $parsed;
            }
        }
    }

    if ($data['reset_at'] <= $now) {
        $data['attempts'] = 0;
        $data['reset_at'] = $now + $decay_seconds;
    }

    if ($data['attempts'] >= $max_attempts) {
        return [
            'allowed' => false,
            'remaining' => 0,
            'retry_after' => max(1, $data['reset_at'] - $now)
        ];
    }

    return [
        'allowed' => true,
        'remaining' => $max_attempts - $data['attempts'],
        'retry_after' => 0
    ];
}

/**
 * Increment failed attempts on rate limiter.
 */
function hit_rate_limit($key, $decay_seconds = 900)
{
    $storage_dir = __DIR__ . '/../cache/rate_limits';
    if (!is_dir($storage_dir)) {
        @mkdir($storage_dir, 0755, true);
    }

    $hash = md5($key);
    $file = $storage_dir . '/' . $hash . '.json';
    $now = time();

    $data = ['attempts' => 0, 'reset_at' => $now + $decay_seconds];

    if (file_exists($file)) {
        $content = @file_get_contents($file);
        if ($content) {
            $parsed = json_decode($content, true);
            if ($parsed && isset($parsed['reset_at']) && $parsed['reset_at'] > $now) {
                $data = $parsed;
            }
        }
    }

    if ($data['reset_at'] <= $now) {
        $data['attempts'] = 0;
        $data['reset_at'] = $now + $decay_seconds;
    }

    $data['attempts']++;
    @file_put_contents($file, json_encode($data), LOCK_EX);
}

/**
 * Clear rate limit on successful authentication.
 */
function clear_rate_limit($key)
{
    $storage_dir = __DIR__ . '/../cache/rate_limits';
    $hash = md5($key);
    $file = $storage_dir . '/' . $hash . '.json';
    if (file_exists($file)) {
        @unlink($file);
    }
}
