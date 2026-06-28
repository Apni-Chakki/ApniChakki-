<?php
// Dynamic SEO Proxy for React SPA
// This file intercepts requests, injects Open Graph / Meta tags, and serves index.html

$request_uri = $_SERVER['REQUEST_URI'];
$host = $_SERVER['HTTP_HOST'];
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$full_url = $protocol . "://" . $host . $request_uri;

// Default SEO Tags
$title = "Apni Chakki - Pure & Fresh Chakki Atta";
$description = "Fresh, hygienic, and authentic Chakki Atta and premium spices delivered straight to your doorstep.";
// Default fallback images
$slider_images = [
    "https://images.unsplash.com/photo-1731082300550-8093311708ef?w=1200&auto=format&fit=crop&q=80", // Default
    "https://images.unsplash.com/photo-1509486851159-4311b3e30f44?w=1200&auto=format&fit=crop&q=80", // Wheat
    "https://images.unsplash.com/photo-1595856417539-7f37478d1fb5?w=1200&auto=format&fit=crop&q=80"  // Flour
];

// Try fetching dynamic slider images from the database/API
$api_url = ($host === 'localhost' || $host === '127.0.0.1' || strpos($host, 'localhost') !== false) 
    ? "http://localhost/atta_chakki_api/get_store_settings.php" 
    : $protocol . "://" . $host . "/Atta_Chakki_API/get_store_settings.php";

$settings_json = @file_get_contents($api_url);
if ($settings_json) {
    $settings_data = json_decode($settings_json, true);
    if (isset($settings_data['success']) && $settings_data['success'] && isset($settings_data['settings']['heroSlides'])) {
        $heroSlides = json_decode($settings_data['settings']['heroSlides'], true);
        if (is_array($heroSlides) && count($heroSlides) > 0) {
            $dynamic_images = [];
            foreach ($heroSlides as $slide) {
                if (!empty($slide['image'])) {
                    $dynamic_images[] = $slide['image'];
                }
            }
            if (count($dynamic_images) > 0) {
                $slider_images = $dynamic_images; // Override default images with Cloudinary images from API
            }
        }
    }
}

// Randomly select an image from the slider array
$image = $slider_images[array_rand($slider_images)];
$keywords = "chakki atta, fresh flour, pure spices, whole wheat, online chakki";

// Route Specific Logic
if (strpos($request_uri, '/checkout') !== false) {
    $title = "Checkout - Apni Chakki";
    $description = "Complete your order at Apni Chakki. Secure checkout for fresh flour and premium services.";
} elseif (strpos($request_uri, '/contact') !== false) {
    $title = "Contact Us - Apni Chakki";
    $description = "Get in touch with Apni Chakki for pure and fresh flour delivery.";
} elseif (strpos($request_uri, '/reviews') !== false) {
    $title = "Customer Reviews - Apni Chakki";
    $description = "See what our happy customers are saying about our pure and fresh flour.";
} elseif (strpos($request_uri, '/track-order') !== false) {
    $title = "Track Order - Apni Chakki";
    $description = "Track your Apni Chakki order in real-time.";
} elseif (strpos($request_uri, '/login/customer') !== false) {
    $title = "Login - Apni Chakki";
}

$html_file = __DIR__ . '/index.html';

if (file_exists($html_file)) {
    $html = file_get_contents($html_file);

    // Meta tags to inject
    $meta_tags = "
    <!-- Dynamic SEO Tags Injected by index.php -->
    <meta name=\"description\" content=\"$description\">
    <meta name=\"keywords\" content=\"$keywords\">
    
    <!-- Open Graph / Facebook -->
    <meta property=\"og:type\" content=\"website\">
    <meta property=\"og:url\" content=\"$full_url\">
    <meta property=\"og:title\" content=\"$title\">
    <meta property=\"og:description\" content=\"$description\">
    <meta property=\"og:image\" content=\"$image\">

    <!-- Twitter -->
    <meta property=\"twitter:card\" content=\"summary_large_image\">
    <meta property=\"twitter:url\" content=\"$full_url\">
    <meta property=\"twitter:title\" content=\"$title\">
    <meta property=\"twitter:description\" content=\"$description\">
    <meta property=\"twitter:image\" content=\"$image\">
    ";

    // Inject tags just before </head>
    $html = str_replace('</head>', $meta_tags . "\n</head>", $html);

    // Update <title>
    $html = preg_replace('/<title>.*<\/title>/i', "<title>$title</title>", $html);

    echo $html;
} else {
    echo "<h1>Error: index.html not found!</h1><p>Please make sure index.html exists in the same directory.</p>";
}
?>
