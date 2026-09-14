<?php
// controllers/delivery/toggle_driver_status.php
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
$auth_user = require_driver_or_admin();

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $driver_phone = isset($_GET['driver_phone']) ? trim($_GET['driver_phone']) : ($auth_user['phone'] ?? '');

        if (empty($driver_phone)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Driver phone is required"]);
            exit;
        }

        // Clean phone for lookup
        $raw_clean = preg_replace('/\D/', '', $driver_phone);
        $phone_variants = array_values(array_unique(array_filter([
            $driver_phone,
            $raw_clean,
            str_starts_with($raw_clean, '0') ? ('92' . substr($raw_clean, 1)) : '',
            str_starts_with($raw_clean, '0') ? substr($raw_clean, 1) : '',
            str_starts_with($raw_clean, '92') ? ('0' . substr($raw_clean, 2)) : '',
            str_starts_with($raw_clean, '92') ? substr($raw_clean, 2) : '',
            ('0' . $raw_clean),
            ('+92' . (str_starts_with($raw_clean, '0') ? substr($raw_clean, 1) : $raw_clean))
        ])));

        $placeholders = implode(',', array_fill(0, count($phone_variants), '?'));
        $types = str_repeat('s', count($phone_variants));

        $stmt = $conn->prepare("SELECT id, name, phone, is_active FROM delivery_personnel WHERE phone IN ($placeholders) LIMIT 1");
        $stmt->bind_param($types, ...$phone_variants);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($row = $res->fetch_assoc()) {
            echo json_encode([
                "success" => true,
                "isActive" => (int)$row['is_active'] === 1,
                "name" => $row['name'],
                "phone" => $row['phone']
            ]);
        } else {
            // Check in users table as fallback
            $u_stmt = $conn->prepare("SELECT id, full_name, phone, is_active FROM users WHERE phone IN ($placeholders) AND role IN ('delivery_boy', 'delivery') LIMIT 1");
            $u_stmt->bind_param($types, ...$phone_variants);
            $u_stmt->execute();
            $u_res = $u_stmt->get_result();
            if ($u_row = $u_res->fetch_assoc()) {
                echo json_encode([
                    "success" => true,
                    "isActive" => (int)$u_row['is_active'] === 1,
                    "name" => $u_row['full_name'],
                    "phone" => $u_row['phone']
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "isActive" => true,
                    "name" => $auth_user['name'] ?? 'Driver',
                    "phone" => $driver_phone
                ]);
            }
            $u_stmt->close();
        }
        $stmt->close();
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $driver_phone = isset($data['driver_phone']) ? trim($data['driver_phone']) : ($auth_user['phone'] ?? '');

        if (empty($driver_phone)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Driver phone is required"]);
            exit;
        }

        $raw_clean = preg_replace('/\D/', '', $driver_phone);
        $phone_variants = array_values(array_unique(array_filter([
            $driver_phone,
            $raw_clean,
            str_starts_with($raw_clean, '0') ? ('92' . substr($raw_clean, 1)) : '',
            str_starts_with($raw_clean, '0') ? substr($raw_clean, 1) : '',
            str_starts_with($raw_clean, '92') ? ('0' . substr($raw_clean, 2)) : '',
            str_starts_with($raw_clean, '92') ? substr($raw_clean, 2) : '',
            ('0' . $raw_clean),
            ('+92' . (str_starts_with($raw_clean, '0') ? substr($raw_clean, 1) : $raw_clean))
        ])));

        $placeholders = implode(',', array_fill(0, count($phone_variants), '?'));
        $types = str_repeat('s', count($phone_variants));

        // Determine new status
        $new_is_active = 0;
        if (isset($data['isActive'])) {
            $new_is_active = $data['isActive'] ? 1 : 0;
        } else {
            // Toggle current status
            $chk = $conn->prepare("SELECT is_active FROM delivery_personnel WHERE phone IN ($placeholders) LIMIT 1");
            $chk->bind_param($types, ...$phone_variants);
            $chk->execute();
            $c_res = $chk->get_result();
            if ($c_row = $c_res->fetch_assoc()) {
                $new_is_active = ((int)$c_row['is_active'] === 1) ? 0 : 1;
            }
            $chk->close();
        }

        // Update delivery_personnel
        $upd_types = 'i' . $types;
        $upd_params = array_merge([$new_is_active], $phone_variants);
        $upd = $conn->prepare("UPDATE delivery_personnel SET is_active = ? WHERE phone IN ($placeholders)");
        $upd->bind_param($upd_types, ...$upd_params);
        $upd->execute();
        $upd->close();

        // Also update users table
        $u_upd = $conn->prepare("UPDATE users SET is_active = ? WHERE phone IN ($placeholders) AND role IN ('delivery_boy', 'delivery')");
        $u_upd->bind_param($upd_types, ...$upd_params);
        $u_upd->execute();
        $u_upd->close();

        // Find driver name and id for notification
        $driver_name = $auth_user['name'] ?? 'Driver';
        $driver_id = null;
        $name_chk = $conn->prepare("SELECT id, name FROM delivery_personnel WHERE phone IN ($placeholders) LIMIT 1");
        $name_chk->bind_param($types, ...$phone_variants);
        $name_chk->execute();
        $n_res = $name_chk->get_result();
        if ($n_row = $n_res->fetch_assoc()) {
            $driver_name = $n_row['name'];
            $driver_id = (int)$n_row['id'];
        }
        $name_chk->close();

        // Send notification to Admin Dashboard
        require_once __DIR__ . '/../../utils/notification_helper.php';
        $title = ($new_is_active === 1)
            ? "🟢 Rider Online: $driver_name is Active"
            : "🔴 Rider Emergency: $driver_name is Inactive";
        $msg = ($new_is_active === 1)
            ? "Delivery rider $driver_name ($driver_phone) is now Online (On Duty) and available for order assignments."
            : "Delivery rider $driver_name ($driver_phone) marked themselves Inactive (Off Duty / Emergency). They will not receive new order assignments.";
        addAdminNotification($conn, $title, $msg, 'driver_status', $driver_id);

        echo json_encode([
            "success" => true,
            "isActive" => $new_is_active === 1,
            "driver_name" => $driver_name,
            "message" => $new_is_active === 1 ? "You are now Active (Online)" : "You are now Inactive (Offline / Emergency)"
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("toggle_driver_status error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}
