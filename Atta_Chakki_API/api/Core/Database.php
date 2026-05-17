<?php
namespace Api\Core;

class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        require_once dirname(__DIR__) . '/Config/connect.php';
        global $conn;
        $this->conn = $conn;
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }
}
