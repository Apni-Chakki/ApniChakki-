<?php
// cloudinary upload helper functions
require_once __DIR__ . '/../config/cloudinary.php';

// uploading image to cloudinary
function uploadToCloudinary($file, $folder = 'products') {
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        return [
            'success' => false,
            'message' => getUploadErrorMessage($file['error'] ?? null)
        ];
    }
    
    if (!in_array($file['type'], CLOUDINARY_ALLOWED_MIME_TYPES)) {
        return [
            'success' => false,
            'message' => 'Invalid file type. Allowed: JPG, PNG, WebP, GIF'
        ];
    }
    
    if ($file['size'] > CLOUDINARY_MAX_FILE_SIZE) {
        return [
            'success' => false,
            'message' => 'File too large. Maximum size is ' . (CLOUDINARY_MAX_FILE_SIZE / 1024 / 1024) . 'MB'
        ];
    }
    
    $folderPath = CLOUDINARY_FOLDERS[$folder] ?? CLOUDINARY_FOLDERS['other'];
    $cloudinaryUrl = CLOUDINARY_BASE_URL . '/image/upload';
    
    $postFields = [
        'file' => new CURLFile($file['tmp_name'], $file['type'], $file['name']),
        'upload_preset' => CLOUDINARY_UPLOAD_PRESET,
        'folder' => $folderPath,
        'resource_type' => 'auto'
    ];
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $cloudinaryUrl,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        return [
            'success' => false,
            'message' => 'Upload failed: ' . $curlError
        ];
    }
    
    $result = json_decode($response, true);
    
    if ($httpCode === 200 && isset($result['secure_url'])) {
        return [
            'success' => true,
            'message' => 'Image uploaded successfully',
            'url' => $result['secure_url'],
            'public_id' => $result['public_id'],
            'width' => $result['width'] ?? null,
            'height' => $result['height'] ?? null,
            'size' => $result['bytes'] ?? null
        ];
    }
    
    $errorMessage = $result['error']['message'] ?? ($result['error'] ?? 'Unknown error');
    error_log('Cloudinary Upload Error: ' . json_encode(['httpCode' => $httpCode, 'error' => $errorMessage, 'cloudName' => CLOUDINARY_CLOUD_NAME, 'preset' => CLOUDINARY_UPLOAD_PRESET, 'response' => $response]));
    return ['success' => false, 'message' => 'Cloudinary error: ' . $errorMessage . ' (Check that Cloud Name is correct - should be lowercase without spaces)'];
}

// deleting image from cloudinary
function deleteFromCloudinary($publicId) {
    if (empty($publicId)) {
        return [
            'success' => false,
            'message' => 'Public ID is required'
        ];
    }
    
    $timestamp = time();
    $signature = hash('sha1', 'public_id=' . $publicId . '&timestamp=' . $timestamp . CLOUDINARY_API_SECRET);
    
    $cloudinaryUrl = CLOUDINARY_BASE_URL . '/destroy';
    
    $postData = [
        'public_id' => $publicId,
        'api_key' => CLOUDINARY_API_KEY,
        'timestamp' => $timestamp,
        'signature' => $signature
    ];
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $cloudinaryUrl,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($postData),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $result = json_decode($response, true);
    
    if ($httpCode === 200 && $result['result'] === 'ok') {
        return [
            'success' => true,
            'message' => 'Image deleted successfully'
        ];
    } else {
        return [
            'success' => false,
            'message' => 'Failed to delete image'
        ];
    }
}

// extracting public id from cloudinary url
function extractCloudinaryPublicIdFromUrl($url) {
    if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
        return null;
    }

    $host = parse_url($url, PHP_URL_HOST);
    if (!$host || strpos($host, 'cloudinary.com') === false) {
        return null;
    }

    $path = parse_url($url, PHP_URL_PATH);
    if (!$path) {
        return null;
    }

    $segments = explode('/', trim($path, '/'));
    $uploadIndex = array_search('upload', $segments, true);

    if ($uploadIndex === false) {
        return null;
    }

    $assetSegments = array_slice($segments, $uploadIndex + 1);

    if (empty($assetSegments)) {
        return null;
    }

    $versionIndex = null;
    foreach ($assetSegments as $index => $segment) {
        if (preg_match('/^v\d+$/', $segment)) {
            $versionIndex = $index;
            break;
        }
    }

    if ($versionIndex !== null) {
        $assetSegments = array_slice($assetSegments, $versionIndex + 1);
    }

    if (empty($assetSegments)) {
        return null;
    }

    $lastIndex = count($assetSegments) - 1;
    $assetSegments[$lastIndex] = preg_replace('/\.[^.]+$/', '', $assetSegments[$lastIndex]);

    return implode('/', $assetSegments);
}

// deleting cloudinary image by url
function deleteCloudinaryImageByUrl($url) {
    $publicId = extractCloudinaryPublicIdFromUrl($url);

    if (!$publicId) {
        return [
            'success' => true,
            'message' => 'Image is not stored in Cloudinary'
        ];
    }

    return deleteFromCloudinary($publicId);
}

// getting upload error message
function getUploadErrorMessage($errorCode) {
    $errors = [
        UPLOAD_ERR_OK => 'No error',
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds max_file_size in form',
        UPLOAD_ERR_PARTIAL => 'File was partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was selected',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
        UPLOAD_ERR_EXTENSION => 'Upload blocked by extension'
    ];
    
    return $errors[$errorCode] ?? 'No image uploaded';
}
