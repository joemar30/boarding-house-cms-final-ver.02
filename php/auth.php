<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$body = getJsonBody();

// Route: POST /api/php/auth/register
if ($_SERVER['REQUEST_URI'] === '/api/php/auth/register' || (isset($_GET['action']) && $_GET['action'] === 'register')) {
    if ($method !== 'POST') errorResponse('Method not allowed', 405);

    $name     = trim($body['name'] ?? '');
    $username = trim($body['username'] ?? '');
    $email    = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    $role     = $body['role'] ?? 'tenant';
    $phone    = trim($body['phone'] ?? '');
    $address  = trim($body['address'] ?? '');

    if (!$name || !$username || !$email || !$password) {
        errorResponse('Name, username, email and password are required.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('Invalid email address.');
    }
    if (strlen($password) < 6) {
        errorResponse('Password must be at least 6 characters.');
    }
    // Only admin can create staff/admin users
    if (in_array($role, ['admin', 'staff'])) {
        $currentUser = getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            $role = 'tenant'; // Force tenant role
        }
    }

    $db = getDB();
    // Check duplicates
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
    $stmt->execute([$email, $username]);
    if ($stmt->fetch()) {
        errorResponse('Email or username already exists.');
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO users (name, username, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $username, $email, $hash, $role, $phone ?: null, $address ?: null]);
    $userId = $db->lastInsertId();

    auditLog($userId, 'REGISTER', 'user', $userId, ['username' => $username, 'role' => $role]);
    jsonResponse(['success' => true, 'message' => 'Account created successfully.', 'user_id' => $userId]);
}

// Route: POST /api/php/auth/login
if ($_SERVER['REQUEST_URI'] === '/api/php/auth/login' || (isset($_GET['action']) && $_GET['action'] === 'login')) {
    if ($method !== 'POST') errorResponse('Method not allowed', 405);

    $identifier = trim($body['email'] ?? $body['username'] ?? '');
    $password   = $body['password'] ?? '';

    if (!$identifier || !$password) {
        errorResponse('Email/username and password are required.');
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1");
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        errorResponse('Invalid credentials.', 401);
    }

    // Generate session token
    $token = bin2hex(random_bytes(64));
    $sessionId = bin2hex(random_bytes(16));
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);

    $stmt = $db->prepare("INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $sessionId,
        $user['id'],
        $token,
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null,
        $expiresAt,
    ]);

    // Update last login
    $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);

    // Set cookie
    setcookie(SESSION_NAME, $token, [
        'expires'  => time() + SESSION_LIFETIME,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    auditLog($user['id'], 'LOGIN', 'user', $user['id']);

    unset($user['password']);
    jsonResponse([
        'success' => true,
        'token'   => $token,
        'user'    => $user,
    ]);
}

// Route: POST /api/php/auth/logout
if ($_SERVER['REQUEST_URI'] === '/api/php/auth/logout' || (isset($_GET['action']) && $_GET['action'] === 'logout')) {
    $token = getBearerToken() ?? ($_COOKIE[SESSION_NAME] ?? null);
    if ($token) {
        $db = getDB();
        $db->prepare("DELETE FROM sessions WHERE token = ?")->execute([$token]);
        setcookie(SESSION_NAME, '', time() - 3600, '/');
    }
    jsonResponse(['success' => true, 'message' => 'Logged out successfully.']);
}

// Route: GET /api/php/auth/me
if ($_SERVER['REQUEST_URI'] === '/api/php/auth/me' || (isset($_GET['action']) && $_GET['action'] === 'me')) {
    $user = getCurrentUser();
    if (!$user) {
        jsonResponse(['user' => null]);
    }
    unset($user['password']);
    jsonResponse(['user' => $user]);
}

errorResponse('Route not found.', 404);
