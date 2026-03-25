<?php
// =============================================================
// Boarding House CMS - PHP Backend Configuration
// =============================================================

define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_NAME', 'boarding_house_cms');
define('DB_USER', 'root');       // Change to your MySQL username
define('DB_PASS', '');           // Change to your MySQL password
define('DB_CHARSET', 'utf8mb4');

define('SESSION_SECRET', 'boarding-house-cms-secret-2026-change-me');
define('SESSION_LIFETIME', 86400 * 7); // 7 days
define('SESSION_NAME', 'bh_session');

// CORS settings - allow the Vite frontend
define('ALLOWED_ORIGINS', ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3001']);

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Timezone
date_default_timezone_set('Asia/Manila');

/**
 * Create and return PDO database connection
 */
function getDB(): PDO {
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
            http_response_code(503);
            echo json_encode(['error' => 'Database connection failed. Please check your phpMyAdmin and database settings.']);
            exit;
        }
    }
    return $pdo;
}

/**
 * Send JSON response and exit
 */
function jsonResponse(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

/**
 * Send error response
 */
function errorResponse(string $message, int $status = 400): never {
    jsonResponse(['error' => $message, 'success' => false], $status);
}

/**
 * Get current authenticated user from session token
 */
function getCurrentUser(): ?array {
    $token = getBearerToken();
    if (!$token) {
        // Also check cookie
        $token = $_COOKIE[SESSION_NAME] ?? null;
    }
    if (!$token) return null;

    try {
        $db = getDB();
        $stmt = $db->prepare("
            SELECT u.*, s.id as session_id 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = 1
        ");
        $stmt->execute([$token]);
        return $stmt->fetch() ?: null;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Require authentication - returns user or sends 401
 */
function requireAuth(): array {
    $user = getCurrentUser();
    if (!$user) {
        errorResponse('Unauthorized. Please log in.', 401);
    }
    return $user;
}

/**
 * Require a specific role
 */
function requireRole(string ...$roles): array {
    $user = requireAuth();
    if (!in_array($user['role'], $roles)) {
        errorResponse('Forbidden. Insufficient permissions.', 403);
    }
    return $user;
}

/**
 * Extract Bearer token from Authorization header
 */
function getBearerToken(): ?string {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (str_starts_with($auth, 'Bearer ')) {
        return substr($auth, 7);
    }
    return null;
}

/**
 * Set CORS headers
 */
function setCorsHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, ALLOWED_ORIGINS)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header("Access-Control-Allow-Origin: *");
    }
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

/**
 * Get request body as JSON
 */
function getJsonBody(): array {
    $body = file_get_contents('php://input');
    return json_decode($body, true) ?? [];
}

/**
 * Audit log helper
 */
function auditLog(int $userId = null, string $action, string $entityType, int $entityId = null, array $changes = []): void {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $action,
            $entityType,
            $entityId,
            json_encode($changes),
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null,
        ]);
    } catch (Exception $e) {
        // Silently fail audit logs
    }
}
