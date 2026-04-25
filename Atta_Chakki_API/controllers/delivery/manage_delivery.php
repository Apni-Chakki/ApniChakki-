<?php
// manage delivery personnel api
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // getting all delivery people
        $personnel = [];
        $sql = "SELECT id, name, phone, email, address, is_active as isActive, vehicle_type as vehicleType, vehicle_number as vehicleNumber, cnic, created_at FROM delivery_personnel ORDER BY created_at DESC";
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
        
        // adding new delivery person
        if ($action === 'add') {
            $name = trim($data['name']);
            $email = isset($data['email']) ? trim($data['email']) : '';
            $phone = trim($data['phone']);
            
            $stmt = $conn->prepare("INSERT INTO delivery_personnel (name, email, phone) VALUES (?, ?, ?)");
            if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
            
            $stmt->bind_param("sss", $name, $email, $phone);
            
            if ($stmt->execute()) {
                // also creating user account if password given
                if (isset($data['password']) && !empty($data['password'])) {
                    $pass = password_hash($data['password'], PASSWORD_DEFAULT);
                    $role = 'delivery_boy';
                    $user_stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)");
                    if ($user_stmt) {
                        $user_stmt->bind_param("sssss", $name, $email, $phone, $pass, $role);
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
            
            $stmt = $conn->prepare("UPDATE delivery_personnel SET name = ?, email = ?, phone = ? WHERE id = ?");
            if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
            
            $stmt->bind_param("sssi", $name, $email, $phone, $id);
            
            if ($stmt->execute()) {
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
