<?php
// connecting to db
$old_report = mysqli_report(MYSQLI_REPORT_OFF);

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "atta_chakki";

try {
    $conn = new mysqli($servername, $username, $password, $dbname);
    
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
