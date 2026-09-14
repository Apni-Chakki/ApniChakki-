<?php
// Database Connection & Environment Initialization
// Set Timezone — Pakistan Standard Time (UTC+5)
date_default_timezone_set('Asia/Karachi');

$old_report = mysqli_report(MYSQLI_REPORT_OFF);

// Load .env configuration dynamically using parse_ini_file
$envFile = __DIR__ . '/../.env';
$envVars = [];
if (file_exists($envFile)) {
    $envVars = parse_ini_file($envFile);
}

// Detect execution environment (Localhost vs Production)
$appMode = strtolower($envVars['APP_ENV'] ?? getenv('APP_ENV') ?: '');
$is_localhost = true;

if ($appMode === 'production' || $appMode === 'live' || $appMode === 'prod') {
    $is_localhost = false;
} elseif ($appMode === 'local' || $appMode === 'development' || $appMode === 'dev') {
    $is_localhost = true;
} elseif (isset($_SERVER['HTTP_HOST'])) {
    $host = $_SERVER['HTTP_HOST'];
    if (strpos($host, 'localhost') === false && strpos($host, '127.0.0.1') === false) {
        $is_localhost = false;
    }
}

if ($is_localhost) {
    // Local Database Configuration
    $servername = $envVars['DB_LOCAL_HOST'] ?? "127.0.0.1";
    $username = $envVars['DB_LOCAL_USER'] ?? "root";
    $password = $envVars['DB_LOCAL_PASS'] ?? "";
    $dbname = $envVars['DB_LOCAL_NAME'] ?? "atta_chakki";
    $port = isset($envVars['DB_LOCAL_PORT']) ? (int)$envVars['DB_LOCAL_PORT'] : 3306;
} else {
    // Production Database Configuration
    if (getenv('DB_HOST') || !empty($envVars['DB_PROD_HOST'])) {
        $servername = getenv('DB_HOST') ?: ($envVars['DB_PROD_HOST'] ?? "localhost");
        $username = getenv('DB_USER') ?: ($envVars['DB_PROD_USER'] ?? "root");
        $password = getenv('DB_PASS') ?: ($envVars['DB_PROD_PASS'] ?? "");
        $dbname = getenv('DB_NAME') ?: ($envVars['DB_PROD_NAME'] ?? "");
        $port = getenv('DB_PORT') ? (int)getenv('DB_PORT') : (isset($envVars['DB_PROD_PORT']) ? (int)$envVars['DB_PROD_PORT'] : 3306);
    } else {
        $urlStr = getenv("JAWSDB_URL") ?: getenv("CLEARDB_DATABASE_URL");
        $url = $urlStr ? parse_url($urlStr) : null;
        if ($url && isset($url["host"])) {
            $servername = "p:" . $url["host"];
            $username = $url["user"];
            $password = $url["pass"];
            $dbname = substr($url["path"], 1);
            $port = $url["port"] ?? 3306;
        } else {
            $servername = "localhost";
            $username = "root";
            $password = "";
            $dbname = "atta_chakki";
            $port = 3306;
        }
    }
}

try {
    $use_ssl = ($port == 4000) || (strpos($servername, 'tidbcloud.com') !== false) || (getenv('DB_SSL') === 'true');
    $conn = mysqli_init();
    
    if ($use_ssl) {
        $conn->ssl_set(NULL, NULL, NULL, NULL, NULL);
        $conn->options(MYSQLI_OPT_SSL_VERIFY_SERVER_CERT, false);
        $clean_host = preg_replace('/^p:/', '', $servername);
        $connected = @$conn->real_connect($clean_host, $username, $password, $dbname, $port, NULL, MYSQLI_CLIENT_SSL);
    } else {
        $connected = @$conn->real_connect($servername, $username, $password, $dbname, $port);
    }
    
    if (!$connected || $conn->connect_error) {
        throw new Exception("Database Connection Failed: " . ($conn->connect_error ?: mysqli_connect_error()));
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

// Resolve email service URL
$emailUrl = $envVars['EMAIL_SERVER_URL'] ?? getenv('EMAIL_SERVER_URL');
if ($emailUrl) {
    define('EMAIL_SERVER_URL', $emailUrl);
} else {
    define('EMAIL_SERVER_URL', $is_localhost ? 'http://127.0.0.1:3001' : 'https://socket-server-9b9f3ddbe629.herokuapp.com');
}
?>
