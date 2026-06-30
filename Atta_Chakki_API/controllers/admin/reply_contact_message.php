<?php
// Reply to contact message controller
require_once __DIR__ . '/../../config/connect.php';

header('Content-Type: application/json');
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_admin();


try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id']) || !isset($input['reply_message'])) {
        throw new Exception("Message ID and reply_message are required");
    }

    $id = (int)$input['id'];
    $reply = trim($input['reply_message']);

    $stmt = $conn->prepare("UPDATE contact_messages SET reply_message = ?, status = 'replied', updated_at = NOW() WHERE id = ?");
    $stmt->bind_param("si", $reply, $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        // Fetch contact details to send email
        $msg_stmt = $conn->prepare("SELECT name, email, subject, message FROM contact_messages WHERE id = ?");
        $msg_stmt->bind_param("i", $id);
        $msg_stmt->execute();
        $msg_row = $msg_stmt->get_result()->fetch_assoc();
        $msg_stmt->close();

        if ($msg_row && !empty($msg_row['email'])) {
            $emailData = [
                'customerEmail' => $msg_row['email'],
                'customerName' => $msg_row['name'],
                'originalSubject' => $msg_row['subject'],
                'originalMessage' => $msg_row['message'],
                'replyMessage' => $reply
            ];

            $ch = curl_init('http://localhost:3001/send-contact-reply');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_exec($ch);
            curl_close($ch);
        }

        echo json_encode(["success" => true, "message" => "Reply saved and emailed successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Message not found or no changes made"]);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
