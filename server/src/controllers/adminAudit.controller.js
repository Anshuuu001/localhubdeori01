import { executeQuery } from '../config/database.js';

/**
 * Restricted audit log viewer with multi-criteria filtering, pagination, and sanitization.
 * Implements append-only access: no delete or edit API endpoints exist.
 */
export async function getAuditLogs(req, res) {
  try {
    const {
      actorId = '',
      actorRole = 'all',
      action = '',
      entityType = 'all',
      entityId = '',
      dateFrom = '',
      dateTo = '',
      search = '',
      page = 1,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT 
        al.id,
        al.actor_id,
        al.actor_role,
        al.action,
        al.entity_type,
        al.entity_id,
        al.details,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.full_name AS actor_name,
        u.email AS actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (actorId.trim()) {
      sql += ' AND al.actor_id = ?';
      params.push(actorId.trim());
    }

    if (actorRole !== 'all') {
      sql += ' AND al.actor_role = ?';
      params.push(actorRole);
    }

    if (action.trim()) {
      sql += ' AND al.action LIKE ?';
      params.push(`%${action.trim()}%`);
    }

    if (entityType !== 'all') {
      sql += ' AND al.entity_type = ?';
      params.push(entityType);
    }

    if (entityId.trim()) {
      sql += ' AND al.entity_id = ?';
      params.push(entityId.trim());
    }

    if (dateFrom) {
      sql += ' AND al.created_at >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ' AND al.created_at <= ?';
      params.push(dateTo);
    }

    if (search.trim()) {
      sql += ' AND (al.action LIKE ? OR al.entity_type LIKE ? OR al.entity_id LIKE ? OR u.full_name LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await executeQuery(sql, params);

    // Count query
    let countSql = `
      SELECT COUNT(*) as total 
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE 1=1
    `;
    const countParams = [];

    if (actorId.trim()) {
      countSql += ' AND al.actor_id = ?';
      countParams.push(actorId.trim());
    }
    if (actorRole !== 'all') {
      countSql += ' AND al.actor_role = ?';
      countParams.push(actorRole);
    }
    if (action.trim()) {
      countSql += ' AND al.action LIKE ?';
      countParams.push(`%${action.trim()}%`);
    }
    if (entityType !== 'all') {
      countSql += ' AND al.entity_type = ?';
      countParams.push(entityType);
    }
    if (entityId.trim()) {
      countSql += ' AND al.entity_id = ?';
      countParams.push(entityId.trim());
    }
    if (dateFrom) {
      countSql += ' AND al.created_at >= ?';
      countParams.push(dateFrom);
    }
    if (dateTo) {
      countSql += ' AND al.created_at <= ?';
      countParams.push(dateTo);
    }
    if (search.trim()) {
      countSql += ' AND (al.action LIKE ? OR al.entity_type LIKE ? OR al.entity_id LIKE ? OR u.full_name LIKE ?)';
      const s = `%${search.trim()}%`;
      countParams.push(s, s, s, s);
    }

    const [totalRows] = await executeQuery(countSql, countParams);

    return res.json({
      logs: rows.map(r => ({
        id: r.id,
        actorId: r.actor_id,
        actorRole: r.actor_role,
        actorName: r.actor_name || 'System / Unregistered',
        actorEmail: r.actor_email || null,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        details: r.details,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        createdAt: r.created_at,
      })),
      total: totalRows[0]?.total || 0,
      page: pageNum,
      limit: limitNum,
      immutabilityNotice: 'Audit records are append-only via application APIs. Deletion and tampering are strictly prohibited at runtime.',
    });
  } catch (err) {
    console.error('[GET_AUDIT_LOGS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve audit records.' },
    });
  }
}
