import { executeQuery, withTransaction } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';

const VALID_ROLES = ['citizen', 'editor', 'moderator', 'verifier', 'admin', 'super_admin'];

/**
 * List staff and users for role inspection and management.
 */
export async function listUsers(req, res) {
  try {
    const {
      role = 'all',
      status = 'all',
      search = '',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.is_email_verified,
        u.phone,
        u.is_phone_verified,
        u.role,
        u.status,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE 1=1
    `;
    const params = [];

    if (role !== 'all') {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    if (status !== 'all') {
      sql += ' AND u.status = ?';
      params.push(status);
    }

    if (search.trim()) {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await executeQuery(sql, params);

    // Count
    let countSql = `SELECT COUNT(*) as total FROM users u WHERE 1=1`;
    const countParams = [];
    if (role !== 'all') {
      countSql += ' AND u.role = ?';
      countParams.push(role);
    }
    if (status !== 'all') {
      countSql += ' AND u.status = ?';
      countParams.push(status);
    }
    if (search.trim()) {
      countSql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const s = `%${search.trim()}%`;
      countParams.push(s, s, s);
    }
    const [totalRows] = await executeQuery(countSql, countParams);

    return res.json({
      users: rows,
      total: totalRows[0]?.total || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('[LIST_USERS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list users.' },
    });
  }
}

/**
 * Update a user's system role.
 * Critical security guards:
 * - Prevents self-role escalation (caller cannot update their own role).
 * - Requires admin or super_admin caller.
 * - Only super_admin can assign 'super_admin' or 'admin' roles.
 * - Records role grant/revocation in audit logs.
 */
export async function updateUserRole(req, res) {
  try {
    const { id: targetUserId } = req.params;
    const { role: newRole } = req.body;

    if (!newRole || !VALID_ROLES.includes(newRole)) {
      return res.status(400).json({
        error: { code: 'INVALID_ROLE', message: `Role must be one of: ${VALID_ROLES.join(', ')}.` },
      });
    }

    // 1. Anti-self-escalation guard (Rule A)
    if (targetUserId === req.user.id) {
      return res.status(403).json({
        error: {
          code: 'SELF_ROLE_MODIFICATION_PROHIBITED',
          message: 'Security policy prohibits modifying your own administrative role.',
        },
      });
    }

    // 2. Caller authority guard
    const callerRole = req.user.role || 'citizen';
    if (newRole === 'super_admin' && callerRole !== 'super_admin') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only an existing Super Administrator can promote another user to Super Admin.',
        },
      });
    }

    // Check target exists
    const [targetRows] = await executeQuery('SELECT id, full_name, role FROM users WHERE id = ?', [targetUserId]);
    if (targetRows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target user not found.' } });
    }

    const previousRole = targetRows[0].role;

    // Apply update
    await executeQuery('UPDATE users SET role = ? WHERE id = ?', [newRole, targetUserId]);

    // Record audit event
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: callerRole,
      action: 'admin.role_changed',
      entityType: 'user',
      entityId: targetUserId,
      details: { previousRole, newRole, targetName: targetRows[0].full_name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: `User role successfully updated to ${newRole}.`,
      userId: targetUserId,
      previousRole,
      newRole,
    });
  } catch (err) {
    console.error('[UPDATE_USER_ROLE_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update user role.' },
    });
  }
}

/**
 * List full catalog of permissions and role mappings.
 */
export async function listPermissionsCatalog(req, res) {
  try {
    const [perms] = await executeQuery('SELECT * FROM permissions ORDER BY module, id');
    const [roles] = await executeQuery('SELECT * FROM roles WHERE is_system_template = TRUE');
    const [rolePerms] = await executeQuery('SELECT * FROM role_permissions');

    return res.json({
      permissions: perms,
      roles,
      rolePermissions: rolePerms,
    });
  } catch (err) {
    console.error('[LIST_PERMISSIONS_CATALOG_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve permissions catalog.' },
    });
  }
}

/**
 * Get explicit permissions for a specific user.
 */
export async function getUserPermissions(req, res) {
  try {
    const { id: targetUserId } = req.params;

    const [targetUser] = await executeQuery('SELECT id, full_name, role FROM users WHERE id = ?', [targetUserId]);
    if (targetUser.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }

    // Role default permissions
    const [rolePerms] = await executeQuery(
      `SELECT p.id, p.name, p.module, p.description
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ?`,
      [targetUser[0].role]
    );

    // Explicit user grants
    const [explicitPerms] = await executeQuery(
      `SELECT p.id, p.name, p.module, p.description, aup.granted_at, grantor.full_name AS granted_by_name
       FROM admin_user_permissions aup
       JOIN permissions p ON aup.permission_id = p.id
       LEFT JOIN users grantor ON aup.granted_by_user_id = grantor.id
       WHERE aup.user_id = ?`,
      [targetUserId]
    );

    return res.json({
      user: targetUser[0],
      rolePermissions: rolePerms,
      explicitPermissions: explicitPerms,
    });
  } catch (err) {
    console.error('[GET_USER_PERMISSIONS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve user permissions.' },
    });
  }
}

/**
 * Grant or revoke explicit permissions for a user (Least Privilege fine-tuning).
 */
export async function updateUserPermissions(req, res) {
  try {
    const { id: targetUserId } = req.params;
    const { permissions = [] } = req.body; // Array of permission_id strings

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Permissions must be an array of permission IDs.' },
      });
    }

    // Caller self-modification guard
    if (targetUserId === req.user.id) {
      return res.status(403).json({
        error: {
          code: 'SELF_PERMISSION_MODIFICATION_PROHIBITED',
          message: 'Security policy prohibits modifying your own administrative permissions.',
        },
      });
    }

    const grantorId = req.user.id;

    await withTransaction(async (conn) => {
      // Clear current explicit permissions
      await conn.execute('DELETE FROM admin_user_permissions WHERE user_id = ?', [targetUserId]);

      // Insert new explicit grants
      for (const permId of permissions) {
        await conn.execute(
          `INSERT INTO admin_user_permissions (user_id, permission_id, granted_by_user_id)
           VALUES (?, ?, ?)`,
          [targetUserId, permId, grantorId]
        );
      }
    });

    await logAuditEvent({
      actorId: grantorId,
      actorRole: req.user.role,
      action: 'admin.permissions_updated',
      entityType: 'user',
      entityId: targetUserId,
      details: { permissionsGranted: permissions },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: 'User permissions updated successfully.',
      userId: targetUserId,
      permissions,
    });
  } catch (err) {
    console.error('[UPDATE_USER_PERMISSIONS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update user permissions.' },
    });
  }
}
