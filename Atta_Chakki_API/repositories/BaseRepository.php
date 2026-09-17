<?php
namespace AttaChakki\Repositories;

use mysqli;

// base class for all repositories, wraps mysqli prepare/bind/execute
// subclasses: only parameterized sql, never return raw mysqli_stmt objects
class BaseRepository
{
    protected mysqli $db;

    public function __construct(mysqli $db)
    {
        $this->db = $db;
    }

    // first row as assoc array, or null
    protected function selectOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    // all rows as array of assoc arrays
    protected function selectAll(string $sql, array $params = []): array
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    // single value, first column of first row, for count/sum queries
    protected function selectScalar(string $sql, array $params = [])
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_row();
        $stmt->close();
        return $row[0] ?? null;
    }

    // insert/update/delete, returns affected rows
    protected function execute(string $sql, array $params = []): int
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();
        return $affected;
    }

    // insert, returns new auto-generated id
    protected function insert(string $sql, array $params = []): int
    {
        $stmt = $this->prepareBind($sql, $params);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();
        return $id;
    }

    // wraps writes in a transaction, rolls back on any exception
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
