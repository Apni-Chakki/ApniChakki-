<?php
// manage delivery personnel api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();


try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // getting all delivery people
        $personnel = [];
        $sql = "SELECT id, name, phone, email, address, is_active as isActive, cnic, created_at FROM delivery_personnel ORDER BY created_at DESC";
        $result = $conn->query($sql);
        
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $row['isActive'] = (int)$row['isActive'];
                $personnel[] = $row;
            }
        }
        
        echo json_encode(["success" => true, "personnel" => $personnel]);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $action = isset($data['action']) ? $data['action'] : '';
        
        // Fetch old phone number first if we are doing update, toggle, or delete
        $old_phone = '';
        if (in_array($action, ['update', 'toggle', 'delete']) && isset($data['id'])) {
            $id = intval($data['id']);
            $get_old = $conn->prepare("SELECT phone FROM delivery_personnel WHERE id = ?");
            if ($get_old) {
                $get_old->bind_param("i", $id);
                $get_old->execute();
                $get_old->bind_result($old_phone);
                $get_old->fetch();
                $get_old->close();
            }
        }
        
        // adding new delivery person
        if ($action === 'add') {
            $name = trim($data['name']);
            $email = isset($data['email']) ? trim($data['email']) : '';
            $phone = trim($data['phone']);
            $cnic = isset($data['cnic']) ? trim($data['cnic']) : '';
            $address = isset($data['address']) ? trim($data['address']) : '';
            
            $stmt = $conn->prepare("INSERT INTO delivery_personnel (name, email, phone, cnic, address) VALUES (?, ?, ?, ?, ?)");
            if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
            
            $stmt->bind_param("sssss", $name, $email, $phone, $cnic, $address);
            
            if ($stmt->execute()) {
                // also creating user account if password given
                if (isset($data['password']) && !empty($data['password'])) {
                    $pass = password_hash($data['password'], PASSWORD_DEFAULT);
                    $role = 'delivery_boy';
                    $user_stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, address, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)");
                    if ($user_stmt) {
                        $user_stmt->bind_param("ssssss", $name, $email, $phone, $address, $pass, $role);
                        $user_stmt->execute();
                    }
                }
                echo json_encode(["success" => true, "message" => "Added successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to add. Phone or email might already exist."]);
            }
            exit;
        }
        
        // updating delivery person
        if ($action === 'update') {
            $id = intval($data['id']);
            $name = trim($data['name']);
            $email = isset($data['email']) ? trim($data['email']) : '';
            $phone = trim($data['phone']);
            $cnic = isset($data['cnic']) ? trim($data['cnic']) : '';
            $address = isset($data['address']) ? trim($data['address']) : '';
            
            $stmt = $conn->prepare("UPDATE delivery_personnel SET name = ?, email = ?, phone = ?, cnic = ?, address = ? WHERE id = ?");
            if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
            
            $stmt->bind_param("sssssi", $name, $email, $phone, $cnic, $address, $id);
            
            if ($stmt->execute()) {
                // update users table
                if (!empty($old_phone)) {
                    // Check if user exists with old phone and role delivery_boy or delivery
                    $check_user = $conn->prepare("SELECT id FROM users WHERE phone = ? AND role IN ('delivery_boy', 'delivery')");
                    $check_user->bind_param("s", $old_phone);
                    $check_user->execute();
                    $check_user->store_result();
                    $user_exists = $check_user->num_rows > 0;
                    $check_user->close();

                    if ($user_exists) {
                        if (isset($data['password']) && !empty($data['password'])) {
                            $pass = password_hash($data['password'], PASSWORD_DEFAULT);
                            $user_stmt = $conn->prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, address = ?, password_hash = ? WHERE phone = ? AND role IN ('delivery_boy', 'delivery')");
                            $user_stmt->bind_param("ssssss", $name, $email, $phone, $address, $pass, $old_phone);
                        } else {
                            $user_stmt = $conn->prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, address = ? WHERE phone = ? AND role IN ('delivery_boy', 'delivery')");
                            $user_stmt->bind_param("sssss", $name, $email, $phone, $address, $old_phone);
                        }
                        if ($user_stmt) {
                            $user_stmt->execute();
                            $user_stmt->close();
                        }
                    } else if (isset($data['password']) && !empty($data['password'])) {
                        // Create user if not exists but password is provided
                        $pass = password_hash($data['password'], PASSWORD_DEFAULT);
                        $role = 'delivery_boy';
                        $user_stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, address, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)");
                        if ($user_stmt) {
                            $user_stmt->bind_param("ssssss", $name, $email, $phone, $address, $pass, $role);
                            $user_stmt->execute();
                            $user_stmt->close();
                        }
                    }
                }
                echo json_encode(["success" => true, "message" => "Updated successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to update"]);
            }
            exit;
        }
        
        // toggling active status
        if ($action === 'toggle') {
            $id = intval($data['id']);
            $is_active = intval($data['isActive']);
            
            $stmt = $conn->prepare("UPDATE delivery_personnel SET is_active = ? WHERE id = ?");
            if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
            
            $stmt->bind_param("ii", $is_active, $id);
            
            if ($stmt->execute()) {
                // update users table is_active
                if (!empty($old_phone)) {
                    $user_stmt = $conn->prepare("UPDATE users SET is_active = ? WHERE phone = ? AND role IN ('delivery_boy', 'delivery')");
                    $user_stmt->bind_param("is", $is_active, $old_phone);
                    if ($user_stmt) {
                        $user_stmt->execute();
                        $user_stmt->close();
                    }
                }
                echo json_encode(["success" => true, "message" => "Status updated"]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to update status"]);
            }
            exit;
        }
        
        // deleting delivery person
        if ($action === 'delete') {
            $id = intval($data['id']);
            
            $stmt = $conn->prepare("DELETE FROM delivery_personnel WHERE id = ?");
            if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
            
            $stmt->bind_param("i", $id);
            
            if ($stmt->execute()) {
                // delete from users table
                if (!empty($old_phone)) {
                    $user_stmt = $conn->prepare("DELETE FROM users WHERE phone = ? AND role IN ('delivery_boy', 'delivery')");
                    $user_stmt->bind_param("s", $old_phone);
                    if ($user_stmt) {
                        $user_stmt->execute();
                        $user_stmt->close();
                    }
                }
                echo json_encode(["success" => true, "message" => "Deleted successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to delete"]);
            }
            exit;
        }
        
        echo json_encode(["success" => false, "message" => "Unknown action: " . $action]);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    error_log("manage_delivery.php error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}
