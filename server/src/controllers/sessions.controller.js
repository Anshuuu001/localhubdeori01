import { executeQuery } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * List all active sessions for the current authenticated user.
 */
export async function listActiveSessions(req, res) {
  const [sessions] = await executeQuery(
    `SELECT 
      id,
      device_label,
      ip_address,
      user_agent,
      last_active_at,
      expires_at,
      created_at
     FROM auth_sessions
     WHERE user_id = ? AND is_revoked = FALSE AND expires_at > NOW()
     ORDER BY last_active_at DESC`,
    [req.user.id]
  );

  const formatted = sessions.map((s) => ({
    id: s.id,
    deviceLabel: s.device_label || 'Browser Session',
    ipAddress: s.ip_address,
    userAgent: s.user_agent,
    lastActiveAt: s.last_active_at,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    isCurrent: s.id === req.session.id,
  }));

  return res.json({
    sessions: formatted,
    count: formatted.length,
    currentSessionId: req.session.id,
  });
}

/**
 * Revoke a specific active session.
 */
export async function revokeSession(req, res) {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Session ID is required.' },
    });
  }

  // Ensure user owns this session (IDOR protection)
  const [rows] = await executeQuery(
    'SELECT id FROM auth_sessions WHERE id = ? AND user_id = ? AND is_revoked = FALSE',
    [sessionId, req.user.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      error: { code: 'SESSION_NOT_FOUND', message: 'Active session not found or already revoked.' },
    });
  }

  await executeQuery(
    'UPDATE auth_sessions SET is_revoked = TRUE, revoked_at = NOW() WHERE id = ?',
    [sessionId]
  );

  const isCurrent = sessionId === req.session.id;
  if (isCurrent) {
    res.clearCookie('lhx_session', { path: '/' });
    res.clearCookie('lhx_csrf', { path: '/' });
  }

  await logAuditEvent({
    actorId: req.user.id,
    action: 'session.revoked',
    entityType: 'session',
    entityId: sessionId,
    details: { wasCurrentSession: isCurrent },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: isCurrent ? 'Current session revoked. You have been logged out.' : 'Session revoked successfully.',
    isCurrent,
  });
}

/**
 * Revoke all other active sessions except the current one.
 */
export async function revokeOtherSessions(req, res) {
  const [result] = await executeQuery(
    'UPDATE auth_sessions SET is_revoked = TRUE, revoked_at = NOW() WHERE user_id = ? AND id != ? AND is_revoked = FALSE',
    [req.user.id, req.session.id]
  );

  await logAuditEvent({
    actorId: req.user.id,
    action: 'session.revoke_others',
    entityType: 'user',
    entityId: req.user.id,
    details: { currentSessionKept: req.session.id },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: 'All other active sessions have been logged out successfully.',
    revokedCount: result.affectedRows,
  });
}
