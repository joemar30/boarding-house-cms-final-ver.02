<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$body = getJsonBody();
$action = $_GET['action'] ?? '';

// All complaint routes require authentication
$user = requireAuth();
$db = getDB();

switch ($action) {

    // GET /api/php/complaints.php?action=list
    case 'list':
        if ($user['role'] === 'tenant') {
            $stmt = $db->prepare("
                SELECT c.*, cat.name AS category_name, cat.color AS category_color, cat.icon AS category_icon,
                       u.name AS tenant_name
                FROM complaints c
                LEFT JOIN complaint_categories cat ON c.category_id = cat.id
                LEFT JOIN users u ON c.tenant_id = u.id
                WHERE c.tenant_id = ?
                ORDER BY c.created_at DESC
            ");
            $stmt->execute([$user['id']]);
        } elseif ($user['role'] === 'staff') {
            $stmt = $db->prepare("
                SELECT c.*, cat.name AS category_name, cat.color AS category_color, cat.icon AS category_icon,
                       u.name AS tenant_name,
                       sa.id AS assignment_id, sa.notes AS assignment_notes
                FROM complaints c
                LEFT JOIN complaint_categories cat ON c.category_id = cat.id
                LEFT JOIN users u ON c.tenant_id = u.id
                LEFT JOIN staff_assignments sa ON sa.complaint_id = c.id AND sa.staff_id = ?
                WHERE sa.staff_id = ?
                ORDER BY c.created_at DESC
            ");
            $stmt->execute([$user['id'], $user['id']]);
        } else {
            // Admin sees all
            $limit = (int)($_GET['limit'] ?? 100);
            $offset = (int)($_GET['offset'] ?? 0);
            $status = $_GET['status'] ?? '';
            $priority = $_GET['priority'] ?? '';
            $search = trim($_GET['search'] ?? '');

            $where = [];
            $params = [];
            if ($status) { $where[] = 'c.status = ?'; $params[] = $status; }
            if ($priority) { $where[] = 'c.priority = ?'; $params[] = $priority; }
            if ($search) { $where[] = '(c.title LIKE ? OR c.description LIKE ?)'; $params[] = "%$search%"; $params[] = "%$search%"; }
            $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

            $params[] = $limit;
            $params[] = $offset;
            $stmt = $db->prepare("
                SELECT c.*, cat.name AS category_name, cat.color AS category_color, cat.icon AS category_icon,
                       u.name AS tenant_name
                FROM complaints c
                LEFT JOIN complaint_categories cat ON c.category_id = cat.id
                LEFT JOIN users u ON c.tenant_id = u.id
                $whereClause
                ORDER BY c.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute($params);
        }
        $complaints = $stmt->fetchAll();
        // Parse JSON attachment_urls
        foreach ($complaints as &$c) {
            $c['attachment_urls'] = json_decode($c['attachment_urls'] ?? '[]', true) ?? [];
        }
        jsonResponse(['success' => true, 'data' => $complaints]);
        break;

    // GET /api/php/complaints.php?action=get&id=X
    case 'get':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) errorResponse('Complaint ID required.');
        $stmt = $db->prepare("
            SELECT c.*, cat.name AS category_name, cat.color AS category_color,
                   u.name AS tenant_name
            FROM complaints c
            LEFT JOIN complaint_categories cat ON c.category_id = cat.id
            LEFT JOIN users u ON c.tenant_id = u.id
            WHERE c.id = ?
        ");
        $stmt->execute([$id]);
        $complaint = $stmt->fetch();
        if (!$complaint) errorResponse('Complaint not found.', 404);
        // RBAC: tenant can only see their own
        if ($user['role'] === 'tenant' && $complaint['tenant_id'] != $user['id']) {
            errorResponse('Forbidden.', 403);
        }
        $complaint['attachment_urls'] = json_decode($complaint['attachment_urls'] ?? '[]', true) ?? [];
        jsonResponse(['success' => true, 'data' => $complaint]);
        break;

    // POST /api/php/complaints.php?action=create
    case 'create':
        if ($method !== 'POST') errorResponse('Method not allowed.', 405);
        requireRole('tenant', 'admin');

        $categoryId  = (int)($body['category_id'] ?? 0);
        $title       = trim($body['title'] ?? '');
        $description = trim($body['description'] ?? '');
        $priority    = $body['priority'] ?? 'medium';

        if (!$categoryId || !$title || !$description) errorResponse('Category, title and description are required.');
        if (strlen($title) < 5) errorResponse('Title must be at least 5 characters.');
        if (strlen($description) < 10) errorResponse('Description must be at least 10 characters.');
        if (!in_array($priority, ['low','medium','high','urgent'])) errorResponse('Invalid priority.');

        // Verify category exists
        $cat = $db->prepare("SELECT id FROM complaint_categories WHERE id = ?");
        $cat->execute([$categoryId]);
        if (!$cat->fetch()) errorResponse('Invalid category.');

        $tenantId = $user['role'] === 'admin' ? ((int)($body['tenant_id'] ?? $user['id'])) : $user['id'];

        $stmt = $db->prepare("
            INSERT INTO complaints (tenant_id, category_id, title, description, priority, attachment_urls)
            VALUES (?, ?, ?, ?, ?, '[]')
        ");
        $stmt->execute([$tenantId, $categoryId, $title, $description, $priority]);
        $complaintId = $db->lastInsertId();

        // Notify admins
        $admins = $db->query("SELECT id FROM users WHERE role = 'admin'")->fetchAll();
        foreach ($admins as $admin) {
            $db->prepare("INSERT INTO notifications (user_id, complaint_id, title, message, type) VALUES (?,?,?,?,'system')")
               ->execute([$admin['id'], $complaintId, 'New Complaint', "New complaint filed: $title"]);
        }

        auditLog($user['id'], 'CREATE_COMPLAINT', 'complaint', $complaintId, ['title' => $title]);
        jsonResponse(['success' => true, 'complaint_id' => $complaintId, 'message' => 'Complaint submitted successfully.']);
        break;

    // POST /api/php/complaints.php?action=update_status
    case 'update_status':
        if ($method !== 'POST') errorResponse('Method not allowed.', 405);
        requireRole('admin', 'staff');

        $id     = (int)($body['id'] ?? 0);
        $status = $body['status'] ?? '';
        if (!$id || !$status) errorResponse('ID and status are required.');
        if (!in_array($status, ['pending','in_progress','resolved','rejected'])) errorResponse('Invalid status.');

        $resolvedAt = $status === 'resolved' ? date('Y-m-d H:i:s') : null;
        $stmt = $db->prepare("UPDATE complaints SET status = ?, resolved_at = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$status, $resolvedAt, $id]);

        // Notify tenant
        $complaint = $db->prepare("SELECT tenant_id, title FROM complaints WHERE id = ?")->execute([$id]);
        $stmt2 = $db->prepare("SELECT tenant_id, title FROM complaints WHERE id = ?");
        $stmt2->execute([$id]);
        $c = $stmt2->fetch();
        if ($c) {
            $db->prepare("INSERT INTO notifications (user_id, complaint_id, title, message, type) VALUES (?,?,?,?,'status_update')")
               ->execute([$c['tenant_id'], $id, 'Complaint Status Updated', "Your complaint \"{$c['title']}\" status changed to: $status"]);
        }

        auditLog($user['id'], 'UPDATE_STATUS', 'complaint', $id, ['status' => $status]);
        jsonResponse(['success' => true, 'message' => 'Status updated.']);
        break;

    // DELETE /api/php/complaints.php?action=delete&id=X
    case 'delete':
        requireRole('admin');
        $id = (int)($_GET['id'] ?? $body['id'] ?? 0);
        if (!$id) errorResponse('Complaint ID required.');
        $db->prepare("DELETE FROM complaints WHERE id = ?")->execute([$id]);
        auditLog($user['id'], 'DELETE_COMPLAINT', 'complaint', $id);
        jsonResponse(['success' => true, 'message' => 'Complaint deleted.']);
        break;

    // GET /api/php/complaints.php?action=stats
    case 'stats':
        requireRole('admin');
        $row = $db->query("
            SELECT 
                COUNT(*) as total,
                SUM(status='pending') as pending,
                SUM(status='in_progress') as in_progress,
                SUM(status='resolved') as resolved,
                SUM(status='rejected') as rejected
            FROM complaints
        ")->fetch();
        jsonResponse(['success' => true, 'data' => $row]);
        break;

    default:
        errorResponse('Unknown action.', 404);
}
