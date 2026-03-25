<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$body = getJsonBody();
$action = $_GET['action'] ?? '';
$db = getDB();

switch ($action) {

    // GET /api/php/users.php?action=list (Admin only)
    case 'list':
        requireRole('admin');
        $search = trim($_GET['search'] ?? '');
        $role   = $_GET['role'] ?? '';
        $where  = [];
        $params = [];
        if ($search) {
            $where[] = "(name LIKE ? OR email LIKE ? OR username LIKE ?)";
            $params[] = "%$search%"; $params[] = "%$search%"; $params[] = "%$search%";
        }
        if ($role) { $where[] = "role = ?"; $params[] = $role; }
        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $stmt = $db->prepare("SELECT id, username, email, name, role, phone, address, apartment_number, is_active, created_at, last_login FROM users $whereClause ORDER BY created_at DESC");
        $stmt->execute($params);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    // GET /api/php/users.php?action=get&id=X (Admin only)
    case 'get':
        requireRole('admin');
        $id   = (int)($_GET['id'] ?? 0);
        if (!$id) errorResponse('User ID required.');
        $stmt = $db->prepare("SELECT id, username, email, name, role, phone, address, apartment_number, is_active, created_at, last_login FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) errorResponse('User not found.', 404);
        jsonResponse(['success' => true, 'data' => $user]);
        break;

    // POST /api/php/users.php?action=create (Admin only)
    case 'create':
        if ($method !== 'POST') errorResponse('Method not allowed.', 405);
        requireRole('admin');
        $currentUser = getCurrentUser();

        $name     = trim($body['name'] ?? '');
        $username = trim($body['username'] ?? '');
        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';
        $role     = $body['role'] ?? 'tenant';
        $phone    = trim($body['phone'] ?? '');
        $address  = trim($body['address'] ?? '');
        $apartment = trim($body['apartment_number'] ?? '');

        if (!$name || !$username || !$email || !$password) errorResponse('Name, username, email and password are required.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) errorResponse('Invalid email.');
        if (strlen($password) < 6) errorResponse('Password must be at least 6 characters.');
        if (!in_array($role, ['admin','staff','tenant'])) errorResponse('Invalid role.');

        $stmt = $db->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
        $stmt->execute([$email, $username]);
        if ($stmt->fetch()) errorResponse('Email or username already exists.');

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $db->prepare("INSERT INTO users (name, username, email, password, role, phone, address, apartment_number) VALUES (?,?,?,?,?,?,?,?)");
        $stmt->execute([$name, $username, $email, $hash, $role, $phone ?: null, $address ?: null, $apartment ?: null]);
        $newId = $db->lastInsertId();

        auditLog($currentUser['id'], 'CREATE_USER', 'user', $newId, ['username' => $username, 'role' => $role]);
        jsonResponse(['success' => true, 'user_id' => $newId, 'message' => 'User created successfully.']);
        break;

    // PUT/POST /api/php/users.php?action=update&id=X (Admin only)
    case 'update':
        if (!in_array($method, ['POST', 'PUT'])) errorResponse('Method not allowed.', 405);
        requireRole('admin');
        $currentUser = getCurrentUser();
        $id = (int)($_GET['id'] ?? $body['id'] ?? 0);
        if (!$id) errorResponse('User ID required.');

        $updates = [];
        $params = [];
        if (isset($body['name']))    { $updates[] = 'name = ?';             $params[] = trim($body['name']); }
        if (isset($body['email']))   { $updates[] = 'email = ?';            $params[] = trim($body['email']); }
        if (isset($body['role']))    { $updates[] = 'role = ?';             $params[] = $body['role']; }
        if (isset($body['phone']))   { $updates[] = 'phone = ?';            $params[] = $body['phone']; }
        if (isset($body['address'])) { $updates[] = 'address = ?';          $params[] = $body['address']; }
        if (isset($body['apartment_number'])) { $updates[] = 'apartment_number = ?'; $params[] = $body['apartment_number']; }
        if (isset($body['is_active'])) { $updates[] = 'is_active = ?';      $params[] = (int)$body['is_active']; }
        if (!empty($body['password'])) { $updates[] = 'password = ?'; $params[] = password_hash($body['password'], PASSWORD_BCRYPT); }

        if (empty($updates)) errorResponse('No updates provided.');
        $params[] = $id;
        $db->prepare("UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);

        auditLog($currentUser['id'], 'UPDATE_USER', 'user', $id, $body);
        jsonResponse(['success' => true, 'message' => 'User updated successfully.']);
        break;

    // DELETE /api/php/users.php?action=delete&id=X (Admin only)
    case 'delete':
        requireRole('admin');
        $currentUser = getCurrentUser();
        $id = (int)($_GET['id'] ?? $body['id'] ?? 0);
        if (!$id) errorResponse('User ID required.');
        if ($id === $currentUser['id']) errorResponse('Cannot delete your own account.');
        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
        auditLog($currentUser['id'], 'DELETE_USER', 'user', $id);
        jsonResponse(['success' => true, 'message' => 'User deleted.']);
        break;

    // GET /api/php/users.php?action=staff (Admin only - list staff members)
    case 'staff':
        requireRole('admin');
        $stmt = $db->query("SELECT id, name, email, username, role FROM users WHERE role = 'staff' AND is_active = 1 ORDER BY name");
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    // GET /api/php/users.php?action=profile (current user's own profile)
    case 'profile':
        $user = requireAuth();
        $stmt = $db->prepare("SELECT id, username, email, name, role, phone, address, apartment_number, created_at, last_login FROM users WHERE id = ?");
        $stmt->execute([$user['id']]);
        jsonResponse(['success' => true, 'data' => $stmt->fetch()]);
        break;

    // POST /api/php/users.php?action=update_profile (any logged user)
    case 'update_profile':
        if ($method !== 'POST') errorResponse('Method not allowed.', 405);
        $user = requireAuth();
        $updates = [];
        $params = [];
        if (isset($body['name']))    { $updates[] = 'name = ?';    $params[] = trim($body['name']); }
        if (isset($body['phone']))   { $updates[] = 'phone = ?';   $params[] = trim($body['phone']); }
        if (isset($body['address'])) { $updates[] = 'address = ?'; $params[] = trim($body['address']); }
        if (!empty($body['password'])) {
            if (strlen($body['password']) < 6) errorResponse('Password must be at least 6 characters.');
            $updates[] = 'password = ?';
            $params[] = password_hash($body['password'], PASSWORD_BCRYPT);
        }
        if (empty($updates)) errorResponse('Nothing to update.');
        $params[] = $user['id'];
        $db->prepare("UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
        jsonResponse(['success' => true, 'message' => 'Profile updated.']);
        break;

    // POST /api/php/users.php?action=bulk_create (Admin only)
    case 'bulk_create':
        if ($method !== 'POST') errorResponse('Method not allowed.', 405);
        requireRole('admin');
        $currentUser = getCurrentUser();
        $users = $body['users'] ?? [];
        if (!is_array($users) || empty($users)) errorResponse('No users provided.');

        $db->beginTransaction();
        try {
            $createdCount = 0;
            $errors = [];
            foreach ($users as $index => $u) {
                $name     = trim($u['name'] ?? '');
                $username = trim($u['username'] ?? '');
                $email    = trim($u['email'] ?? '');
                $password = $u['password'] ?? '123456'; // Default password if empty
                $role     = $u['role'] ?? 'tenant';
                $phone    = trim($u['phone'] ?? '');
                $apartment = trim($u['apartment_number'] ?? '');

                if (!$name || !$username || !$email) {
                    $errors[] = "Row $index: Name, username and email are required.";
                    continue;
                }

                $stmt = $db->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
                $stmt->execute([$email, $username]);
                if ($stmt->fetch()) {
                    $errors[] = "Row $index ($username): Email or username already exists.";
                    continue;
                }

                $hash = password_hash($password, PASSWORD_BCRYPT);
                $stmt = $db->prepare("INSERT INTO users (name, username, email, password, role, phone, apartment_number) VALUES (?,?,?,?,?,?,?)");
                $stmt->execute([$name, $username, $email, $hash, $role, $phone ?: null, $apartment ?: null]);
                $createdCount++;
            }
            auditLog($currentUser['id'], 'BULK_IMPORT_USERS', 'user', 0, ['count' => $createdCount]);
            $db->commit();
            jsonResponse(['success' => true, 'count' => $createdCount, 'errors' => $errors]);
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Bulk create failed: ' . $e->getMessage());
        }
        break;

    // GET /api/php/users.php?action=stats (Admin only)
    case 'stats':
        requireRole('admin');
        $row = $db->query("SELECT COUNT(*) as total, SUM(role='admin') as admins, SUM(role='staff') as staff, SUM(role='tenant') as tenants FROM users")->fetch();
        jsonResponse(['success' => true, 'data' => $row]);
        break;

    default:
        errorResponse('Unknown action.', 404);
}
