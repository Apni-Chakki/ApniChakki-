<?php
/**
 * Payment Sandbox Test Endpoint
 * Use this to test payment processing without placing a real order
 * 
 * API Endpoint: POST /payments/test_payment.php
 * 
 * IMPORTANT: This endpoint should be disabled in production!
 */
require_once __DIR__ . '/../config/cors.php';
include __DIR__ . '/../config/connect.php';
require_once __DIR__ . '/../config/payment_config.php';

header('Content-Type: application/json');

// Only allow in sandbox mode
if (!JAZZCASH_SANDBOX_MODE && !CARD_SANDBOX_MODE) {
    echo json_encode(["success" => false, "message" => "Test endpoint disabled in production"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['test_type'])) {
    // Return test information
    echo json_encode([
        "success" => true,
        "message" => "Payment Sandbox Test Endpoint",
        "sandbox_mode" => true,
        "available_tests" => [
            "jazzcash_success" => [
                "test_type" => "jazzcash",
                "phone" => "03211234567",
                "amount" => 100,
                "description" => "Test successful JazzCash payment"
            ],
            "jazzcash_insufficient_balance" => [
                "test_type" => "jazzcash",
                "phone" => "03000000000",
                "amount" => 100,
                "description" => "Test JazzCash insufficient balance"
            ],
            "jazzcash_invalid_account" => [
                "test_type" => "jazzcash",
                "phone" => "03111111111",
                "amount" => 100,
                "description" => "Test JazzCash invalid account"
            ],
            "jazzcash_timeout" => [
                "test_type" => "jazzcash",
                "phone" => "03999999999",
                "amount" => 100,
                "description" => "Test JazzCash timeout"
            ],
            "card_visa_success" => [
                "test_type" => "card",
                "card_number" => "4242424242424242",
                "card_expiry" => "12/28",
                "card_cvv" => "123",
                "card_name" => "Test User",
                "amount" => 100,
                "description" => "Test successful Visa card payment"
            ],
            "card_mastercard_success" => [
                "test_type" => "card",
                "card_number" => "5555555555554444",
                "card_expiry" => "12/28",
                "card_cvv" => "123",
                "card_name" => "Test User",
                "amount" => 100,
                "description" => "Test successful Mastercard payment"
            ],
            "card_declined" => [
                "test_type" => "card",
                "card_number" => "4000000000000002",
                "card_expiry" => "12/28",
                "card_cvv" => "123",
                "card_name" => "Test User",
                "amount" => 100,
                "description" => "Test declined card"
            ],
            "card_insufficient_funds" => [
                "test_type" => "card",
                "card_number" => "4000000000009995",
                "card_expiry" => "12/28",
                "card_cvv" => "123",
                "card_name" => "Test User",
                "amount" => 100,
                "description" => "Test insufficient funds"
            ],
            "bank_transfer" => [
                "test_type" => "bank",
                "bank_account_number" => "1234567890",
                "amount" => 100,
                "description" => "Test bank transfer (always pending)"
            ]
        ],
        "test_cards" => SANDBOX_TEST_CARDS,
        "test_phones" => [
            "03211234567" => "Always succeeds",
            "03000000000" => "Always fails - insufficient balance",
            "03111111111" => "Always fails - invalid account",
            "03999999999" => "Always fails - timeout"
        ]
    ]);
    exit;
}

$test_type = $data['test_type'];
$amount = floatval($data['amount'] ?? 100);
$transaction_id = 'TEST-' . date('YmdHis') . '-' . rand(1000, 9999);

$result = null;

switch ($test_type) {
    case 'jazzcash':
        $phone = $data['phone'] ?? '03211234567';
        $cnic = $data['cnic_last6'] ?? null;
        $result = processJazzCashPayment($phone, $amount, $transaction_id, $cnic);
        break;
        
    case 'card':
        $card_number = preg_replace('/\D/', '', $data['card_number'] ?? '4242424242424242');
        $card_expiry = $data['card_expiry'] ?? '12/28';
        $card_cvv = $data['card_cvv'] ?? '123';
        $card_name = $data['card_name'] ?? 'Test User';
        
        // Validate card first
        if (!validateCardNumber($card_number)) {
            echo json_encode(["success" => false, "message" => "Invalid card number (Luhn check failed)", "card_type" => detectCardType($card_number)]);
            exit;
        }
        
        $result = processCreditCardPayment($card_number, $card_expiry, $card_cvv, $card_name, $amount, $transaction_id);
        break;
        
    case 'bank':
        $result = [
            'success' => true,
            'message' => 'Bank transfer test - always returns pending status',
            'status' => 'pending_verification',
            'bank_account' => $data['bank_account_number'] ?? '1234567890',
            'reference' => $transaction_id,
            'sandbox' => true
        ];
        break;
        
    default:
        echo json_encode(["success" => false, "message" => "Invalid test type. Use: jazzcash, card, or bank"]);
        exit;
}

echo json_encode([
    "success" => true,
    "test_type" => $test_type,
    "transaction_id" => $transaction_id,
    "gateway_result" => $result,
    "sandbox" => true,
    "timestamp" => date('Y-m-d H:i:s')
]);
?>
