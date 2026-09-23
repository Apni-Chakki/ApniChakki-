<?php
// utils/email_helper.php
require_once __DIR__ . '/../config/connect.php';

// direct smtp mailer with starttls, fallback when node socket server is down
function send_smtp_direct($to, $subject, $htmlContent, $fromName = null, $fromEmail = null)
{
    global $envVars;

    $host = $envVars['SMTP_HOST'] ?? getenv('SMTP_HOST') ?: 'smtp.gmail.com';
    $port = (int)($envVars['SMTP_PORT'] ?? getenv('SMTP_PORT') ?: 587);
    $user = $envVars['SMTP_USER'] ?? getenv('SMTP_USER') ?: null;
    $pass = $envVars['SMTP_PASS'] ?? getenv('SMTP_PASS') ?: null;

    $fromEmail = $fromEmail ?: ($envVars['EMAIL_FROM'] ?? getenv('EMAIL_FROM') ?: $user);
    $fromName = $fromName ?: ($envVars['EMAIL_FROM_NAME'] ?? getenv('EMAIL_FROM_NAME') ?: 'Suchi Chakki');

    // Open connection
    $socket = @fsockopen($host, $port, $errno, $errstr, 5);
    if (!$socket) {
        error_log("Direct SMTP Connection failed: $errstr ($errno)");
        return false;
    }

    $read = function () use ($socket) {
        $res = "";
        while ($str = fgets($socket, 515)) {
            $res .= $str;
            if (substr($str, 3, 1) === ' ') break;
        }
        return $res;
    };

    $write = function ($cmd) use ($socket) {
        fputs($socket, $cmd . "\r\n");
    };

    $res = $read();
    if (substr($res, 0, 3) !== '220') {
        fclose($socket);
        return false;
    }

    $write("EHLO " . (gethostname() ?: 'localhost'));
    $read();

    $write("STARTTLS");
    $res = $read();
    if (substr($res, 0, 3) !== '220') {
        fclose($socket);
        return false;
    }

    $crypto_method = STREAM_CRYPTO_METHOD_TLS_CLIENT;
    if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
        $crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
    }
    if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
        $crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
    }

    if (!@stream_socket_enable_crypto($socket, true, $crypto_method)) {
        fclose($socket);
        return false;
    }

    $write("EHLO " . (gethostname() ?: 'localhost'));
    $read();

    $write("AUTH LOGIN");
    $read();

    $write(base64_encode($user));
    $read();

    $write(base64_encode($pass));
    $res = $read();
    if (substr($res, 0, 3) !== '235') {
        fclose($socket);
        return false;
    }

    $write("MAIL FROM: <$fromEmail>");
    $read();

    $write("RCPT TO: <$to>");
    $read();

    $write("DATA");
    $read();

    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromEmail>\r\n";
    $headers .= "To: <$to>\r\n";
    $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: base64\r\n\r\n";

    $body = chunk_split(base64_encode($htmlContent));

    $write($headers . $body . "\r\n.");
    $res = $read();

    $write("QUIT");
    fclose($socket);

    return (substr($res, 0, 3) === '250');
}

