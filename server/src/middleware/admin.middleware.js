import { executeQuery } from '../config/database.js';

/**
 * Ensures caller has an active authenticated session.
 */
export function requireStaff(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required to access administrative resources.' },
    });
  }

  const role = req.user.role || 'citizen';
  const staffRoles = ['editor', 'moderator', 'verifier', 'admin', 'super_admin'];
  if (!staffRoles.includes(role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access restricted to authorized LocalHub X administrative staff.',
      },
    });
  }

  next();
}

/**
 * Requires 'admin' or 'super_admin' role.
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  const role = req.user.role || 'citizen';
  if (!['admin', 'super_admin'].includes(role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Administrator privilege is required for this operation.',
      },
    });
  }

  next();
}

/**
 * Requires 'super_admin' role specifically (e.g. for role management).
 */
export function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  const role = req.user.role || 'citizen';
  if (role !== 'super_admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Super Administrator privilege is required for this operation.',
      },
    });
  }

  next();
}

/**
 * Granular module-level permission check (Least Privilege).
 * Checks explicit user grant in admin_user_permissions OR role grant in role_permissions.
 * Super Admin bypasses with full authority.
 */
export function requireAdminPermission(permissionId) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
      }

      const userRole = req.user.role || 'citizen';

      // Super admin has full capability
      if (userRole === 'super_admin') {
        return next();
      }

      // Check explicit user permissions
      const [userPerms] = await executeQuery(
        'SELECT permission_id FROM admin_user_permissions WHERE user_id = ? AND permission_id = ?',
        [req.user.id, permissionId]
      );

      if (userPerms.length > 0) {
        return next();
      }

      // Check role template permissions
      const [rolePerms] = await executeQuery(
        'SELECT permission_id FROM role_permissions WHERE role_id = ? AND permission_id = ?',
        [userRole, permissionId]
      );

      if (rolePerms.length > 0) {
        return next();
      }

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Your account lacks the '${permissionId}' administrative capability required for this module.`,
        },
      });
    } catch (err) {
      console.error('[ADMIN_PERMISSION_CHECK_ERROR]', err.message);
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify administrative authorization.' },
      });
    }
  };
}

/**
 * Checks if user is authenticated and re-authenticated recently (within 15 mins)
 * or provides password for high-consequence operations.
 */
export function requirePrivilegedReauth(req, res, next) {
  if (!req.session || !req.session.lastReauthAt) {
    return res.status(403).json({
      error: {
        code: 'REAUTH_REQUIRED',
        message: 'Recent re-authentication required for this sensitive administrative operation.',
      },
    });
  }

  const lastReauth = new Date(req.session.lastReauthAt).getTime();
  const maxAgeMs = 15 * 60 * 1000; // 15 minutes
  if (Date.now() - lastReauth > maxAgeMs) {
    return res.status(403).json({
      error: {
        code: 'REAUTH_REQUIRED',
        message: 'Administrative security timeout. Please re-enter your password to proceed.',
      },
    });
  }

  next();
}
