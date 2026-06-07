<?php
// promote_to_vip.php
include __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $user_id = intval($input['user_id'] ?? 0);
    $is_vip = intval($input['is_vip'] ?? 0); // 0 or 1
    $vip_discount = intval($input['vip_discount'] ?? 0); // 0 or 1
    $vip_free_shipping = intval($input['vip_free_shipping'] ?? 0); // 0 or 1
    $privilege_ids = $input['privilege_ids'] ?? null;

    if ($user_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        exit;
    }

    // Fetch all privileges to know which IDs correspond to system types (discount, free_shipping)
    $privRes = $conn->query("SELECT id, type FROM vip_privileges");
    $privilegeTypes = [];
    while ($priv = $privRes->fetch_assoc()) {
        $privilegeTypes[intval($priv['id'])] = $priv['type'];
    }

    if (is_array($privilege_ids)) {
        // Resolve vip_discount and vip_free_shipping from assigned privilege_ids
        $vip_discount = 0;
        $vip_free_shipping = 0;
        foreach ($privilege_ids as $pid) {
            $pid = intval($pid);
            if (isset($privilegeTypes[$pid])) {
                if ($privilegeTypes[$pid] === 'discount') {
                    $vip_discount = 1;
                } elseif ($privilegeTypes[$pid] === 'free_shipping') {
                    $vip_free_shipping = 1;
                }
            }
        }
    } else {
        // Fallback to old behavior: construct privilege_ids array from old parameters
        $privilege_ids = [];
        foreach ($privilegeTypes as $pid => $type) {
            if ($type === 'discount' && $vip_discount === 1) {
                $privilege_ids[] = $pid;
            }
            if ($type === 'free_shipping' && $vip_free_shipping === 1) {
                $privilege_ids[] = $pid;
            }
        }
    }

    // Get user details to send congratulations email if promoted to VIP
    $stmt = $conn->prepare("SELECT full_name, email, is_vip, vip_discount, vip_free_shipping FROM users WHERE id = ? AND role = 'customer'");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if ($res->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Customer not found']);
        $stmt->close();
        exit;
    }
    
    $user = $res->fetch_assoc();
    $full_name = $user['full_name'];
    $email = $user['email'];
    $was_vip = intval($user['is_vip'] ?? 0) === 1;
    $was_discount = intval($user['vip_discount'] ?? 0) === 1;
    $was_free_shipping = intval($user['vip_free_shipping'] ?? 0) === 1;
    $stmt->close();

    $stmt = $conn->prepare("UPDATE users SET is_vip = ?, vip_discount = ?, vip_free_shipping = ? WHERE id = ?");
    $stmt->bind_param("iiii", $is_vip, $vip_discount, $vip_free_shipping, $user_id);
    
    if ($stmt->execute()) {
        // Synchronize mapping table
        $delStmt = $conn->prepare("DELETE FROM user_vip_privileges WHERE user_id = ?");
        $delStmt->bind_param("i", $user_id);
        $delStmt->execute();
        $delStmt->close();

        if ($is_vip === 1 && !empty($privilege_ids)) {
            $insStmt = $conn->prepare("INSERT INTO user_vip_privileges (user_id, privilege_id) VALUES (?, ?)");
            foreach ($privilege_ids as $pid) {
                $pid = intval($pid);
                $insStmt->bind_param("ii", $user_id, $pid);
                $insStmt->execute();
            }
            $insStmt->close();
        }

        $email_sent = false;
        
        // Send email if promoted to VIP, OR if already VIP and privileges changed
        $privileges_changed = ($vip_discount !== ($was_discount ? 1 : 0)) || ($vip_free_shipping !== ($was_free_shipping ? 1 : 0));
        $should_send = ($is_vip === 1) && (!$was_vip || $privileges_changed);
        
        if ($should_send && !empty($email)) {
            try {
                $emailData = [
                    'customerEmail' => $email,
                    'customerName' => $full_name,
                    'vipDiscount' => intval($vip_discount),
                    'vipFreeShipping' => intval($vip_free_shipping)
                ];
                
                $ch = curl_init('http://localhost:3001/send-vip-congratulations');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
                curl_setopt($ch, CURLOPT_TIMEOUT_MS, 3000); // 3 seconds timeout
                
                $response = curl_exec($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($http_code === 200) {
                    $email_sent = true;
                }
            } catch (Exception $e) {
                // ignore mail errors
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Customer VIP status and privileges updated successfully',
            'email_sent' => $email_sent
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update VIP status: ' . $stmt->error
        ]);
    }
    $stmt->close();

} catch (Exception $e) {
    error_log('Promote to VIP Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}

$conn->close();
?>
