<?php
namespace AttaChakki\Core;

// standard json response helpers, keep envelope shape consistent everywhere:
// success -> {success: true, data}, error -> {success: false, message, code}
class Response
{
    // 200 ok with data
    public static function json($data = null, int $status = 200): void
    {
        self::send(['success' => true, 'data' => $data], $status);
    }

    // success with just a message, no data
    public static function message(string $message, int $status = 200): void
    {
        self::send(['success' => true, 'message' => $message], $status);
    }

    // 4xx/5xx error envelope
    public static function error(string $message, int $status = 400, ?string $code = null, array $extra = []): void
    {
        $payload = ['success' => false, 'message' => $message];
        if ($code !== null) $payload['code'] = $code;
        if (!empty($extra)) $payload = array_merge($payload, $extra);
        self::send($payload, $status);
    }

    public static function unauthorized(string $message = 'Unauthorized'): void
    {
        self::error($message, 401, 'UNAUTHORIZED');
    }

    public static function forbidden(string $message = 'Forbidden'): void
    {
        self::error($message, 403, 'FORBIDDEN');
    }

    public static function notFound(string $message = 'Not found'): void
    {
        self::error($message, 404, 'NOT_FOUND');
    }

    public static function validation(string $message, array $errors = []): void
    {
        self::error($message, 422, 'VALIDATION_ERROR', ['errors' => $errors]);
    }

    // actually sends response and exits, called by all helpers above
    private static function send(array $payload, int $status): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code($status);
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
