<?php
// connecting to db
// SET TIMEZONE — Pakistan Standard Time (UTC+5)
// This is critical for all scheduling, ETA, and date calculations
date_default_timezone_set('Asia/Karachi');

$old_report = mysqli_report(MYSQLI_REPORT_OFF);

// Load .env configuration dynamically using parse_ini_file
$envFile = __DIR__ . '/../.env';
$envVars = [];
if (file_exists($envFile)) {
    $envVars = parse_ini_file($envFile);
}

// Detect if running on localhost or live server
$is_localhost = true;
if (isset($_SERVER['HTTP_HOST'])) {
    $host = $_SERVER['HTTP_HOST'];
    if (strpos($host, 'localhost') === false && strpos($host, '127.0.0.1') === false) {
        $is_localhost = false;
    }
}

if ($is_localhost) {
    // Localhost / XAMPP Configuration
    $servername = $envVars['DB_LOCAL_HOST'] ?? "127.0.0.1";
    $username = $envVars['DB_LOCAL_USER'] ?? "root";
    $password = $envVars['DB_LOCAL_PASS'] ?? "";
    $dbname = $envVars['DB_LOCAL_NAME'] ?? "atta_chakki";
    $port = isset($envVars['DB_LOCAL_PORT']) ? (int)$envVars['DB_LOCAL_PORT'] : 3306;
} else {
    // Production / InfinityFree Configuration
    $servername = $envVars['DB_PROD_HOST'] ?? "sql207.infinityfree.com";
    $username = $envVars['DB_PROD_USER'] ?? "if0_41968272";
    $password = $envVars['DB_PROD_PASS'] ?? "zm8JduGqossHJo9";
    $dbname = $envVars['DB_PROD_NAME'] ?? "if0_41968272_atta_chakki";
    $port = isset($envVars['DB_PROD_PORT']) ? (int)$envVars['DB_PROD_PORT'] : 3306;
}

try {
    $conn = new mysqli($servername, $username, $password, $dbname, $port);
    
    if ($conn->connect_error) {
        throw new Exception("Database Connection Failed: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");
    
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    
} catch (Exception $e) {
    error_log("Connection Error: " . $e->getMessage());
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Database Connection Failed: " . $e->getMessage()]);
        exit;
    } else {
        die("Connection Error: " . $e->getMessage());
    }
}
?>
