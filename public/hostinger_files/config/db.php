<?php
/**
 * ============================================================
 * CONEXIÓN PDO A MYSQL EN HOSTINGER
 * Dominio: https://zoltrak.websolutionsgarcia.com/
 * Archivo: config/db.php
 * ============================================================
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'u752784733_zoltrak');
define('DB_USER', 'u752784733_zoltrak');
define('DB_PASS', 'Atomsk757!');
define('DB_PORT', 3306);
define('DB_CHARSET', 'utf8mb4');

function getDBConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode([
                "status" => "error",
                "message" => "Error de conexión MySQL en Hostinger: " . $e->getMessage()
            ]));
        }
    }
    return $pdo;
}
