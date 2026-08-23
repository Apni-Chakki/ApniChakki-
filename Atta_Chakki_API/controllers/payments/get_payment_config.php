<?php
/* 
 * Get Digital Payment System Status & Config
 * API Endpoint: GET /payments/get_payment_config.php
 */
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../config/payment_config.php';

header('Content-Type: application/json');

echo json_encode([
    "success" => true,
    "payment_mode" => IS_SANDBOX_ENVIRONMENT ? "sandbox" : "production",
    "is_sandbox" => IS_SANDBOX_ENVIRONMENT,
    "jazzcash_sandbox" => JAZZCASH_SANDBOX_MODE,
    "card_sandbox" => CARD_SANDBOX_MODE,
    "simulate_sandbox" => SIMULATE_SANDBOX_PAYMENTS,
    "jazzcash_merchant_id" => (JAZZCASH_MERCHANT_ID === 'MC12345') ? 'MC12345 (Sandbox)' : (substr(JAZZCASH_MERCHANT_ID, 0, 4) . '****')
]);
?>