// renders email html templates for the direct smtp fallback path
function render_php_email_template($endpoint, $payload)
{
    $storeName = $payload['storeName'] ?? 'Suchi Chakki';
    $storePhone = $payload['storePhone'] ?? '+92 322 8483029';

    switch ($endpoint) {
        case '/send-order-confirmation':
            $itemsHtml = '';
            if (!empty($payload['orderItems']) && is_array($payload['orderItems'])) {
                foreach ($payload['orderItems'] as $item) {
                    $itemsHtml .= '<tr><td style="padding: 10px; border-bottom: 1px solid #ddd;">' . htmlspecialchars($item['name']) . '</td>';
                    $itemsHtml .= '<td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">' . htmlspecialchars($item['quantity']) . '</td>';
                    $itemsHtml .= '<td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Rs. ' . htmlspecialchars($item['price']) . '</td></tr>';
                }
            }
            $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#333;}.container{max-width:600px;margin:0 auto;background-color:#f9f9f9;padding:20px;border-radius:8px;}.header{background-color:#8B7355;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;}.content{background-color:white;padding:20px;}.order-id{font-size:24px;font-weight:bold;color:#8B7355;margin:10px 0;}table{width:100%;border-collapse:collapse;margin:20px 0;}table th{background-color:#f0f0f0;padding:10px;text-align:left;}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px;padding-top:20px;border-top:1px solid #ddd;}</style></head><body>';
            $html .= '<div class="container"><div class="header"><h1>🌾 ' . htmlspecialchars($storeName) . '</h1><p>Order Confirmation</p></div>';
            $html .= '<div class="content"><p>السلام علیکم، <strong>' . htmlspecialchars($payload['customerName'] ?? 'Customer') . '</strong></p>';
            $html .= '<p>Thank you for your order! Here are your order details:</p>';
            $html .= '<div class="order-id">Order ID: #' . htmlspecialchars($payload['orderId'] ?? '') . '</div>';
            $html .= '<h3>Order Items:</h3><table><tr><th>Product</th><th>Quantity</th><th>Price</th></tr>' . $itemsHtml . '</table>';
            $html .= '<h3>Total: Rs. ' . htmlspecialchars($payload['totalPrice'] ?? '0') . '</h3>';
            if (!empty($payload['deliveryAddress'])) {
                $html .= '<h3>Delivery Address:</h3><p>' . htmlspecialchars($payload['deliveryAddress']) . '</p>';
            }
            $html .= '<p>Your order will be delivered soon.</p>';
            $html .= '<div class="footer"><p>Thank you for choosing ' . htmlspecialchars($storeName) . '!</p><p>📞 Contact: ' . htmlspecialchars($storePhone) . '</p></div></div></div></body></html>';
            return [
                'to' => $payload['customerEmail'],
                'subject' => 'Order Confirmation - Order #' . ($payload['orderId'] ?? ''),
                'html' => $html
            ];

        case '/send-password-reset':
            $otp = $payload['otp'] ?? '';
            $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:\'Segoe UI\',Arial,sans-serif;background-color:#f5f0eb;padding:20px;}.container{max-width:480px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}.header{background:linear-gradient(135deg,#8b6f47,#6d5635);padding:30px;text-align:center;color:white;}.body{padding:30px;}.otp-box{background:#f5f0eb;border:2px dashed #8b6f47;border-radius:10px;padding:20px;text-align:center;margin:20px 0;}.otp-code{font-size:36px;font-weight:700;color:#8b6f47;letter-spacing:8px;}.footer{padding:20px;background:#faf8f5;text-align:center;color:#999;font-size:12px;}</style></head><body>';
            $html .= '<div class="container"><div class="header"><h1>🌾 ' . htmlspecialchars($storeName) . '</h1></div><div class="body">';
            $html .= '<p>Assalam o Alaikum <strong>' . htmlspecialchars($payload['name'] ?? 'User') . '</strong>,</p>';
            $html .= '<p>You requested a password reset. Use the following OTP to reset your password:</p>';
            $html .= '<div class="otp-box"><p style="margin:0;color:#666;font-size:14px;">Your Verification Code</p><div class="otp-code">' . htmlspecialchars($otp) . '</div><p style="margin:0;color:#999;font-size:12px;">Valid for 15 minutes</p></div>';
            $html .= '<p>If you did not request this, please ignore this email.</p></div><div class="footer"><p>&copy; ' . htmlspecialchars($storeName) . '</p></div></div></body></html>';
            return [
                'to' => $payload['email'],
                'subject' => 'Suchi Chakki - Password Reset OTP',
                'html' => $html
            ];

        case '/send-order-status-update':
            $status = $payload['newStatus'] ?? '';
            $statusMap = [
                'pending' => 'Pending / زیر التواء',
                'processing' => 'Processing / تیاری جاری ہے',
                'ready' => 'Ready for Delivery / ڈیلیوری کے لیے تیار',
                'batch_ready' => 'Ready for Delivery / ڈیلیوری کے لیے تیار',
                'out-for-delivery' => 'Out for Delivery / ڈیلیوری کے لیے روانہ',
                'completed' => 'Delivered & Completed / ڈیلیور ہو گیا',
                'cancelled' => 'Cancelled / منسوخ شدہ',
                'scheduled-tomorrow' => 'Scheduled for Tomorrow / کل کے لیے شیڈول',
                'pickup_pending' => 'Pending Pickup / پک اپ کا انتظار',
                'coming_for_pickup' => 'Rider Coming for Pickup / رائڈر پک اپ کے لیے آ رہا ہے',
                'arrived_at_shop' => 'Arrived at Shop / دکان پر پہنچ گیا'
            ];
            $displayStatus = $statusMap[$status] ?? $status;
            $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;background-color:#faf7f2;padding:20px;}.container{max-width:550px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e8dcc4;}.header{background:#8B7355;padding:25px;text-align:center;color:white;}.body{padding:30px;line-height:1.6;}.status-box{background-color:#fcf8f2;border-left:4px solid #8B7355;padding:15px;margin:20px 0;font-size:16px;font-weight:bold;}.footer{padding:20px;text-align:center;color:#888;font-size:12px;}</style></head><body>';
            $html .= '<div class="container"><div class="header"><h1>🌾 ' . htmlspecialchars($storeName) . ' - Order Update</h1></div><div class="body">';
            $html .= '<p>Assalam-o-Alaikum <strong>' . htmlspecialchars($payload['customerName'] ?? 'Customer') . '</strong>,</p>';
            $html .= '<p>Your order <strong>#' . htmlspecialchars($payload['orderId'] ?? '') . '</strong> status has been updated:</p>';
            $html .= '<div class="status-box">New Status: ' . htmlspecialchars($displayStatus) . '</div>';
            if (!empty($payload['cancellationReason'])) {
                $html .= '<p style="color:#d32f2f;"><strong>Reason:</strong> ' . htmlspecialchars($payload['cancellationReason']) . '</p>';
            }
            $html .= '</div><div class="footer"><p>🌾 ' . htmlspecialchars($storeName) . '</p></div></div></body></html>';
            return [
                'to' => $payload['customerEmail'],
                'subject' => 'Order Status Update - Order #' . ($payload['orderId'] ?? ''),
                'html' => $html
            ];

        case '/send-contact-reply':
            $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:20px;}.container{max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:8px;}.header{background:#8B7355;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;}.content{background:white;padding:25px;border-radius:0 0 8px 8px;}.reply-box{background:#fcf8f2;border:1px solid #e8d8c8;padding:20px;margin:20px 0;border-radius:6px;}</style></head><body>';
            $html .= '<div class="container"><div class="header"><h1>🌾 ' . htmlspecialchars($storeName) . '</h1><p>Response to Your Inquiry</p></div>';
            $html .= '<div class="content"><p>السلام علیکم <strong>' . htmlspecialchars($payload['customerName'] ?? 'Customer') . '</strong>,</p>';
            $html .= '<p>Thank you for reaching out to us. Here is the response to your message:</p>';
            $html .= '<div class="reply-box"><h4 style="margin-top:0;color:#8B7355;">Our Reply:</h4><p style="white-space:pre-wrap;">' . htmlspecialchars($payload['replyMessage'] ?? '') . '</p></div>';
            if (!empty($payload['originalMessage'])) {
                $html .= '<p style="color:#666;font-size:13px;"><strong>Your Original Message:</strong> ' . htmlspecialchars($payload['originalMessage']) . '</p>';
            }
            $html .= '<p>Best regards,<br><strong>' . htmlspecialchars($storeName) . ' Team</strong></p></div></div></body></html>';
            return [
                'to' => $payload['customerEmail'],
                'subject' => 'RE: ' . ($payload['originalSubject'] ?? 'Your Inquiry to Suchi Chakki'),
                'html' => $html
            ];

        case '/send-vip-congratulations':
            $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:20px;}.container{max-width:550px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e8dcc4;}.header{background:linear-gradient(135deg,#8b6f47,#6d5635);padding:30px;text-align:center;color:white;}.body{padding:30px;}</style></head><body>';
            $html .= '<div class="container"><div class="header"><h1>🌾 VIP Promotion / مبارک ہو!</h1><p>You are now a VIP Customer</p></div>';
            $html .= '<div class="body"><p>Assalam-o-Alaikum <strong>' . htmlspecialchars($payload['customerName'] ?? 'Customer') . '</strong>,</p>';
            $html .= '<p>We are delighted to promote you to a <strong>VIP Customer</strong> at ' . htmlspecialchars($storeName) . '! Special privileges (10% discount & Free Delivery) are now active on your account.</p></div></div></body></html>';
            return [
                'to' => $payload['customerEmail'],
                'subject' => '🌾 Congratulations! You are now a Suchi Chakki VIP Customer',
                'html' => $html
            ];

        case '/send-payment-rejection':
            $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:20px;}.container{max-width:550px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e8dcc4;}.header{background:#d32f2f;padding:25px;text-align:center;color:white;}.body{padding:30px;}</style></head><body>';
            $html .= '<div class="container"><div class="header"><h1>❌ Payment Verification Notice ❌</h1></div>';
            $html .= '<div class="body"><p>Assalam-o-Alaikum <strong>' . htmlspecialchars($payload['customerName'] ?? 'Customer') . '</strong>,</p>';
            $html .= '<p>Your bank transfer payment for Order #' . htmlspecialchars($payload['orderId'] ?? '') . ' could not be verified and has been converted to <strong>Cash on Delivery (COD)</strong>.</p>';
            $html .= '<p>Reason: ' . htmlspecialchars($payload['reason'] ?? 'Transaction reference not found') . '</p></div></div></body></html>';
            return [
                'to' => $payload['customerEmail'],
                'subject' => '🔴 Payment Update - Order #' . ($payload['orderId'] ?? ''),
                'html' => $html
            ];

        case '/send-contact-email':
            $adminEmail = $payload['adminEmail'] ?? ($envVars['EMAIL_FROM'] ?? getenv('EMAIL_FROM') ?: 'suchichakki9@gmail.com');
            $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:20px;}.container{max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;border-radius:8px;}</style></head><body>';
            $html .= '<div class="container"><h2>New Contact Message from ' . htmlspecialchars($payload['name'] ?? '') . '</h2>';
            $html .= '<p><strong>Email:</strong> ' . htmlspecialchars($payload['email'] ?? '') . '</p>';
            $html .= '<p><strong>Phone:</strong> ' . htmlspecialchars($payload['phone'] ?? 'N/A') . '</p>';
            $html .= '<p><strong>Subject:</strong> ' . htmlspecialchars($payload['subject'] ?? '') . '</p>';
            $html .= '<p><strong>Message:</strong><br>' . nl2br(htmlspecialchars($payload['message'] ?? '')) . '</p></div></body></html>';
            return [
                'to' => $adminEmail,
                'subject' => 'New Contact Form Submission: ' . ($payload['subject'] ?? 'Inquiry'),
                'html' => $html
            ];

        default:
            return null;
    }
}

