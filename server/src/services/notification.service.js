import crypto from 'crypto';
import { executeQuery } from '../config/database.js';

/**
 * Creates an in-app notification record.
 * Supports executing inside an active database transaction.
 * 
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {Object} params
 * @param {string} params.userId - Recipient user ID
 * @param {string|null} [params.actorUserId] - Triggering user ID
 * @param {string} params.notificationType - Event identifier
 * @param {string} params.title - Short descriptive title
 * @param {string} params.message - Safe user-friendly message
 * @param {string} params.targetType - 'job_application' | 'listing_enquiry' | 'service_request' | 'transit_request'
 * @param {string} params.targetId - ID of the request
 */
export async function createNotification(connection, {
  userId,
  actorUserId = null,
  notificationType,
  title,
  message,
  targetType,
  targetId,
}) {
  if (!userId) return null;

  // Don't notify the actor of their own actions
  if (actorUserId && actorUserId === userId) {
    return null;
  }

  // Idempotency check: don't create duplicate identical notification for the same target within 10 seconds
  const [existing] = await connection.query(
    `SELECT id FROM notifications 
     WHERE user_id = ? AND target_type = ? AND target_id = ? AND notification_type = ? 
       AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
     LIMIT 1`,
    [userId, targetType, targetId, notificationType]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  await connection.execute(
    `INSERT INTO notifications (
      id,
      user_id,
      actor_user_id,
      notification_type,
      title,
      message,
      target_type,
      target_id,
      is_read,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
    [
      id,
      userId,
      actorUserId,
      notificationType,
      title,
      message,
      targetType,
      targetId,
    ]
  );

  return id;
}

/**
 * Lists notifications for a given user with unread counters.
 */
export async function getUserNotifications(userId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
  const params = [userId];
  let filterClause = 'WHERE user_id = ?';

  if (unreadOnly) {
    filterClause += ' AND is_read = FALSE';
  }

  const [countRows] = await executeQuery(
    `SELECT 
      COUNT(*) AS total_count,
      SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) AS unread_count
    FROM notifications WHERE user_id = ?`,
    [userId]
  );

  const [items] = await executeQuery(
    `SELECT 
      id,
      user_id,
      actor_user_id,
      notification_type,
      title,
      message,
      target_type,
      target_id,
      is_read,
      read_at,
      created_at
    FROM notifications
    ${filterClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  return {
    total: Number(countRows[0]?.total_count || 0),
    unreadCount: Number(countRows[0]?.unread_count || 0),
    notifications: items.map(n => ({
      id: n.id,
      type: n.notification_type,
      title: n.title,
      message: n.message,
      targetType: n.target_type,
      targetId: n.target_id,
      isRead: Boolean(n.is_read),
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
  };
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(userId, notificationId) {
  const [res] = await executeQuery(
    `UPDATE notifications 
     SET is_read = TRUE, read_at = NOW() 
     WHERE id = ? AND user_id = ? AND is_read = FALSE`,
    [notificationId, userId]
  );
  return res.affectedRows > 0;
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId) {
  const [res] = await executeQuery(
    `UPDATE notifications 
     SET is_read = TRUE, read_at = NOW() 
     WHERE user_id = ? AND is_read = FALSE`,
    [userId]
  );
  return res.affectedRows;
}
