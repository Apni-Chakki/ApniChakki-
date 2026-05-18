<?php
require_once __DIR__ . '/../../Config/cors.php';
require_once __DIR__ . '/../../Config/connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id']) || !isset($data['reply_message'])) {
    echo json_encode(["success" => false, "message" => "Message ID and reply content are required"]);
    exit;
}

$id = intval($data['id']);
$reply_content = $conn->real_escape_string($data['reply_message']);

// Fetch the original message details to get the email
$sql_fetch = "SELECT name, email, subject, message FROM contact_messages WHERE id = $id";
$res_fetch = $conn->query($sql_fetch);
if (!$res_fetch || $res_fetch->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Original message not found"]);
    exit;
}
$original = $res_fetch->fetch_assoc();
$to = $original['email'];
$customer_name = $original['name'];
$original_subject = $original['subject'];

// 1. Update Database
$sql_update = "UPDATE contact_messages SET status = 'replied', reply_message = '$reply_content' WHERE id = $id";

if ($conn->query($sql_update)) {
    // 2. Send email via Node.js nodemailer server
    $emailServerUrl = 'http://localhost:3002/send-contact-reply';

    $emailData = [
        'customerEmail'    => $to,
        'customerName'     => $customer_name,
        'originalSubject'  => $original_subject,
        'originalMessage'  => $original['message'],
        'replyMessage'     => $data['reply_message']
    ];

    $mail_sent = false;
    $mail_error = null;

    $ch = curl_init($emailServerUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    $emailResponse = curl_exec($ch);
    $emailHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($emailHttpCode === 200 && $emailResponse) {
        $decoded = json_decode($emailResponse, true);
        $mail_sent = !empty($decoded['success']);
        if (!$mail_sent && isset($decoded['message'])) {
            $mail_error = $decoded['message'];
        }
    } else {
        $mail_error = $curlErr ?: ("Email server returned HTTP $emailHttpCode");
    }

    echo json_encode([
        "success"    => true,
        "message"    => $mail_sent
            ? "Reply sent and customer notified via email."
            : "Reply saved, but email could not be sent. (" . ($mail_error ?: 'email server unreachable') . ")",
        "mail_sent"  => $mail_sent,
        "mail_error" => $mail_error
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Error updating record: " . $conn->error]);
}

$conn->close();