// tries node socket server first (local then cloud backup), falls back to direct smtp
function send_email_async($endpoint, $payload)
{
    global $is_localhost;

    // urls to try, in priority order
    $urls = [];
    if (defined('EMAIL_SERVER_URL') && EMAIL_SERVER_URL) {
        $urls[] = rtrim(EMAIL_SERVER_URL, '/') . $endpoint;
    }

    // on localhost, add cloud server as backup too
    if ($is_localhost) {
        $cloudUrl = 'https://socket-server-9b9f3ddbe629.herokuapp.com' . $endpoint;
        if (!in_array($cloudUrl, $urls)) {
            $urls[] = $cloudUrl;
        }
    }

    $post_data = json_encode($payload);

    // Attempt through Node.js endpoints using reliable cURL
    if (function_exists('curl_init')) {
        foreach ($urls as $url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            $res = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);

            if ($res !== false && $http_code >= 200 && $http_code < 400) {
                return true;
            } else {
                error_log("Email dispatch via cURL to $url failed (HTTP $http_code): $err");
            }
        }
    }

    // Fallback: Direct native PHP SMTP Mailer
    $template = render_php_email_template($endpoint, $payload);
    if ($template && !empty($template['to'])) {
        $smtpSuccess = send_smtp_direct($template['to'], $template['subject'], $template['html']);
        if ($smtpSuccess) {
            error_log("Email successfully sent via Direct PHP SMTP to " . $template['to']);
            return true;
        } else {
            error_log("Direct PHP SMTP failed for " . $template['to']);
        }
    }

    return false;
}
