import { executeQuery } from '../config/database.js';
import { hashToken } from '../services/crypto.service.js';

/**
 * Parses cookies and session tokens.
 * Populates req.user and req.session if valid.
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.lhx_session) {
      token = req.cookies.lhx_session;
    }

    // 2. Fallback to Authorization: Bearer <token>
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      req.user = null;
      req.session = null;
      return next();
    }

    const tokenHash = hashToken(token);

    const [rows] = await executeQuery(
      `SELECT 
        s.id AS session_id,
        s.user_id,
        s.csrf_secret,
        s.expires_at,
        s.last_active_at,
        s.last_reauth_at,
        s.device_label,
        s.ip_address AS session_ip,
        u.full_name,
        u.email,
        u.is_email_verified,
        u.phone,
        u.is_phone_verified,
        u.role AS user_role,
        u.status AS user_status,
        u.created_at AS user_created_at
      FROM auth_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.is_revoked = FALSE AND s.expires_at > NOW()`,
      [tokenHash]
    );

    if (rows.length === 0) {
      // Invalid or expired session
      res.clearCookie('lhx_session', { path: '/' });
      res.clearCookie('lhx_csrf', { path: '/' });
      req.user = null;
      req.session = null;
      return next();
    }

    const sessionData = rows[0];

    if (sessionData.user_status === 'suspended') {
      req.user = null;
      req.session = null;
      return res.status(403).json({
        error: { code: 'ACCOUNT_SUSPENDED', message: 'This account has been suspended.' },
      });
    }

    req.user = {
      id: sessionData.user_id,
      fullName: sessionData.full_name,
      email: sessionData.email,
      isEmailVerified: Boolean(sessionData.is_email_verified),
      phone: sessionData.phone,
      isPhoneVerified: Boolean(sessionData.is_phone_verified),
      role: sessionData.user_role || 'citizen',
      status: sessionData.user_status,
      createdAt: sessionData.user_created_at,
    };

    req.session = {
      id: sessionData.session_id,
      csrfSecret: sessionData.csrf_secret,
      expiresAt: sessionData.expires_at,
      lastActiveAt: sessionData.last_active_at,
      lastReauthAt: sessionData.last_reauth_at,
      deviceLabel: sessionData.device_label,
      rawToken: token,
    };

    // Update last_active_at throttling to once every 60 seconds
    const lastActive = new Date(sessionData.last_active_at).getTime();
    if (Date.now() - lastActive > 60000) {
      executeQuery(
        'UPDATE auth_sessions SET last_active_at = NOW() WHERE id = ?',
        [sessionData.session_id]
      ).catch(() => {});
    }

    next();
  } catch (err) {
    console.error('[AUTH_MIDDLEWARE_ERROR]', err.message);
    req.user = null;
    req.session = null;
    next();
  }
}

/**
 * Route guard requiring an authenticated user.
 */
export function requireAuth(req, res, next) {
  if (!req.user || !req.session) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required to access this resource.' },
    });
  }
  next();
}

/**
 * Route guard requiring at least one verified contact method.
 */
export function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }
  if (!req.user.isEmailVerified && !req.user.isPhoneVerified) {
    return res.status(403).json({
      error: {
        code: 'VERIFICATION_REQUIRED',
        message: 'A verified email or phone number is required to perform this action.',
      },
    });
  }
  next();
}

/**
 * Route guard requiring specific system role(s) (e.g. 'editor', 'admin').
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }
    const userRole = req.user.role || 'citizen';
    if (userRole === 'super_admin' || allowedRoles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      },
    });
  };
}

/**
 * CSRF Protection middleware for state-changing cookie-authenticated requests.
 */
export function csrfProtection(req, res, next) {
  // Safe HTTP methods do not change state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // If request is authenticated via session cookie, verify CSRF token
  if (req.cookies && req.cookies.lhx_session && req.session) {
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies.lhx_csrf;

    if (!headerToken || (headerToken !== req.session.csrfSecret && headerToken !== cookieToken)) {
      return res.status(403).json({
        error: {
          code: 'CSRF_VALIDATION_FAILED',
          message: 'Invalid or missing CSRF security token.',
        },
      });
    }
  }

  next();
}

/**
 * Requires re-authentication within the last 15 minutes for sensitive operations.
 */
export function requireReauth(req, res, next) {
  if (!req.session || !req.session.lastReauthAt) {
    return res.status(403).json({
      error: { code: 'REAUTH_REQUIRED', message: 'Recent re-authentication is required for this action.' },
    });
  }

  const lastReauth = new Date(req.session.lastReauthAt).getTime();
  const maxAgeMs = 15 * 60 * 1000; // 15 minutes
  if (Date.now() - lastReauth > maxAgeMs) {
    return res.status(403).json({
      error: {
        code: 'REAUTH_REQUIRED',
        message: 'Security confirmation timeout. Please re-enter your password to proceed.',
      },
    });
  }

  next();
}

/**
 * Authorization guard for business profile operations.
 * Verifies that the authenticated user is either the Owner or has the specified permission.
 */
export function requireBusinessPermission(permissionName) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
      }

      const businessId = req.params.businessId || req.params.id || req.body.businessProfileId;
      if (!businessId) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'Business identifier is required.' },
        });
      }

      // Check if user is the direct owner of the business
      const [bizRows] = await executeQuery(
        'SELECT id, owner_user_id, status FROM business_profiles WHERE id = ?',
        [businessId]
      );

      if (bizRows.length === 0) {
        return res.status(404).json({
          error: { code: 'BUSINESS_NOT_FOUND', message: 'Business profile not found.' },
        });
      }

      const business = bizRows[0];

      if (business.owner_user_id === req.user.id) {
        // Owner has absolute authority over their business
        req.business = business;
        req.businessRole = 'owner';
        return next();
      }

      // If not owner, check business team membership and permissions
      const [memberRows] = await executeQuery(
        `SELECT 
          m.id AS membership_id,
          m.role_id,
          m.status AS membership_status,
          r.name AS role_name
        FROM business_memberships m
        JOIN roles r ON m.role_id = r.id
        WHERE m.business_profile_id = ? AND m.user_id = ? AND m.status = 'active'`,
        [businessId, req.user.id]
      );

      if (memberRows.length === 0) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You are not a member of this business profile.',
          },
        });
      }

      const membership = memberRows[0];

      // Check if permission is assigned to this role
      const [permRows] = await executeQuery(
        `SELECT permission_id FROM role_permissions WHERE role_id = ? AND permission_id = ?`,
        [membership.role_id, permissionName]
      );

      if (permRows.length === 0) {
        return res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `You lack the '${permissionName}' permission required for this operation.`,
          },
        });
      }

      req.business = business;
      req.businessRole = membership.role_id;
      next();
    } catch (err) {
      console.error('[REQUIRE_BUSINESS_PERMISSION_ERROR]', err.message);
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify business authorization.' },
      });
    }
  };
}
