<?php
// admin se order bana rahe han yahan is api me
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"));

if(isset($data->name) && isset($data->items) && count($data->items) > 0) {
    $name = $data->name;
    $phone = isset($data->phone) ? $data->phone : '';
    $address = isset($data->address) ? $data->address : 'Store Pickup';
    
    // user check kar rahe han ya naya bana rahe han agar nahi mila tou
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
    
    // payment methods mapping
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
        
        $source_check = $conn->query("SHOW COLUMNS FROM orders LIKE 'source'");
        if (!$source_check || $source_check->num_rows === 0) {
            $conn->query("ALTER TABLE orders ADD COLUMN source VARCHAR(50) DEFAULT 'web'");
        }
        
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
        
        // items add aur stock update kar rahe han yahan par
        $item_stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, is_cleaning, is_grinding) VALUES (?, ?, ?, ?, ?, ?)");
        $inv_stmt = $conn->prepare("UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?");
        $cust_stmt = $conn->prepare("INSERT INTO order_item_customizations (order_item_id, option_name, option_price) VALUES (?, ?, ?)");
        
        foreach($data->items as $item) {
            $prod_id = intval($item->id);
            $qty = floatval($item->quantity);
            $price = floatval($item->price);
            $is_cleaning = isset($item->is_cleaning) ? (int)$item->is_cleaning : 0;
            $is_grinding = isset($item->is_grinding) ? (int)$item->is_grinding : 0;
            $selected_customizations = isset($item->selected_customizations) ? $item->selected_customizations : [];
            
            // 1. First check if product exists and check stock
            $stock_check = $conn->prepare("SELECT name, stock_quantity, unit FROM products WHERE id = ? FOR UPDATE");
            $stock_check->bind_param("i", $prod_id);
            $stock_check->execute();
            $prod_data = $stock_check->get_result()->fetch_assoc();
            
            if (!$prod_data) {
                throw new Exception("Product ID $prod_id not found");
            }

            $is_service = (strtolower(trim($prod_data['unit'])) === 'trip');

            if (!$is_service && $prod_data['stock_quantity'] < $qty) {
                throw new Exception("Insufficient stock for " . $prod_data['name'] . ". Available: " . $prod_data['stock_quantity']);
            }

            // 2. Add to order_items
            $item_stmt->bind_param("iiddii", $order_id, $prod_id, $qty, $price, $is_cleaning, $is_grinding);
            if (!$item_stmt->execute()) {
                throw new Exception("Failed to add Item");
            }
            $order_item_id = $conn->insert_id;

            // 3. Save dynamic customizations for this order item
            if (!empty($selected_customizations)) {
                foreach ($selected_customizations as $sc) {
                    $opt_name = $sc->option_name ?? '';
                    $opt_price = floatval($sc->option_price ?? 0);
                    $cust_stmt->bind_param("isd", $order_item_id, $opt_name, $opt_price);
                    $cust_stmt->execute();
                }
            }
            
            // 4. Update inventory (skip for service items)
            if (!$is_service) {
                $inv_stmt->bind_param("di", $qty, $prod_id);
                if (!$inv_stmt->execute()) {
                    throw new Exception("Failed to subtract Inventory");
                }
            }
        }
        $item_stmt->close();
        $inv_stmt->close();
        $cust_stmt->close();
        
        // payment entry kar rahe han agar kuch pay kiya hai tou
        if ($amount_paid > 0) {
            $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method) VALUES (?, ?, ?)");
            $pay_stmt->bind_param("ids", $order_id, $amount_paid, $db_payment_method);
            $pay_stmt->execute();
        }
        
        $conn->commit();
        
        // schedule set kar rahe han auto wala is order k liye
        require_once __DIR__ . '/order_scheduler.php';
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



