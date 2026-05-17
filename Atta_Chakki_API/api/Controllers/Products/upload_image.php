<?php
// upload image to cloudinary
set_time_limit(300); // Allow up to 5 minutes for slow uploads
require_once __DIR__ . '/../../Utils/cloudinary_helper.php';

header('Content-Type: application/json');

// Log request details for debugging
error_log('=== UPLOAD REQUEST START ===');
error_log('Method: ' . $_SERVER['REQUEST_METHOD']);
error_log('Files received: ' . json_encode($_FILES, JSON_PRETTY_PRINT));
error_log('Post data: ' . json_encode($_POST));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// checking if file was uploaded
if (!isset($_FILES['image'])) {
    error_log('ERROR: No image in FILES. Available keys: ' . implode(', ', array_keys($_FILES)));
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No image file received']);
    exit;
}

if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorMsg = getUploadErrorMessage($_FILES['image']['error']);
    error_log('ERROR: File upload error: ' . $errorMsg);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $errorMsg]);
    exit;
}

$folder = isset($_POST['folder']) ? $_POST['folder'] : 'products';

error_log('Uploading image to folder: ' . $folder . ', File: ' . $_FILES['image']['name']);

$result = uploadToCloudinary($_FILES['image'], $folder);

error_log('Upload result: ' . json_encode($result, JSON_PRETTY_PRINT));
error_log('=== UPLOAD REQUEST END ===');

if ($result['success']) {
    http_response_code(200);
} else {
    http_response_code(400);
}

echo json_encode($result);



