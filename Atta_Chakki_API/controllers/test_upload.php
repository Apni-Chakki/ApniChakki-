<?php
require_once __DIR__ . '/config/cloudinary.php';

header('Content-Type: application/json');

$diagnostics = [
    'step1_credentials_loaded' => [
        'cloud_name' => CLOUDINARY_CLOUD_NAME,
        'upload_preset' => CLOUDINARY_UPLOAD_PRESET,
        'base_url' => CLOUDINARY_BASE_URL,
        'api_key_length' => strlen(CLOUDINARY_API_KEY),
        'api_secret_length' => strlen(CLOUDINARY_API_SECRET)
    ]
];

$testFile = sys_get_temp_dir() . '/test_image.png';
if (!file_exists($testFile)) {
    $png = "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82";
    file_put_contents($testFile, $png);
}

$diagnostics['step2_test_file'] = [
    'file_exists' => file_exists($testFile),
    'file_size' => filesize($testFile)
];

$cloudinaryUrl = CLOUDINARY_BASE_URL . '/image/upload';
$postFields = [
    'file' => new CURLFile($testFile, 'image/png', 'test.png'),
    'upload_preset' => CLOUDINARY_UPLOAD_PRESET,
    'folder' => 'apni-chakki/test',
    'resource_type' => 'auto'
];

$diagnostics['step3_request'] = [
    'url' => $cloudinaryUrl,
    'fields_keys' => array_keys($postFields)
];

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $cloudinaryUrl,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_VERBOSE => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$diagnostics['step4_response'] = [
    'http_code' => $httpCode,
    'curl_error' => $curlError,
    'response_preview' => substr($response, 0, 500),
    'full_response' => json_decode($response, true)
];

echo json_encode($diagnostics, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
