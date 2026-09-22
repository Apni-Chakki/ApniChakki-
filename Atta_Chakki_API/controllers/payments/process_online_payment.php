<?php
// handles jazzcash, card and bank transfer payments, sandbox or real api
require_once __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../config/payment_config.php';
require_once __DIR__ . '/../../core/autoload.php';
require_once __DIR__ . '/../../utils/auth_middleware.php';
require_once __DIR__ . '/../../utils/cache_helper.php';

use AttaChakki\Services\PaymentService;

header('Content-Type: application/json');

$authUser = require_auth(false);

$data = json_decode(file_get_contents("php://input"), true) ?? [];

if ($authUser && isset($authUser['id']) && (!isset($authUser['role']) || $authUser['role'] !== 'admin')) {
    $data['user_id'] = $authUser['id'];
}

$result = PaymentService::processOnlinePaymentTransaction($conn, $data);

if (isset($result['success']) && $result['success']) {
    clear_api_cache();
}

echo json_encode($result);

