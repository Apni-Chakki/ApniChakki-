<?php
// Cache helper utility for file-based response caching

function get_cache_dir() {
    $dir = __DIR__ . '/../cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    return $dir;
}

function get_api_cache($key, $ttl = 300) {
    $dir = get_cache_dir();
    $file = $dir . '/' . md5($key) . '.json';
    
    if (file_exists($file) && (time() - filemtime($file) < $ttl)) {
        $content = file_get_contents($file);
        if ($content !== false) {
            return $content;
        }
    }
    return false;
}

function set_api_cache($key, $data) {
    $dir = get_cache_dir();
    $file = $dir . '/' . md5($key) . '.json';
    $json = is_string($data) ? $data : json_encode($data);
    @file_put_contents($file, $json);
}

function clear_api_cache($prefix = '') {
    $dir = get_cache_dir();
    $files = glob($dir . '/*.json');
    if ($files) {
        foreach ($files as $file) {
            @unlink($file);
        }
    }
}
