import { executeQuery } from '../config/database.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'plainPassword',
  'newPassword',
  'otp',
  'otp_hash',
  'token',
  'token_hash',
  'csrf_secret',
  'secret',
]);

/**
 * Recursively strips sensitive fields from an object to ensure secrets are never logged.
 */
function sanitizeDetails(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDetails);

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeDetails(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Writes an immutable audit event to the `audit_logs` table.
 */
export async function logAuditEvent({
  actorId = null,
  actorRole = 'user',
  action,
  entityType,
  entityId = null,
  details = {},
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const cleanDetails = sanitizeDetails(details);
    const sql = `
      INSERT INTO audit_logs 
        (actor_id, actor_role, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(sql, [
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      JSON.stringify(cleanDetails),
      ipAddress ? String(ipAddress).slice(0, 45) : null,
      userAgent ? String(userAgent).slice(0, 255) : null,
    ]);
  } catch (err) {
    // Non-blocking error logging for audits
    console.error(`[AUDIT_LOG_ERROR] Failed to record audit log for action "${action}":`, err.message);
  }
}
