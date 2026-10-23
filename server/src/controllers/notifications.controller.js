import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notification.service.js';

/**
 * GET /api/notifications
 */
export async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { limit = 25, offset = 0, unreadOnly = false } = req.query;

    const data = await getUserNotifications(userId, {
      limit: parseInt(limit, 10) || 25,
      offset: parseInt(offset, 10) || 0,
      unreadOnly: unreadOnly === 'true',
    });

    return res.json(data);
  } catch (err) {
    console.error('[GET_NOTIFICATIONS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve notifications.' },
    });
  }
}

/**
 * PATCH /api/notifications/:id/read
 */
export async function markAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const success = await markNotificationAsRead(userId, id);
    return res.json({ success });
  } catch (err) {
    console.error('[MARK_NOTIF_READ_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update notification.' },
    });
  }
}

/**
 * POST /api/notifications/mark-all-read
 */
export async function markAllRead(req, res) {
  try {
    const userId = req.user.id;
    const count = await markAllNotificationsAsRead(userId);
    return res.json({ success: true, count });
  } catch (err) {
    console.error('[MARK_ALL_NOTIFS_READ_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notifications read.' },
    });
  }
}
