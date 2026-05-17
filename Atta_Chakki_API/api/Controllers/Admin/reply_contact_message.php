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
    // 2. Try to send email (Best effort)
    $subject = "Re: " . ($original_subject ?: "Contact Inquiry") . " - Apni Chakki";
    $headers = "From: no-reply@apnichakki.com\r\n";
    $headers .= "Reply-To: support@apnichakki.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    $email_body = "Hello $customer_name,\n\n";
    $email_body .= "Thank you for contacting us. Here is our reply to your message:\n\n";
    $email_body .= "$data[reply_message]\n\n";
    $email_body .= "---\nBest Regards,\nApni Chakki Team";
    
    // mail() might not work on localhost, but we return success because DB updated
    $mail_sent = @mail($to, $subject, $email_body, $headers);
    
    echo json_encode([
        "success" => true, 
        "message" => "Reply saved and status updated to 'Replied'." . ($mail_sent ? "" : " (Note: Email sending might require server configuration)"),
        "mail_sent" => $mail_sent
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Error updating record: " . $conn->error]);
}

$conn->close();
