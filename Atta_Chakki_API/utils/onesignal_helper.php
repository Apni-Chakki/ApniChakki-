<?php
// onesignal push notification helper
class OneSignalHelper {
    private static function getKeys() {
        // api keys from env
        return [
            'app_id' => getenv('ONESIGNAL_APP_ID') ?: '',
            'rest_api_key' => getenv('ONESIGNAL_REST_API_KEY') ?: ''
        ];
    }

    // sends push to specific users, or all users if external_user_ids is null
    public static function sendNotification($heading, $content, $external_user_ids = null, $url = null) {
        $keys = self::getKeys();
        
        if ($keys['app_id'] === 'YOUR_ONESIGNAL_APP_ID') {
            error_log("OneSignal not configured. Notification not sent: $heading");
            return false;
        }

        $fields = [
            'app_id' => $keys['app_id'],
            'headings' => ["en" => $heading],
            'contents' => ["en" => $content],
        ];

        if ($external_user_ids && is_array($external_user_ids) && count($external_user_ids) > 0) {
            $fields['include_aliases'] = [
                'external_id' => $external_user_ids
            ];
            $fields['target_channel'] = 'push';
        } else {
            $fields['included_segments'] = ['All'];
        }

        if ($url) {
            $fields['url'] = $url;
        }

        $fields = json_encode($fields);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://onesignal.com/api/v1/notifications");
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json; charset=utf-8',
            'Authorization: Basic ' . $keys['rest_api_key']
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
        curl_setopt($ch, CURLOPT_HEADER, FALSE);
        curl_setopt($ch, CURLOPT_POST, TRUE);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            return true;
        } else {
            error_log("OneSignal Error: HTTP $httpCode - " . $response);
            return false;
        }
    }
}
?>
