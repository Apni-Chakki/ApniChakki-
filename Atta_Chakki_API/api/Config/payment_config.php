<?php
// jazzcash sandbox config
define('JAZZCASH_SANDBOX_MODE', true);

define('JAZZCASH_SANDBOX_API_URL', 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction');
define('JAZZCASH_SANDBOX_CHECKOUT_URL', 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/');
define('JAZZCASH_PRODUCTION_API_URL', 'https://payments.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction');

// sandbox credentials
define('JAZZCASH_MERCHANT_ID', 'MC12345');
define('JAZZCASH_PASSWORD', 'sandbox_password');
define('JAZZCASH_INTEGRITY_SALT', 'sandbox_salt_key');
define('JAZZCASH_RETURN_URL', 'http://localhost/atta_chakki_api/payments/jazzcash_callback.php');

define('JAZZCASH_API_VERSION', '1.1');

// card sandbox config
define('CARD_SANDBOX_MODE', true);

// test card numbers
define('SANDBOX_TEST_CARDS', [
    'visa_success'       => '4242424242424242',
    'visa_decline'       => '4000000000000002',
    'mastercard_success' => '5555555555554444',
    'mastercard_decline' => '5105105105105100',
    'insufficient_funds' => '4000000000009995',
    'expired_card'       => '4000000000000069',
]);

// sandbox simulation settings
define('SIMULATE_SANDBOX_PAYMENTS', true);
define('SANDBOX_PROCESSING_DELAY_MS', 2000);
define('SANDBOX_SUCCESS_RATE', 100);

// getting jazzcash api url
function getJazzCashApiUrl() {
    return JAZZCASH_SANDBOX_MODE ? JAZZCASH_SANDBOX_API_URL : JAZZCASH_PRODUCTION_API_URL;
}

// generating hash for jazzcash
function generateJazzCashHash($params) {
    ksort($params);
    
    $hashString = JAZZCASH_INTEGRITY_SALT;
    foreach ($params as $key => $value) {
        if ($value !== '' && $value !== null) {
            $hashString .= '&' . $value;
        }
    }
    
    return hash_hmac('sha256', $hashString, JAZZCASH_INTEGRITY_SALT);
}

// validating card number with luhn algo
function validateCardNumber($number) {
    $number = preg_replace('/\D/', '', $number);
    $len = strlen($number);
    
    if ($len < 13 || $len > 19) return false;
    
    $sum = 0;
    $alt = false;
    
    for ($i = $len - 1; $i >= 0; $i--) {
        $digit = intval($number[$i]);
        if ($alt) {
            $digit *= 2;
            if ($digit > 9) $digit -= 9;
        }
        $sum += $digit;
        $alt = !$alt;
    }
    
    return ($sum % 10 === 0);
}

// detecting card type from number
function detectCardType($number) {
    $number = preg_replace('/\D/', '', $number);
    
    if (preg_match('/^4/', $number)) return 'visa';
    if (preg_match('/^5[1-5]/', $number)) return 'mastercard';
    if (preg_match('/^3[47]/', $number)) return 'amex';
    if (preg_match('/^6(?:011|5)/', $number)) return 'discover';
    
    return 'unknown';
}
?>
