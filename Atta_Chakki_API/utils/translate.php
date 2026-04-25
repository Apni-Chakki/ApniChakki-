<?php
require_once __DIR__ . '/../config/cors.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

$from = $data['from'] ?? 'en';
$to   = $data['to'] ?? 'ur';

if (isset($data['texts']) && is_array($data['texts'])) {
    $texts = $data['texts'];
    $results = [];
    
    foreach ($texts as $text) {
        $text = trim($text);
        if (empty($text)) {
            $results[] = $text;
            continue;
        }
        
        $translated = translateText($text, $from, $to);
        $results[] = $translated;
    }
    
    echo json_encode([
        "success" => true,
        "translations" => $results
    ]);
    exit;
}


if (isset($data['text'])) {
    $text = trim($data['text']);
    
    if (empty($text)) {
        echo json_encode(["success" => false, "message" => "Empty text"]);
        exit;
    }
    
    $translated = translateText($text, $from, $to);
    
    echo json_encode([
        "success" => true,
        "original" => $text,
        "translated" => $translated,
        "from" => $from,
        "to" => $to
    ]);
    exit;
}

echo json_encode(["success" => false, "message" => "Missing 'text' or 'texts' parameter"]);

// --- Translation function using MyMemory API ---
function translateText($text, $from, $to) {
    $langpair = urlencode("$from|$to");
    $textEncoded = urlencode($text);
    
    $url = "https://api.mymemory.translated.net/get?q={$textEncoded}&langpair={$langpair}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200 && $response) {
        $result = json_decode($response, true);
        if (isset($result['responseData']['translatedText'])) {
            return $result['responseData']['translatedText'];
        }
    }
    return $text;
}
