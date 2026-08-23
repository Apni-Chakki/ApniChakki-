<?php
/*
 * Payment Gateway Configuration & Environment Loader
 * Dynamically switches between Sandbox and Production modes based on .env
 */

// Load .env variables dynamically
$envFile = __DIR__ . '/../.env';
$envVars = [];
if (file_exists($envFile)) {
    $parsed = parse_ini_file($envFile);
    if ($parsed !== false) {
        $envVars = $parsed;
    }
}

if (!function_exists('getPaymentEnv')) {
    function getPaymentEnv($key, $default = null) {
        global $envVars;
        if (isset($envVars[$key]) && $envVars[$key] !== '') {
            return $envVars[$key];
        }
        $envVal = getenv($key);
        if ($envVal !== false && $envVal !== '') {
            return $envVal;
        }
        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }
        if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
            return $_SERVER[$key];
        }
        return $default;
    }
}

if (!function_exists('getPaymentEnvBool')) {
    function getPaymentEnvBool($key, $default = false) {
        $val = getPaymentEnv($key, null);
        if ($val === null) {
            return $default;
        }
        if (is_bool($val)) return $val;
        $valStr = strtolower(trim((string)$val));
        return in_array($valStr, ['true', '1', 'yes', 'on'], true);
    }
}

// Master Payment Mode: 'sandbox' or 'production' / 'real' / 'live'
$paymentMode = strtolower(trim((string)getPaymentEnv('PAYMENT_MODE', 'sandbox')));
$isProductionMode = in_array($paymentMode, ['production', 'real', 'live'], true);

// JazzCash Configuration
define('JAZZCASH_SANDBOX_MODE', getPaymentEnvBool('JAZZCASH_SANDBOX_MODE', !$isProductionMode));

define('JAZZCASH_SANDBOX_API_URL', getPaymentEnv('JAZZCASH_SANDBOX_API_URL', 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction'));
define('JAZZCASH_SANDBOX_CHECKOUT_URL', getPaymentEnv('JAZZCASH_SANDBOX_CHECKOUT_URL', 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'));
define('JAZZCASH_PRODUCTION_API_URL', getPaymentEnv('JAZZCASH_PRODUCTION_API_URL', 'https://payments.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction'));

// Merchant Credentials (from .env or fallback sandbox credentials)
define('JAZZCASH_MERCHANT_ID', getPaymentEnv('JAZZCASH_MERCHANT_ID', 'MC12345'));
define('JAZZCASH_PASSWORD', getPaymentEnv('JAZZCASH_PASSWORD', 'sandbox_password'));
define('JAZZCASH_INTEGRITY_SALT', getPaymentEnv('JAZZCASH_INTEGRITY_SALT', 'sandbox_salt_key'));
define('JAZZCASH_RETURN_URL', getPaymentEnv('JAZZCASH_RETURN_URL', 'http://localhost/atta_chakki_api/payments/jazzcash_callback.php'));

define('JAZZCASH_API_VERSION', getPaymentEnv('JAZZCASH_API_VERSION', '1.1'));

// Card Payment Configuration
define('CARD_SANDBOX_MODE', getPaymentEnvBool('CARD_SANDBOX_MODE', !$isProductionMode));

// Test Card Numbers (for sandbox mode)
define('SANDBOX_TEST_CARDS', [
    'visa_success'       => '4242424242424242',
    'visa_decline'       => '4000000000000002',
    'mastercard_success' => '5555555555554444',
    'mastercard_decline' => '5105105105105100',
    'insufficient_funds' => '4000000000009995',
    'expired_card'       => '4000000000000069',
]);

// Sandbox Local Simulation Settings
define('SIMULATE_SANDBOX_PAYMENTS', getPaymentEnvBool('PAYMENT_SIMULATE_SANDBOX', !$isProductionMode));
define('SANDBOX_PROCESSING_DELAY_MS', intval(getPaymentEnv('SANDBOX_PROCESSING_DELAY_MS', 2000)));
define('SANDBOX_SUCCESS_RATE', intval(getPaymentEnv('SANDBOX_SUCCESS_RATE', 100)));

// Global Helper Constant for Sandbox Check
define('IS_SANDBOX_ENVIRONMENT', (JAZZCASH_SANDBOX_MODE || CARD_SANDBOX_MODE || SIMULATE_SANDBOX_PAYMENTS));

// Function to get active JazzCash API URL based on active mode
if (!function_exists('getJazzCashApiUrl')) {
    function getJazzCashApiUrl() {
        return JAZZCASH_SANDBOX_MODE ? JAZZCASH_SANDBOX_API_URL : JAZZCASH_PRODUCTION_API_URL;
    }
}

// Function to generate HMAC Secure Hash for JazzCash transactions
if (!function_exists('generateJazzCashHash')) {
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
}

// Function to validate Card Number using Luhn Algorithm
if (!function_exists('validateCardNumber')) {
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
}

// Function to detect Card Type (Visa, Mastercard, Amex, etc.)
if (!function_exists('detectCardType')) {
    function detectCardType($number) {
        $number = preg_replace('/\D/', '', $number);
        
        if (preg_match('/^4/', $number)) return 'visa';
        if (preg_match('/^5[1-5]/', $number)) return 'mastercard';
        if (preg_match('/^3[47]/', $number)) return 'amex';
        if (preg_match('/^6(?:011|5)/', $number)) return 'discover';
        
        return 'unknown';
    }
}
?>
