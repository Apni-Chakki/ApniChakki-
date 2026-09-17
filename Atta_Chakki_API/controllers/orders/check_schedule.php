<?php
// checks if new order goes today or tomorrow, called before order is placed
// accepts weight via GET or POST, returns assigned_date/is_today/reason/capacity
require_once __DIR__ . '/../../config/cors.php';
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/order_scheduler.php';

header('Content-Type: application/json');

try {
    // Accept weight from GET or POST
    $weight = 1; // default 1 kg
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'));
        if ($data && isset($data->weight)) {
            $weight = floatval($data->weight);
        }
    } else {
        if (isset($_GET['weight'])) {
            $weight = floatval($_GET['weight']);
        }
    }
    
    if ($weight <= 0) $weight = 1;
    
    // Get schedule decision
    $availability = getScheduleAvailability($conn, $weight);
    
    echo json_encode([
        'success' => true,
        'schedule' => $availability
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'message' => 'Error checking schedule: ' . $e->getMessage()
    ]);
}
?>
