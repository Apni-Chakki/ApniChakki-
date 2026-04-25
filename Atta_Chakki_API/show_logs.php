<?php
header('Content-Type: text/plain');

$log_file = __DIR__ . '/error_log.txt';

if (file_exists($log_file)) {
    echo "=== Error Log ===\n";
    echo "Last updated: " . date("Y-m-d H:i:s", filemtime($log_file)) . "\n\n";
    echo file_get_contents($log_file);
} else {
    echo "No error log file found.\n";
    echo "Expected location: " . $log_file . "\n";
    echo "PHP error_reporting: " . ini_get('error_reporting') . "\n";
    echo "Display errors: " . (ini_get('display_errors') ? 'ON' : 'OFF') . "\n";
    echo "Log errors: " . (ini_get('log_errors') ? 'ON' : 'OFF') . "\n";
}
?>
