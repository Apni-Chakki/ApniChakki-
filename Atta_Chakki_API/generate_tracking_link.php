<?php
// generating tracking link for whatsapp
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

try {
    // creating tracking_tokens table if not exists
    $conn->query("CREATE TABLE IF NOT EXISTS `tracking_tokens` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `order_id` int(11) NOT NULL,
        `token` varchar(64) NOT NULL,
        `driver_name` varchar(100) DEFAULT NULL,
        `driver_phone` varchar(20) DEFAULT NULL,
        `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
        `expires_at` timestamp NULL DEFAULT NULL,
        `is_active` tinyint(1) DEFAULT 1,
        PRIMARY KEY (`id`),
        UNIQUE KEY `token` (`token`),
        KEY `order_id` (`order_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;");

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // generating new token
        $data = json_decode(file_get_contents("php://input"), true);

        $order_id = isset($data['order_id']) ? intval($data['order_id']) : 0;
        $driver_name = isset($data['driver_name']) ? trim($data['driver_name']) : '';
        $driver_phone = isset($data['driver_phone']) ? trim($data['driver_phone']) : null;
        $base_url = isset($data['base_url']) ? trim($data['base_url']) : 'http://localhost:5173';

        if (!$order_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "order_id is required"]);
            exit;
        }

        // check if token already exists
        $check = $conn->prepare("SELECT token FROM tracking_tokens WHERE order_id = ? AND is_active = 1 LIMIT 1");
        $check->bind_param("i", $order_id);
        $check->execute();
        $existing = $check->get_result()->fetch_assoc();

        if ($existing) {
            $token = $existing['token'];
        } else {
            // making a new token
            $token = bin2hex(random_bytes(16));
            
            $expires_at = date('Y-m-d H:i:s', time() + 86400);
            
            $stmt = $conn->prepare(
                "INSERT INTO tracking_tokens (order_id, token, driver_name, driver_phone, expires_at) VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->bind_param("issss", $order_id, $token, $driver_name, $driver_phone, $expires_at);
            $stmt->execute();
        }

        // building tracking url
        $tracking_url = rtrim($base_url, '/') . "/track/" . $token;

        // getting order info for whatsapp msg
        $order_stmt = $conn->prepare(
            "SELECT o.*, u.full_name as customer_name, u.phone as customer_phone 
             FROM orders o 
             JOIN users u ON u.id = o.user_id 
             WHERE o.id = ?"
        );
        $order_stmt->bind_param("i", $order_id);
        $order_stmt->execute();
        $order = $order_stmt->get_result()->fetch_assoc();

        // whatsapp message text
        $whatsapp_message = "🚚 *Apni Chakki Delivery Update*\n\n"
            . "Assalam-o-Alaikum! Your order #{$order_id} is on the way! 🎉\n\n"
            . "📦 Total: Rs. " . number_format($order['total_amount'] ?? 0) . "\n"
            . "🧑‍💼 Driver: " . ($driver_name ?: 'Your Driver') . "\n"
            . "📍 *Live Track Your Delivery:*\n"
            . $tracking_url . "\n\n"
            . "Click the link above to see your driver's location in real-time! 🗺️\n\n"
            . "JazakAllah! 🙏";

        // formatting phone for whatsapp
        $customer_phone = $order['customer_phone'] ?? '';
        $formatted_phone = preg_replace('/\D/', '', $customer_phone);
        if (substr($formatted_phone, 0, 1) === '0') {
            $formatted_phone = '92' . substr($formatted_phone, 1);
        } elseif (substr($formatted_phone, 0, 2) !== '92') {
            $formatted_phone = '92' . $formatted_phone;
        }

        $whatsapp_url = "https://wa.me/{$formatted_phone}?text=" . rawurlencode($whatsapp_message);

        echo json_encode([
            "success" => true,
            "token" => $token,
            "tracking_url" => $tracking_url,
            "whatsapp_url" => $whatsapp_url,
            "whatsapp_message" => $whatsapp_message,
            "order_id" => $order_id
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        
        if (isset($_GET['token'])) {
            // validating token
            $token = trim($_GET['token']);

            $stmt = $conn->prepare(
                "SELECT tt.*, o.shipping_address, o.status as order_status, o.total_amount,
                        u.full_name as customer_name, u.phone as customer_phone,
                        o.driver_name as assigned_driver
                 FROM tracking_tokens tt
                 JOIN orders o ON o.id = tt.order_id
                 JOIN users u ON u.id = o.user_id
                 WHERE tt.token = ? AND tt.is_active = 1"
            );
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();

            if (!$result) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Invalid or expired tracking link"]);
                exit;
            }

            // checking if expired
            if ($result['expires_at'] && strtotime($result['expires_at']) < time()) {
                echo json_encode(["success" => false, "message" => "This tracking link has expired"]);
                exit;
            }

            // getting driver location
            $loc_stmt = $conn->prepare(
                "SELECT latitude, longitude, speed, heading, accuracy, created_at 
                 FROM delivery_tracking 
                 WHERE order_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 1"
            );
            $loc_stmt->bind_param("i", $result['order_id']);
            $loc_stmt->execute();
            $location = $loc_stmt->get_result()->fetch_assoc();

            echo json_encode([
                "success" => true,
                "order_id" => $result['order_id'],
                "order_status" => $result['order_status'],
                "customer_name" => $result['customer_name'],
                "shipping_address" => $result['shipping_address'],
                "total_amount" => $result['total_amount'],
                "driver_name" => $result['driver_name'] ?: $result['assigned_driver'],
                "driver_phone" => $result['driver_phone'],
                "current_location" => $location,
                "token_created" => $result['created_at'],
                "token_expires" => $result['expires_at']
            ]);

        } elseif (isset($_GET['order_id'])) {
            // getting token for order
            $order_id = intval($_GET['order_id']);
            $stmt = $conn->prepare("SELECT token FROM tracking_tokens WHERE order_id = ? AND is_active = 1 LIMIT 1");
            $stmt->bind_param("i", $order_id);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();

            echo json_encode([
                "success" => !!$result,
                "token" => $result ? $result['token'] : null
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "Provide token or order_id parameter"]);
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    error_log("generate_tracking_link.php error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}
?>
