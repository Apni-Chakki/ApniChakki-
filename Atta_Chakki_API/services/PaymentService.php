<?php
namespace AttaChakki\Services;

use Exception;

// handles online payment processing: jazzcash, cards, bank transfer, wallet
class PaymentService {

    // checks required fields are present
    public static function validatePaymentInput($data) {
        if (!isset($data['order_id']) || !isset($data['user_id']) || !isset($data['payment_method']) || !isset($data['amount'])) {
            return [false, "Missing required fields"];
        }

        $payment_method = strtolower($data['payment_method']);
        $amount = floatval($data['amount']);

        if (!in_array($payment_method, ['jazzcash', 'card', 'bank'])) {
            return [false, "Invalid payment method. Supported: jazzcash, card, bank"];
        }

        if ($amount <= 0) {
            return [false, "Invalid amount"];
        }

        if ($payment_method === 'jazzcash') {
            $user_phone = $data['user_phone'] ?? null;
            if (!$user_phone) {
                return [false, "Mobile number is required for JazzCash"];
            }
            if (!preg_match('/^03[0-9]{9}$/', preg_replace('/[-\s]/', '', $user_phone))) {
                return [false, "Invalid mobile number format. Use 03XXXXXXXXX"];
            }
        }

        if ($payment_method === 'card') {
            $card_number = isset($data['card_number']) ? preg_replace('/\D/', '', $data['card_number']) : null;
            $card_expiry = $data['card_expiry'] ?? null;
            $card_cvv = $data['card_cvv'] ?? null;
            $card_name = $data['card_name'] ?? null;

            if (!$card_number || !$card_expiry || !$card_cvv || !$card_name) {
                return [false, "All card details are required"];
            }
            if (function_exists('validateCardNumber') && !validateCardNumber($card_number)) {
                return [false, "Invalid card number"];
            }
            if (!preg_match('/^[0-9]{3,4}$/', $card_cvv)) {
                return [false, "Invalid CVV"];
            }
            if (!preg_match('/^(0[1-9]|1[0-2])\/([0-9]{2})$/', $card_expiry)) {
                return [false, "Invalid expiry date format. Use MM/YY"];
            }
        }

        if ($payment_method === 'bank' && empty($data['bank_account_number'])) {
            return [false, "Bank account number is required"];
        }

        return [true, null];
    }

