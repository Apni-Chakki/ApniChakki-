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

function applyDomainTerms($str, $to) {
    if ($to !== 'ur' || empty($str)) return $str;
    $replacements = [
        'اپنی چاکی' => 'اپنی چکی',
        'اپنے چاکی' => 'اپنی چکی',
        'چاکی' => 'چکی',
        'Apni Chakki' => 'سچی چکی',
        'Suchi Chakki' => 'سچی چکی',
        'G3 Apni Chakki' => 'جی تھری سچی چکی',
        'G3 Suchi Chakki' => 'جی تھری سچی چکی',
        'Atta Chakki' => 'آٹا چکی',
        'Chakki' => 'چکی',
        'Atta' => 'آٹا'
    ];
    return strtr($str, $replacements);
}

// Translation function using MyMemory API
function translateText($text, $from, $to) {
    if ($to === 'ur') {
        $exactDict = [
            'Apni Chakki' => 'سچی چکی',
            'Suchi Chakki' => 'سچی چکی',
            'G3 Apni Chakki' => 'جی تھری سچی چکی',
            'G3 Suchi Chakki' => 'جی تھری سچی چکی',
            'Atta Chakki' => 'آٹا چکی',
            'Chakki' => 'چکی',
            'Atta' => 'آٹا'
        ];
        $trimText = trim($text);
        if (isset($exactDict[$trimText])) {
            return $exactDict[$trimText];
        }
    }

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

    // Parse whatever MyMemory returned (may be null on failure or HTTP 429 quota exhaustion).
    $result = ($httpCode === 200 && $response) ? json_decode($response, true) : null;
    $primary = $result['responseData']['translatedText'] ?? null;

    // Detect MyMemory quota warning masquerading as a translation.
    if ($primary && stripos($primary, 'MYMEMORY WARNING') !== false) {
        $primary = null;
        $result = null;
    }

    // If not translating to a script-changing language, accept primary as-is.
    if (!isTargetScriptLanguage($to)) {
        return applyDomainTerms($primary ?: $text, $to);
    }

    // Target uses a non-Latin script (Urdu/Arabic/etc.). MyMemory sometimes returns
    // Roman transliteration ("Munji Se Dastar Khwan Tak") from community memory.
    // Prefer a candidate that actually contains characters in the target script.
    if ($primary && hasTargetScript($primary, $to)) {
        return applyDomainTerms($primary, $to);
    }

    // Scan matches[] for a machine-translated candidate with the right script.
    if (!empty($result['matches']) && is_array($result['matches'])) {
        foreach ($result['matches'] as $match) {
            $candidate = $match['translation'] ?? '';
            if ($candidate && hasTargetScript($candidate, $to)) {
                return applyDomainTerms($candidate, $to);
            }
        }
    }

    // Last resort: if the source text is ASCII (looks like Roman-Urdu / Roman-Arabic),
    // try Google Input Tools which transliterates Roman script → target script.
    // Handles the case where admins type "Munji Se Dastar Khwan Tak" instead of Urdu script.
    if (isMostlyAscii($text)) {
        $transliterated = transliterateRomanToScript($text, $to);
        if ($transliterated && hasTargetScript($transliterated, $to)) {
            return applyDomainTerms($transliterated, $to);
        }
    }

    // Nothing usable — return original rather than a bad transliteration.
    return applyDomainTerms($text, $to);
}

// True when $text has no characters outside the basic Latin range.
function isMostlyAscii($text) {
    return preg_match('/^[\x{0000}-\x{007F}\s\p{P}]*$/u', $text) === 1;
}

// Transliterate Roman-script $text into the target script via Google Input Tools.
function transliterateRomanToScript($text, $to) {
    $itcMap = [
        'ur' => 'ur-t-i0-und',
        'ar' => 'ar-t-i0-und',
        'fa' => 'fa-t-i0-und',
        'hi' => 'hi-t-i0-und',
        'bn' => 'bn-t-i0-und',
        'ta' => 'ta-t-i0-und',
    ];
    $lang = strtolower(substr($to, 0, 2));
    if (!isset($itcMap[$lang])) return null;
    $itc = $itcMap[$lang];

    $tokens = preg_split('/(\s+)/', $text, -1, PREG_SPLIT_DELIM_CAPTURE);
    $out = '';
    foreach ($tokens as $token) {
        if (preg_match('/^\s+$/', $token) || $token === '') {
            $out .= $token;
            continue;
        }
        preg_match('/^(\p{P}*)(.*?)(\p{P}*)$/u', $token, $m);
        $lead = $m[1] ?? '';
        $core = $m[2] ?? $token;
        $trail = $m[3] ?? '';

        if ($core === '' || !preg_match('/[A-Za-z]/', $core)) {
            $out .= $token;
            continue;
        }

        $url = 'https://inputtools.google.com/request?'
             . 'text=' . urlencode($core)
             . '&itc=' . urlencode($itc)
             . '&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage';

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200 || !$resp) return null;

        $data = json_decode($resp, true);
        $candidate = $data[1][0][1][0] ?? null;
        if (!$candidate) return null;

        $out .= $lead . $candidate . $trail;
    }
    return $out;
}

// Whether the target language uses a non-Latin script we should verify.
function isTargetScriptLanguage($lang) {
    $lang = strtolower(substr($lang, 0, 2));
    return in_array($lang, ['ur', 'ar', 'fa', 'ps', 'hi', 'zh', 'ja', 'ko', 'ru', 'bn', 'ta', 'th']);
}

// Whether $text contains at least one character in the expected Unicode range for $lang.
function hasTargetScript($text, $lang) {
    $lang = strtolower(substr($lang, 0, 2));
    $patterns = [
        'ur' => '/[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}]/u',
        'ar' => '/[\x{0600}-\x{06FF}\x{0750}-\x{077F}]/u',
        'fa' => '/[\x{0600}-\x{06FF}\x{0750}-\x{077F}]/u',
        'ps' => '/[\x{0600}-\x{06FF}\x{0750}-\x{077F}]/u',
        'hi' => '/[\x{0900}-\x{097F}]/u',
        'bn' => '/[\x{0980}-\x{09FF}]/u',
        'ta' => '/[\x{0B80}-\x{0BFF}]/u',
        'th' => '/[\x{0E00}-\x{0E7F}]/u',
        'zh' => '/[\x{4E00}-\x{9FFF}]/u',
        'ja' => '/[\x{3040}-\x{309F}\x{30A0}-\x{30FF}\x{4E00}-\x{9FFF}]/u',
        'ko' => '/[\x{AC00}-\x{D7AF}]/u',
        'ru' => '/[\x{0400}-\x{04FF}]/u',
    ];
    if (!isset($patterns[$lang])) return true;
    return preg_match($patterns[$lang], $text) === 1;
}
