<?php
// manage wallets and payment verification controller
include __DIR__ . '/../../config/connect.php';
require_once __DIR__ . '/../../core/autoload.php';

use AttaChakki\Services\WalletService;

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$action = isset($data['action']) ? $data['action'] : 'get_balance';

// Public actions that do not require admin verification
$public_actions = ['get_bank_details'];

// checking if admin
$user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;

if (!in_array($action, $public_actions)) {
    if ($user_id > 0) {
        if (!WalletService::checkAdminAuth($conn, $user_id)) {
            echo json_encode(["success" => false, "message" => "Unauthorized access"]);
            exit;
        }
    }
}

// routing actions
switch ($action) {
    case 'get_bank_details':
        echo json_encode(WalletService::getBankDetails($conn));
        break;

    case 'update_bank_details':
        echo json_encode(WalletService::updateBankDetails($conn, $data));
        break;

    case 'get_balance':
        echo json_encode(WalletService::getBusinessBalance($conn));
        break;

    case 'get_transactions':
        echo json_encode(WalletService::getWalletTransactions($conn, $data));
        break;

    case 'get_payment_history':
        echo json_encode(WalletService::getPaymentHistory($conn, $data));
        break;

    case 'get_payment_stats':
        echo json_encode(WalletService::getPaymentStats($conn));
        break;

    case 'get_pending_verification':
        echo json_encode(WalletService::getPendingBankTransfers($conn));
        break;

    case 'verify_bank_payment':
        echo json_encode(WalletService::verifyBankPayment($conn, $data));
        break;

    case 'reject_bank_payment':
        echo json_encode(WalletService::rejectBankPayment($conn, $data));
        break;

    default:
        echo json_encode(["success" => false, "message" => "Unknown action: $action"]);
}