    // processes jazzcash mwallet payment
    public static function processJazzCashPayment($phone, $amount, $transaction_id, $cnic_last6 = null) {
        $phone = preg_replace('/[-\s]/', '', $phone);

        if (defined('SIMULATE_SANDBOX_PAYMENTS') && SIMULATE_SANDBOX_PAYMENTS) {
            $delay = defined('SANDBOX_PROCESSING_DELAY_MS') ? SANDBOX_PROCESSING_DELAY_MS : 2000;
            usleep($delay * 1000);

            $successRate = defined('SANDBOX_SUCCESS_RATE') ? SANDBOX_SUCCESS_RATE : 100;
            $random = rand(1, 100);
            $is_success = ($random <= $successRate);

            if ($phone === '03000000000') {
                return [
                    'success' => false,
                    'message' => 'Insufficient JazzCash wallet balance',
                    'response_code' => '210',
                    'sandbox' => true
                ];
            }

            if ($phone === '03111111111') {
                return [
                    'success' => false,
                    'message' => 'JazzCash account not found or inactive',
                    'response_code' => '404',
                    'sandbox' => true
                ];
            }

            if ($phone === '03999999999') {
                return [
                    'success' => false,
                    'message' => 'JazzCash gateway timeout. Please try again.',
                    'response_code' => '408',
                    'sandbox' => true
                ];
            }

            if ($is_success) {
                return [
                    'success' => true,
                    'message' => 'JazzCash payment of Rs. ' . number_format($amount, 2) . ' processed successfully (Sandbox)',
                    'response_code' => '000',
                    'gateway_txn_id' => 'JC-SB-' . time() . '-' . rand(100000, 999999),
                    'phone' => $phone,
                    'amount' => $amount,
                    'sandbox' => true,
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'JazzCash payment failed (Sandbox simulation)',
                    'response_code' => '999',
                    'sandbox' => true
                ];
            }
        }

        // real jazzcash api call
        $datetime = date('YmdHis');
        $expiry = date('YmdHis', strtotime('+1 hour'));
        $amount_in_paisa = intval($amount * 100);

        $params = [
            'pp_Version'           => defined('JAZZCASH_API_VERSION') ? JAZZCASH_API_VERSION : '1.1',
            'pp_TxnType'           => 'MWALLET',
            'pp_Language'          => 'EN',
            'pp_MerchantID'        => defined('JAZZCASH_MERCHANT_ID') ? JAZZCASH_MERCHANT_ID : '',
            'pp_SubMerchantID'     => '',
            'pp_Password'          => defined('JAZZCASH_PASSWORD') ? JAZZCASH_PASSWORD : '',
            'pp_BankID'            => '',
            'pp_ProductID'         => '',
            'pp_TxnRefNo'          => $transaction_id,
            'pp_Amount'            => strval($amount_in_paisa),
            'pp_TxnCurrency'       => 'PKR',
            'pp_TxnDateTime'       => $datetime,
            'pp_TxnExpiryDateTime' => $expiry,
            'pp_BillReference'     => 'OrderPayment',
            'pp_Description'       => 'Order Payment via JazzCash',
            'pp_MobileNumber'      => $phone,
            'pp_CNIC'              => $cnic_last6 ?? '',
            'pp_ReturnURL'         => defined('JAZZCASH_RETURN_URL') ? JAZZCASH_RETURN_URL : '',
        ];

        if (function_exists('generateJazzCashHash')) {
            $params['pp_SecureHash'] = generateJazzCashHash($params);
        }

        $apiUrl = function_exists('getJazzCashApiUrl') ? getJazzCashApiUrl() : (defined('JAZZCASH_SANDBOX_API_URL') ? JAZZCASH_SANDBOX_API_URL : '');

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($params),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT        => 30,
        ]);

        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($curl_error) {
            return [
                'success' => false,
                'message' => 'Network error: ' . $curl_error,
                'response_code' => 'CURL_ERROR'
            ];
        }

        $result = json_decode($response, true);

        if (!$result) {
            return [
                'success' => false,
                'message' => 'Invalid response from JazzCash gateway',
                'response_code' => 'PARSE_ERROR',
                'raw_response' => substr($response, 0, 500)
            ];
        }

        if (isset($result['pp_ResponseCode']) && $result['pp_ResponseCode'] === '000') {
            return [
                'success' => true,
                'message' => $result['pp_ResponseMessage'] ?? 'Payment successful',
                'response_code' => '000',
                'gateway_txn_id' => $result['pp_TxnRefNo'] ?? $transaction_id,
                'phone' => $phone,
                'amount' => $amount,
                'raw_response' => $result
            ];
        }

        return [
            'success' => false,
            'message' => $result['pp_ResponseMessage'] ?? 'Payment failed',
            'response_code' => $result['pp_ResponseCode'] ?? 'UNKNOWN',
            'raw_response' => $result
        ];
    }

    // processes credit/debit card payment
    public static function processCreditCardPayment($card_number, $expiry, $cvv, $card_name, $amount, $transaction_id) {
        $card_type = function_exists('detectCardType') ? detectCardType($card_number) : 'card';
        $masked_card = str_repeat('*', max(0, strlen($card_number) - 4)) . substr($card_number, -4);

        if (defined('SIMULATE_SANDBOX_PAYMENTS') && SIMULATE_SANDBOX_PAYMENTS) {
            $delay = defined('SANDBOX_PROCESSING_DELAY_MS') ? SANDBOX_PROCESSING_DELAY_MS : 2000;
            usleep($delay * 1000);

            $test_cards = defined('SANDBOX_TEST_CARDS') ? SANDBOX_TEST_CARDS : [];

            if (!empty($test_cards)) {
                if ($card_number === ($test_cards['visa_decline'] ?? '') || $card_number === ($test_cards['mastercard_decline'] ?? '')) {
                    return [
                        'success' => false,
                        'message' => 'Card declined by issuing bank',
                        'response_code' => '05',
                        'card_type' => $card_type,
                        'masked_card' => $masked_card,
                        'sandbox' => true
                    ];
                }

                if ($card_number === ($test_cards['insufficient_funds'] ?? '')) {
                    return [
                        'success' => false,
                        'message' => 'Insufficient funds',
                        'response_code' => '51',
                        'card_type' => $card_type,
                        'masked_card' => $masked_card,
                        'sandbox' => true
                    ];
                }

                if ($card_number === ($test_cards['expired_card'] ?? '')) {
                    return [
                        'success' => false,
                        'message' => 'Card has expired',
                        'response_code' => '54',
                        'card_type' => $card_type,
                        'masked_card' => $masked_card,
                        'sandbox' => true
                    ];
                }
            }

            // check expiry for non-test cards
            if (strpos($expiry, '/') !== false) {
                list($exp_month, $exp_year) = explode('/', $expiry);
                $exp_year = intval('20' . $exp_year);
                $exp_month = intval($exp_month);
                $current_year = intval(date('Y'));
                $current_month = intval(date('m'));

                if ($exp_year < $current_year || ($exp_year === $current_year && $exp_month < $current_month)) {
                    return [
                        'success' => false,
                        'message' => 'Card has expired',
                        'response_code' => '54',
                        'card_type' => $card_type,
                        'masked_card' => $masked_card,
                        'sandbox' => true
                    ];
                }
            }

            $successRate = defined('SANDBOX_SUCCESS_RATE') ? SANDBOX_SUCCESS_RATE : 100;
            $random = rand(1, 100);
            $is_success = ($random <= $successRate);

            if ($is_success) {
                return [
                    'success' => true,
                    'message' => 'Card payment of Rs. ' . number_format($amount, 2) . ' authorized successfully (Sandbox)',
                    'response_code' => '00',
                    'authorization_code' => 'AUTH-' . strtoupper(substr(md5(time()), 0, 8)),
                    'card_type' => $card_type,
                    'masked_card' => $masked_card,
                    'cardholder_name' => $card_name,
                    'amount' => $amount,
                    'sandbox' => true,
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Card payment declined (Sandbox simulation)',
                    'response_code' => '999',
                    'sandbox' => true
                ];
            }
        }

        return [
            'success' => false,
            'message' => 'Card payment gateway not configured for production',
            'response_code' => 'NOT_CONFIGURED'
        ];
    }

    // deducts from user wallet, credits primary business account
    public static function deductUserWalletAndCreditBusiness($conn, $user_id, $amount) {
        $wallet_check = $conn->prepare("SELECT id, balance FROM user_wallets WHERE user_id = ?");
        $wallet_check->bind_param("i", $user_id);
        $wallet_check->execute();
        $wallet_result = $wallet_check->get_result();

        if ($wallet_result->num_rows === 0) {
            $create_wallet = $conn->prepare("INSERT INTO user_wallets (user_id, balance) VALUES (?, 0.00)");
            $create_wallet->bind_param("i", $user_id);
            $create_wallet->execute();
            $create_wallet->close();
            $user_balance_before = 0;
        } else {
            $wallet = $wallet_result->fetch_assoc();
            $user_balance_before = floatval($wallet['balance']);
        }
        $wallet_check->close();

        // deduct from user
        $user_balance_after = $user_balance_before - $amount;
        $deduct_stmt = $conn->prepare("UPDATE user_wallets SET balance = ? WHERE user_id = ?");
        $deduct_stmt->bind_param("di", $user_balance_after, $user_id);

        if (!$deduct_stmt->execute()) {
            throw new Exception("Failed to deduct from user wallet");
        }
        $deduct_stmt->close();

        // credit to business
        $business_stmt = $conn->prepare("SELECT id, balance FROM business_accounts WHERE is_primary = 1 AND is_active = 1 LIMIT 1");
        $business_stmt->execute();
        $business_result = $business_stmt->get_result();

        if ($business_result->num_rows > 0) {
            $business_account = $business_result->fetch_assoc();
            $business_id = intval($business_account['id']);
            $business_balance_after = floatval($business_account['balance']) + $amount;

            $credit_stmt = $conn->prepare("UPDATE business_accounts SET balance = ? WHERE id = ?");
            $credit_stmt->bind_param("di", $business_balance_after, $business_id);
            $credit_stmt->execute();
            $credit_stmt->close();
        }
        $business_stmt->close();
    }

    // runs the full online payment flow for an order
    public static function processOnlinePaymentTransaction($conn, array $data) {
        list($isValid, $errorMsg) = self::validatePaymentInput($data);
        if (!$isValid) {
            return [
                "success" => false,
                "message" => $errorMsg
            ];
        }

        $order_id = intval($data['order_id']);
        $user_id = intval($data['user_id']);
        $payment_method = strtolower($data['payment_method']);
        $amount = floatval($data['amount']);
        $user_phone = $data['user_phone'] ?? null;
        $bank_account_number = $data['bank_account_number'] ?? null;

        $card_number = isset($data['card_number']) ? preg_replace('/\D/', '', $data['card_number']) : null;
        $card_expiry = $data['card_expiry'] ?? null;
        $card_cvv = $data['card_cvv'] ?? null;
        $card_name = $data['card_name'] ?? null;
        $cnic_last6 = $data['cnic_last6'] ?? null;

        $conn->begin_transaction();

        try {
            // 1. check order exists
            $order_stmt = $conn->prepare("SELECT o.id, o.total_amount, o.user_id, o.payment_status FROM orders o WHERE o.id = ? AND o.user_id = ?");
            $order_stmt->bind_param("ii", $order_id, $user_id);
            $order_stmt->execute();
            $order_result = $order_stmt->get_result();

            if ($order_result->num_rows === 0) {
                throw new Exception("Order not found or unauthorized");
            }

            $order = $order_result->fetch_assoc();
            $order_stmt->close();

            if ($order['payment_status'] === 'paid') {
                throw new Exception("Order already paid");
            }

            $orderTotal = floatval($order['total_amount']);
            if ($orderTotal > 0 && ($amount > $orderTotal || $amount <= 0)) {
                throw new Exception("Payment amount exceeds order total");
            }

            // 2. make transaction id
            $transaction_id = strtoupper($payment_method) . '-' . date('YmdHis') . '-' . rand(1000, 9999);

            // 3. save payment record as processing
            $payment_stmt = $conn->prepare("INSERT INTO payment_transactions (order_id, user_id, payment_method, amount, transaction_id, payment_status, user_phone, bank_account_number, gateway_response) VALUES (?, ?, ?, ?, ?, 'processing', ?, ?, ?)");
            $initial_response = json_encode(['status' => 'initiated', 'sandbox' => defined('JAZZCASH_SANDBOX_MODE') ? JAZZCASH_SANDBOX_MODE : true]);
            $payment_stmt->bind_param("iisdssss", $order_id, $user_id, $payment_method, $amount, $transaction_id, $user_phone, $bank_account_number, $initial_response);

            if (!$payment_stmt->execute()) {
                throw new Exception("Failed to create payment transaction");
            }

            $payment_transaction_id = $conn->insert_id;
            $payment_stmt->close();

            // 4. run payment for the chosen method
            $payment_gateway_response = null;
            $payment_successful = false;
            $gateway_transaction_id = null;

            if ($payment_method === 'jazzcash') {
                $payment_result = self::processJazzCashPayment($user_phone, $amount, $transaction_id, $cnic_last6);
                if ($payment_result['success']) {
                    $payment_successful = true;
                    $gateway_transaction_id = $payment_result['gateway_txn_id'] ?? $transaction_id;
                    $payment_gateway_response = json_encode($payment_result);
                } else {
                    throw new Exception("JazzCash payment failed: " . $payment_result['message']);
                }
            } elseif ($payment_method === 'card') {
                $payment_result = self::processCreditCardPayment($card_number, $card_expiry, $card_cvv, $card_name, $amount, $transaction_id);
                if ($payment_result['success']) {
                    $payment_successful = true;
                    $gateway_transaction_id = $payment_result['authorization_code'] ?? $transaction_id;
                    $payment_gateway_response = json_encode($payment_result);
                } else {
                    throw new Exception("Card payment failed: " . $payment_result['message']);
                }
            } elseif ($payment_method === 'bank') {
                $payment_successful = false;
                $payment_gateway_response = json_encode([
                    'status' => 'pending_verification',
                    'message' => 'Bank transfer initiated. Awaiting admin verification.',
                    'bank_account' => $bank_account_number,
                    'reference' => $transaction_id,
                    'sandbox' => defined('CARD_SANDBOX_MODE') ? CARD_SANDBOX_MODE : true
                ]);
            }

            // 5. update wallet if payment went through
            if ($payment_successful) {
                self::deductUserWalletAndCreditBusiness($conn, $user_id, $amount);
            }

            // 6. update payment status
            $status = $payment_successful ? 'completed' : 'pending';
            $update_payment = $conn->prepare("UPDATE payment_transactions SET payment_status = ?, gateway_response = ?, completed_at = NOW() WHERE id = ?");
            $update_payment->bind_param("ssi", $status, $payment_gateway_response, $payment_transaction_id);
            $update_payment->execute();
            $update_payment->close();

            // 7. update order's payment status + amount paid
            $new_order_status = $payment_successful ? 'paid' : 'pending';
            $amount_paid = $payment_successful ? $amount : 0;
            $db_txn_id = $gateway_transaction_id ?? $transaction_id;

            $update_order = $conn->prepare("UPDATE orders SET payment_status = ?, payment_method = 'online', transaction_id = ?, amount_paid = ? WHERE id = ?");
            $update_order->bind_param("ssdi", $new_order_status, $db_txn_id, $amount_paid, $order_id);

            if (!$update_order->execute()) {
                throw new Exception("Failed to update order");
            }
            $update_order->close();

            // 8. also log in payments table
            if ($payment_successful) {
                $pay_stmt = $conn->prepare("INSERT INTO payments (order_id, amount, payment_method, transaction_id) VALUES (?, ?, ?, ?)");
                $pay_stmt->bind_param("idss", $order_id, $amount, $payment_method, $db_txn_id);
                $pay_stmt->execute();
                $pay_stmt->close();
            }

            $conn->commit();

            // build response
            if ($payment_successful) {
                $method_label = $payment_method === 'jazzcash' ? 'JazzCash' : ($payment_method === 'card' ? 'Credit/Debit Card' : 'Bank Transfer');
                $message = "Payment of Rs. " . number_format($amount, 2) . " via {$method_label} processed successfully!";

                if ((defined('JAZZCASH_SANDBOX_MODE') && JAZZCASH_SANDBOX_MODE) || (defined('CARD_SANDBOX_MODE') && CARD_SANDBOX_MODE)) {
                    $message .= " (Sandbox Mode)";
                }
            } else {
                $message = "Bank transfer initiated. Reference: {$transaction_id}. Please wait for admin verification.";
            }

            return [
                "success" => true,
                "message" => $message,
                "payment_status" => $new_order_status,
                "transaction_id" => $gateway_transaction_id ?? $transaction_id,
                "payment_method" => $payment_method,
                "amount" => $amount,
                "sandbox" => ((defined('JAZZCASH_SANDBOX_MODE') && JAZZCASH_SANDBOX_MODE) || (defined('CARD_SANDBOX_MODE') && CARD_SANDBOX_MODE)),
                "order_id" => $order_id
            ];

        } catch (Exception $e) {
            $conn->rollback();

            if (isset($payment_transaction_id)) {
                $error_stmt = $conn->prepare("UPDATE payment_transactions SET payment_status = 'failed', error_message = ? WHERE id = ?");
                $error_msg = $e->getMessage();
                $error_stmt->bind_param("si", $error_msg, $payment_transaction_id);
                $error_stmt->execute();
                $error_stmt->close();
            }

            return [
                "success" => false,
                "message" => "Payment processing failed: " . $e->getMessage()
            ];
        }
    }
}
