<?php
/* 
 * Process Online Payment Controller
 * Handles JazzCash (MWALLET), Credit Card, and Bank Transfer payments
 * Supports both Sandbox simulation and real API calls
 * 
 * API Endpoint: POST /payments/process_online_payment.php
 */
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../config/payment_config.php';
require_once __DIR__ . '/../../core/autoload.php';

use AttaChakki\Services\PaymentService;

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$result = PaymentService::processOnlinePaymentTransaction($conn, $data);

echo json_encode($result);
