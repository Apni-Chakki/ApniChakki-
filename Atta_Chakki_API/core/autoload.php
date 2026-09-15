<?php
/**
 * Manual PSR-4 autoloader for the AttaChakki namespace.
 *
 * Why not composer? The project's composer.json is empty and the hosting
 * environment may not run `composer install`. This gives us the same
 * "require class -> file loaded" behavior with zero external dependency.
 *
 * Namespace map:
 *   AttaChakki\Core\Response        -> core/Response.php
 *   AttaChakki\Core\Request         -> core/Request.php
 *   AttaChakki\Repositories\Foo     -> repositories/Foo.php
 *   AttaChakki\Services\Bar         -> services/Bar.php
 *
 * Include this file ONCE from index.php (or from any bootstrap script that
 * runs before controllers). Safe to include multiple times.
 */

if (!defined('ATTA_CHAKKI_AUTOLOAD_REGISTERED')) {
    define('ATTA_CHAKKI_AUTOLOAD_REGISTERED', true);

    spl_autoload_register(function ($class) {
        $prefix = 'AttaChakki\\';
        $baseDir = dirname(__DIR__) . DIRECTORY_SEPARATOR;

        if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
            return;
        }

        $relative = substr($class, strlen($prefix));
        // AttaChakki\Core\Response -> Core/Response
        // Map first segment to lowercase folder name (matches actual layout).
        $parts = explode('\\', $relative);
        if (count($parts) < 2) return;
        $parts[0] = strtolower($parts[0]);

        $path = $baseDir . implode(DIRECTORY_SEPARATOR, $parts) . '.php';
        if (is_file($path)) {
            require_once $path;
        }
    });
}
