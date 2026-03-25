<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$db = getDB();

switch ($action) {
    // Staff assignments
    case 'assign':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') errorResponse('Method not allowed.', 405);
        $currentUser = requireRole('admin');
        $body = getJsonBody();
        $complaintId = (int)($body['complaint_id'] ?? 0);
        $staffId     = (int)($body['staff_id'] ?? 0);
        $deadline    = $body['deadline'] ?? null;
        $notes       = trim($body['notes'] ?? '');

        if (!$complaintId || !$staffId) errorResponse('Complaint ID and staff ID required.');
        
        // Verify staff exists
        $stmt = $db->prepare("SELECT id, name FROM users WHERE id = ? AND role = 'staff'");
        $stmt->execute([$staffId]);
        $staff = $stmt->fetch();
        if (!$staff) errorResponse('Staff member not found.');

        $stmt = $db->prepare("INSERT INTO staff_assignments (complaint_id, staff_id, assigned_by, deadline, notes) VALUES (?,?,?,?,?)");
        $stmt->execute([$complaintId, $staffId, $currentUser['id'], $deadline, $notes ?: null]);
        $assignId = $db->lastInsertId();

        // Update complaint status to in_progress
        $db->prepare("UPDATE complaints SET status = 'in_progress', updated_at = NOW() WHERE id = ?")->execute([$complaintId]);

        // Notify staff
        $db->prepare("INSERT INTO notifications (user_id, complaint_id, title, message, type) VALUES (?,?,?,?,'assignment')")
           ->execute([$staffId, $complaintId, 'New Task Assigned', "You have been assigned complaint #{$complaintId}"]);

        auditLog($currentUser['id'], 'ASSIGN_COMPLAINT', 'staffAssignment', $assignId, ['staff_id' => $staffId]);
        jsonResponse(['success' => true, 'assignment_id' => $assignId]);
        break;

    case 'list_by_staff':
        $user = requireAuth();
        $staffId = $user['role'] === 'admin' ? (int)($_GET['staff_id'] ?? $user['id']) : $user['id'];
        $stmt = $db->prepare("
            SELECT sa.*, c.title AS complaint_title, c.status AS complaint_status, c.priority AS complaint_priority,
                   u.name AS tenant_name, f.rating, f.comment AS tenant_comment
            FROM staff_assignments sa
            JOIN complaints c ON sa.complaint_id = c.id
            JOIN users u ON c.tenant_id = u.id
            LEFT JOIN feedback f ON f.complaint_id = c.id
            WHERE sa.staff_id = ?
            ORDER BY sa.assigned_at DESC
        ");
        $stmt->execute([$staffId]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'complete':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') errorResponse('Method not allowed.', 405);
        $user = requireAuth();
        $body = getJsonBody();
        $id   = (int)($body['assignment_id'] ?? 0);
        $notes = trim($body['notes'] ?? '');
        if (!$id) errorResponse('Assignment ID required.');
        $db->prepare("UPDATE staff_assignments SET completed_at = NOW(), notes = COALESCE(?, notes) WHERE id = ?")->execute([$notes ?: null, $id]);
        jsonResponse(['success' => true, 'message' => 'Assignment marked complete.']);
        break;

    // Feedback
    case 'submit_feedback':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') errorResponse('Method not allowed.', 405);
        $user = requireRole('tenant');
        $body = getJsonBody();
        $complaintId = (int)($body['complaint_id'] ?? 0);
        $rating      = (int)($body['rating'] ?? 0);
        $comment     = trim($body['comment'] ?? '');
        if (!$complaintId || !$rating) errorResponse('Complaint ID and rating required.');
        if ($rating < 1 || $rating > 5) errorResponse('Rating must be 1-5.');
        $stmt = $db->prepare("INSERT INTO feedback (complaint_id, tenant_id, rating, comment) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment)");
        $stmt->execute([$complaintId, $user['id'], $rating, $comment ?: null]);
        
        auditLog($user['id'], 'SUBMIT_FEEDBACK', 'feedback', $complaintId, ['rating' => $rating]);

        jsonResponse(['success' => true, 'message' => 'Feedback submitted.']);
        break;

    // Analytics (Admin)
    case 'analytics':
        requireRole('admin');
        $db2 = getDB();

        $complaintStats = $db2->query("
            SELECT 
                COUNT(*) as total,
                SUM(status='pending') as pending,
                SUM(status='in_progress') as in_progress,
                SUM(status='resolved') as resolved,
                SUM(status='rejected') as rejected,
                SUM(priority='urgent') as urgent,
                SUM(priority='high') as high,
                SUM(priority='medium') as medium,
                SUM(priority='low') as low
            FROM complaints
        ")->fetch();

        $byCategory = $db2->query("
            SELECT cat.name, cat.color, COUNT(c.id) as count
            FROM complaint_categories cat
            LEFT JOIN complaints c ON c.category_id = cat.id
            GROUP BY cat.id, cat.name, cat.color
            ORDER BY count DESC
        ")->fetchAll();

        $monthly = $db2->query("
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM complaints
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month
            ORDER BY month
        ")->fetchAll();

        $userStats = $db2->query("
            SELECT role, COUNT(*) as count FROM users GROUP BY role
        ")->fetchAll();

        $avgRating = $db2->query("SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM feedback")->fetch();

        $recentActivity = $db2->query("
            SELECT al.*, u.name as user_name 
            FROM audit_logs al 
            LEFT JOIN users u ON al.user_id = u.id 
            ORDER BY al.created_at DESC 
            LIMIT 10
        ")->fetchAll();

        $recentFeedback = $db2->query("
            SELECT f.*, u_tenant.name as tenant_name, c.title as complaint_title, 
                   (SELECT GROUP_CONCAT(u_s.name SEPARATOR ', ') 
                    FROM staff_assignments sa 
                    JOIN users u_s ON sa.staff_id = u_s.id 
                    WHERE sa.complaint_id = c.id) as staff_name
            FROM feedback f
            JOIN users u_tenant ON f.tenant_id = u_tenant.id
            JOIN complaints c ON f.complaint_id = c.id
            ORDER BY f.created_at DESC
            LIMIT 10
        ")->fetchAll();

        jsonResponse(['success' => true, 'data' => [
            'complaints'      => $complaintStats,
            'by_category'     => $byCategory,
            'monthly'         => $monthly,
            'users'           => $userStats,
            'avg_rating'      => $avgRating,
            'recent_activity' => $recentActivity,
            'recent_feedback' => $recentFeedback,
        ]]);
        break;

    // Categories
    case 'categories':
        $stmt = $db->query("SELECT * FROM complaint_categories ORDER BY name");
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    default:
        errorResponse('Unknown action.', 404);
}
