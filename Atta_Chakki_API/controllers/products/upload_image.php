<?php
// upload image to cloudinary
require_once __DIR__ . '/../../utils/cloudinary_helper.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// checking if file was uploaded
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorMsg = isset($_FILES['image']) 
        ? getUploadErrorMessage($_FILES['image']['error']) 
        : 'No image file received';
    
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $errorMsg]);
    exit;
}

$folder = isset($_POST['folder']) ? $_POST['folder'] : 'products';

$result = uploadToCloudinary($_FILES['image'], $folder);

if ($result['success']) {
    http_response_code(200);
} else {
    http_response_code(500);
}

echo json_encode($result);
