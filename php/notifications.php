<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$db = getDB();

switch ($action) {
    case 'list':
        $user = requireAuth();
        $limit = (int)($_GET['limit'] ?? 20);
        $stmt = $db->prepare("
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$user['id'], $limit]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'mark_read':
        $user = requireAuth();
        $body = getJsonBody();
        $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
        if (!$id) errorResponse('Notification ID required.');
        $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?")->execute([$id, $user['id']]);
        jsonResponse(['success' => true]);
        break;

    case 'mark_all_read':
        $user = requireAuth();
        $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?")->execute([$user['id']]);
        jsonResponse(['success' => true]);
        break;

    case 'unread_count':
        $user = requireAuth();
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
        $stmt->execute([$user['id']]);
        jsonResponse(['success' => true, 'data' => $stmt->fetch()]);
        break;

    default:
        errorResponse('Unknown action.', 404);
}
