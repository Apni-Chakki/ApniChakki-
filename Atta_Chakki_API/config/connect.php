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
    $urlStr = getenv("JAWSDB_URL") ?: getenv("CLEARDB_DATABASE_URL");
    $url = $urlStr ? parse_url($urlStr) : null;
    if ($url && isset($url["host"])) {
        $servername = "p:" . $url["host"];
        $username = $url["user"];
        $password = $url["pass"];
        $dbname = substr($url["path"], 1);
        $port = $url["port"] ?? 3306;
    } else {
        $servername = "p:" . (getenv('DB_HOST') ?: ($envVars['DB_PROD_HOST'] ?? "localhost"));
        $username = getenv('DB_USER') ?: ($envVars['DB_PROD_USER'] ?? "root");
        $password = getenv('DB_PASS') ?: ($envVars['DB_PROD_PASS'] ?? "");
        $dbname = getenv('DB_NAME') ?: ($envVars['DB_PROD_NAME'] ?? "");
        $port = getenv('DB_PORT') ? (int)getenv('DB_PORT') : (isset($envVars['DB_PROD_PORT']) ? (int)$envVars['DB_PROD_PORT'] : 3306);
    }
}

try {
    $conn = new mysqli($servername, $username, $password, $dbname, $port);
    
    if ($conn->connect_error) {
        throw new Exception("Database Connection Failed: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");
    
    // Auto-create customization tables if missing
    $conn->query("CREATE TABLE IF NOT EXISTS product_customizations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        option_name VARCHAR(100) NOT NULL,
        option_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $conn->query("CREATE TABLE IF NOT EXISTS order_item_customizations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_item_id INT NOT NULL,
        option_name VARCHAR(100) NOT NULL,
        option_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Auto-create business_accounts table if missing
    $conn->query("CREATE TABLE IF NOT EXISTS business_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_name VARCHAR(150) NOT NULL DEFAULT 'Suchi Chakki',
        bank_name VARCHAR(100) NOT NULL DEFAULT 'Meezan Bank',
        account_number VARCHAR(100) NOT NULL DEFAULT '0123-4567890',
        iban VARCHAR(100) NOT NULL DEFAULT 'PK00 MEZN 0000 0000 0000 0000',
        balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        is_primary TINYINT(1) NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Ensure iban column exists if table existed previously
    $check_iban = $conn->query("SHOW COLUMNS FROM business_accounts LIKE 'iban'");
    if ($check_iban && $check_iban->num_rows === 0) {
        $conn->query("ALTER TABLE business_accounts ADD COLUMN iban VARCHAR(100) NOT NULL DEFAULT 'PK00 MEZN 0000 0000 0000 0000' AFTER account_number");
    }

    // Insert default business account row if empty
    $check_rows = $conn->query("SELECT id FROM business_accounts LIMIT 1");
    if ($check_rows && $check_rows->num_rows === 0) {
        $conn->query("INSERT INTO business_accounts (account_name, bank_name, account_number, iban, balance, is_primary, is_active) VALUES ('Suchi Chakki', 'Meezan Bank', '0123-4567890', 'PK00 MEZN 0000 0000 0000 0000', 0.00, 1, 1)");
    }
    
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
    define('EMAIL_SERVER_URL', $is_localhost ? 'http://localhost:3001' : 'https://socket-server-9b9f3ddbe629.herokuapp.com');
}
?>
