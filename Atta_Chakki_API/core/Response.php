<?php
namespace AttaChakki\Core;

/**
 * Standard JSON response helpers.
 *
 * Replaces the ~107 hand-written blocks of:
 *   header('Content-Type: application/json');
 *   echo json_encode([...]);
 *
 * Every response follows one of these two envelopes:
 *   { "success": true,  "data": ... }
 *   { "success": false, "message": "...", "code": "OPTIONAL" }
 *
 * Do NOT introduce new response shapes. If a caller today returns
 * `{ success: true, orders: [...] }` (no `data` key), migrate it during Phase 2
 * to `{ success: true, data: { orders: [...] } }` — but only when the calling
 * page is also updated.
 */
class Response
{
    /**
     * 200 OK success payload.
     */
    public static function json($data = null, int $status = 200): void
    {
        self::send(['success' => true, 'data' => $data], $status);
    }

    /**
     * Success with a message but no data (e.g. "Order updated").
     */
    public static function message(string $message, int $status = 200): void
    {
        self::send(['success' => true, 'message' => $message], $status);
    }

    /**
     * 4xx/5xx error envelope.
     */
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

    /**
     * Server-side send. Called by every helper.
     * Exits after sending — controllers should not do additional output.
     */
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
