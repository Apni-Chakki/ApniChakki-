<?php
namespace AttaChakki\Core;

/**
 * Input helpers. Replaces the repeated pattern:
 *
 *   $data = json_decode(file_get_contents("php://input"));
 *   $x = isset($data->x) ? floatval($data->x) : 0;
 *   $y = isset($data->y) ? filter_var($data->y, FILTER_VALIDATE_BOOLEAN) : false;
 *
 * These read from JSON body AND query string transparently — controllers stop
 * caring about the method. `body()` still exposes the raw decoded array if a
 * caller wants nested fields.
 */
class Request
{
    private static ?array $bodyCache = null;

    /**
     * Full decoded JSON body as an associative array. Cached per request.
     * Returns [] on non-JSON or empty body — safe to use with `??`.
     */
    public static function body(): array
    {
        if (self::$bodyCache !== null) return self::$bodyCache;
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            self::$bodyCache = [];
            return self::$bodyCache;
        }
        $decoded = json_decode($raw, true);
        self::$bodyCache = is_array($decoded) ? $decoded : [];
        return self::$bodyCache;
    }

    /**
     * Look in body then query string.
     */
    public static function get(string $key, $default = null)
    {
        $body = self::body();
        if (array_key_exists($key, $body)) return $body[$key];
        if (array_key_exists($key, $_GET))  return $_GET[$key];
        return $default;
    }

    public static function string(string $key, string $default = ''): string
    {
        $v = self::get($key, $default);
        return is_scalar($v) ? trim((string)$v) : $default;
    }

    public static function int(string $key, int $default = 0): int
    {
        $v = self::get($key, $default);
        return is_numeric($v) ? (int)$v : $default;
    }

    public static function float(string $key, float $default = 0.0): float
    {
        $v = self::get($key, $default);
        return is_numeric($v) ? (float)$v : $default;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $v = self::get($key, $default);
        if (is_bool($v)) return $v;
        return filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $default;
    }

    public static function array(string $key, array $default = []): array
    {
        $v = self::get($key, $default);
        return is_array($v) ? $v : $default;
    }

    /**
     * Require a field or send a 422 and exit.
     * Use for endpoints where a missing key is programmer error, not user error.
     */
    public static function required(string $key)
    {
        $v = self::get($key, null);
        if ($v === null || $v === '') {
            Response::validation("Missing required field: {$key}", [$key => 'required']);
        }
        return $v;
    }

    /**
     * "POST", "GET", "PUT", "DELETE", "OPTIONS".
     */
    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    /**
     * Enforce an HTTP method or send 405 and exit.
     */
    public static function requireMethod(string ...$allowed): void
    {
        $m = self::method();
        foreach ($allowed as $a) {
            if (strtoupper($a) === $m) return;
        }
        Response::error('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
    }
}
