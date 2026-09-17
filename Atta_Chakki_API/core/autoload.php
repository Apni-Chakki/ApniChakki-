<?php
// simple psr-4 autoloader for AttaChakki namespace, no composer needed
// include once from index.php, safe to include again

if (!defined('ATTA_CHAKKI_AUTOLOAD_REGISTERED')) {
    define('ATTA_CHAKKI_AUTOLOAD_REGISTERED', true);

    spl_autoload_register(function ($class) {
        $prefix = 'AttaChakki\\';
        $baseDir = dirname(__DIR__) . DIRECTORY_SEPARATOR;

        if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
            return;
        }

        $relative = substr($class, strlen($prefix));
        // lowercase first segment to match actual folder name
        $parts = explode('\\', $relative);
        if (count($parts) < 2) return;
        $parts[0] = strtolower($parts[0]);

        $path = $baseDir . implode(DIRECTORY_SEPARATOR, $parts) . '.php';
        if (is_file($path)) {
            require_once $path;
        }
    });
}
