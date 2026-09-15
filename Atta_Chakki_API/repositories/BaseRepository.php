<?php
namespace AttaChakki\Repositories;

use mysqli;

/**
 * Base class for all repositories. Wraps the MySQLi prepare/bind/execute dance
 * that today gets copy-pasted into ~92 controllers.
 *
 * Convention for Phase 4 subclasses (UserRepository, ProductRepository, ...):
 *   - Constructor takes the existing $conn (from config/connect.php).
 *   - Public methods return arrays / scalars, never mysqli_stmt objects.
 *   - Only parameterized SQL — no interpolation. See selectOne/selectAll/execute.
 *
 * Type string reminder for bind_param:
 *   i = int, d = double, s = string, b = blob
 * Passed automatically by inferParamTypes() for common cases.
 */
class BaseRepository
{
    protected mysqli $db;

    public function __construct(mysqli $db)
    {
        $this->db = $db;
    }

    /**
     * Return the first row as an assoc array, or null if none.
     */
    protected function selectOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    /**
     * Return all rows as an array of assoc arrays.
     */
    protected function selectAll(string $sql, array $params = []): array
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    /**
     * Fetch a single scalar (first column of first row) — useful for COUNT/SUM.
     */
    protected function selectScalar(string $sql, array $params = [])
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_row();
        $stmt->close();
        return $row[0] ?? null;
    }

    /**
     * Run INSERT/UPDATE/DELETE. Returns affected rows.
     */
    protected function execute(string $sql, array $params = []): int
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();
        return $affected;
    }

    /**
     * Run INSERT and return the auto-generated ID.
     */
    protected function insert(string $sql, array $params = []): int
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();
        return $id;
    }

    /**
     * Wrap several writes in a transaction. Rolls back on any exception.
     *
     *   $repo->transaction(function() use (...) {
     *       $this->execute('...');
     *       $this->insert('...');
     *   });
     */
    protected function transaction(callable $fn)
    {
        $this->db->begin_transaction();
        try {
            $result = $fn();
            $this->db->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    // --- internal --------------------------------------------------------

    private function prepareBind(string $sql, array $params): \mysqli_stmt
    {
        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            throw new \RuntimeException('SQL prepare failed: ' . $this->db->error);
        }
        if (!empty($params)) {
            $types = self::inferParamTypes($params);
            $stmt->bind_param($types, ...$params);
        }
        return $stmt;
    }

    private static function inferParamTypes(array $params): string
    {
        $types = '';
        foreach ($params as $p) {
            if (is_int($p))         $types .= 'i';
            elseif (is_float($p))   $types .= 'd';
            elseif (is_null($p))    $types .= 's'; // MySQLi has no explicit null type
            else                    $types .= 's';
        }
        return $types;
    }
}
