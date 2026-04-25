<?php
// loading cloudinary keys from env
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $envVars = parse_ini_file($envFile);
    define('CLOUDINARY_CLOUD_NAME', $envVars['CLOUDINARY_CLOUD_NAME'] ?? '');
    define('CLOUDINARY_API_KEY', $envVars['CLOUDINARY_API_KEY'] ?? '');
    define('CLOUDINARY_API_SECRET', $envVars['CLOUDINARY_API_SECRET'] ?? '');
    define('CLOUDINARY_UPLOAD_PRESET', $envVars['CLOUDINARY_UPLOAD_PRESET'] ?? '');
} else {
    define('CLOUDINARY_CLOUD_NAME', getenv('CLOUDINARY_CLOUD_NAME') ?: 'YOUR_CLOUD_NAME');
    define('CLOUDINARY_API_KEY', getenv('CLOUDINARY_API_KEY') ?: 'YOUR_API_KEY');
    define('CLOUDINARY_API_SECRET', getenv('CLOUDINARY_API_SECRET') ?: 'YOUR_API_SECRET');
    define('CLOUDINARY_UPLOAD_PRESET', getenv('CLOUDINARY_UPLOAD_PRESET') ?: 'YOUR_UPLOAD_PRESET');
}

// checking if keys are set
if (CLOUDINARY_CLOUD_NAME === 'YOUR_CLOUD_NAME' || CLOUDINARY_CLOUD_NAME === '') {
    error_log('WARNING: Cloudinary credentials not configured. .env file may not exist or is empty.');
}

define('CLOUDINARY_BASE_URL', 'https://api.cloudinary.com/v1_1/' . CLOUDINARY_CLOUD_NAME);

// upload limits
define('CLOUDINARY_MAX_FILE_SIZE', 10 * 1024 * 1024);
define('CLOUDINARY_ALLOWED_MIME_TYPES', [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
]);

// folder names for organizing uploads
define('CLOUDINARY_FOLDERS', [
    'categories' => 'apni-chakki/categories',
    'products' => 'apni-chakki/products',
    'other' => 'apni-chakki/other'
]);
