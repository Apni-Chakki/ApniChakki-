<?php
// admin create order api
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"));

if(isset($data->name) && isset($data->items) && count($data->items) > 0) {
    $name = $data->name;
    $phone = isset($data->phone) ? $data->phone : '';
    $address = isset($data->address) ? $data->address : 'Store Pickup';
    
    // checking if user exists or creating new one
    $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ? LIMIT 1");
    $stmt->bind_param("s", $phone);
    $stmt->execute();
    $res = $stmt->get_result();
    
    $user_id = 1;
    if ($row = $res->fetch_assoc()) {
        $user_id = $row['id'];
    } else {
        $dummy_email = time() . "_dummy@apnichakki.com";
        $dummy_pass = password_hash("123456", PASSWORD_DEFAULT);
        $insert_user = $conn->prepare("INSERT INTO users (full_name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, 'customer')");
        $insert_user->bind_param("ssss", $name, $phone, $dummy_email, $dummy_pass);
        if($insert_user->execute()) {
            $user_id = $conn->insert_id;
        }
    }
    
    $total_amount = floatval($data->total);
    $status = isset($data->status) ? $data->status : 'processing';
    $payment_status = isset($data->payment_status) ? $data->payment_status : 'pending';
    $payment_method_input = isset($data->payment_method) ? $data->payment_method : 'cash';
    $amount_paid = isset($data->amount_paid) ? floatval($data->amount_paid) : 0;
    
    // mapping payment methods
    $method_map = [
        'cash' => 'cod',
        'cod' => 'cod', 
        'jazzcash' => 'online',
        'easypaisa' => 'online',
        'card' => 'online',
        'online' => 'online',
        'udhaar' => 'cod',
        'bank' => 'bank'
    ];
    $db_payment_method = isset($method_map[$payment_method_input]) ? $method_map[$payment_method_input] : 'cod';
    
    if($payment_status === 'paid') {
        $amount_paid = $total_amount;
    }
    
    $conn->begin_transaction();
    
    try {
        $col_check = $conn->query("SHOW COLUMNS FROM orders LIKE 'amount_paid'");
        $has_amount_paid_col = ($col_check && $col_check->num_rows > 0);
        
        if ($has_amount_paid_col) {
            $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method, payment_status, amount_paid, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', NOW())");
            $stmt->bind_param("idssssd", $user_id, $total_amount, $status, $address, $db_payment_method, $payment_status, $amount_paid);
        } else {
            $stmt = $conn->prepare("INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method, payment_status, source, created_at) VALUES (?, ?, ?, ?, ?, ?, 'manual', NOW())");
            $stmt->bind_param("idssss", $user_id, $total_amount, $status, $address, $db_payment_method, $payment_status);
        }
        
        if(!$stmt->execute()) {
            throw new Exception("Order Creation Failed");
        }
        
        $order_id = $conn->insert_id;
        $stmt->close();
        
        // adding items and updating stock
        $item_stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)");
        $inv_stmt = $conn->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
        
        foreach($data->items as $item) {
            $prod_id = intval($item->id);
            $qty = floatval($item->quantity);
            $price = floatval($item->price);
            
            $item_stmt->bind_param("iidd", $order_id, $prod_id, $qty, $price);
            if (!$item_stmt->execute()) {
                throw new Exception("Failed to add Item");
            }
            
            $inv_stmt->bind_param("di", $qty, $prod_id);
            if (!$inv_stmt->execute()) {
                throw new Exception("Failed to subtract Inventory");
            }
        }
        
        // recording payment if any
        if ($amount_paid > 0) {
            $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method) VALUES (?, ?, ?)");
            $pay_stmt->bind_param("ids", $order_id, $amount_paid, $db_payment_method);
            $pay_stmt->execute();
        }
        
        $conn->commit();
        
        // auto-schedule this order (calculate ETA and assign to today/tomorrow)
        require_once __DIR__ . '/controllers/orders/order_scheduler.php';
        $schedule_result = scheduleOrder($conn, $order_id);
        
        $sched_msg = "Manual order created successfully";
        if ($schedule_result['status'] === 'scheduled-tomorrow') {
            $sched_msg .= " (Scheduled for tomorrow due to capacity)";
        }
        
        echo json_encode([
            "success" => true, 
            "message" => $sched_msg, 
            "order_id" => $order_id,
            "schedule" => $schedule_result
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Invalid Payload"]);
}
?>
