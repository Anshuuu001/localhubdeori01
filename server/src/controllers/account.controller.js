import crypto from 'crypto';
import { executeQuery } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * Get private user profile and privacy settings.
 */
export async function getAccountProfile(req, res) {
  const [users] = await executeQuery(
    `SELECT 
      id,
      full_name,
      email,
      is_email_verified,
      phone,
      is_phone_verified,
      status,
      created_at,
      updated_at
     FROM users WHERE id = ?`,
    [req.user.id]
  );

  if (users.length === 0) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
    });
  }

  const user = users[0];

  // Check pending deletion request
  const [deletionRequests] = await executeQuery(
    `SELECT id, grace_period_days, scheduled_deletion_at, status, created_at 
     FROM account_deletion_requests 
     WHERE user_id = ? AND status = 'pending_grace_period'
     ORDER BY created_at DESC LIMIT 1`,
    [req.user.id]
  );

  return res.json({
    profile: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      isEmailVerified: Boolean(user.is_email_verified),
      phone: user.phone,
      isPhoneVerified: Boolean(user.is_phone_verified),
      status: user.status,
      createdAt: user.created_at,
    },
    privacy: {
      minimalDataCollection: true,
      gpsTracking: false,
      villageLocalityDerived: 'User-selected only',
      rawDocumentsStored: false,
    },
    deletionRequest: deletionRequests[0] || null,
  });
}

/**
 * Update personal profile details (safe whitelist only).
 */
export async function updateAccountProfile(req, res) {
  const { fullName } = req.body;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Full name is required.' },
    });
  }

  await executeQuery('UPDATE users SET full_name = ? WHERE id = ?', [
    fullName.trim().slice(0, 100),
    req.user.id,
  ]);

  await logAuditEvent({
    actorId: req.user.id,
    action: 'account.update_profile',
    entityType: 'user',
    entityId: req.user.id,
    details: { updatedName: fullName.trim() },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: 'Profile updated successfully.',
    fullName: fullName.trim(),
  });
}

/**
 * Unlink a contact identifier (phone or email).
 * Safeguard: Cannot unlink the only verified identifier on an account.
 */
export async function unlinkContactIdentifier(req, res) {
  const { channel } = req.body; // 'email' | 'phone'

  if (channel !== 'email' && channel !== 'phone') {
    return res.status(400).json({
      error: { code: 'INVALID_CHANNEL', message: "Channel must be 'email' or 'phone'." },
    });
  }

  const [users] = await executeQuery(
    'SELECT email, is_email_verified, phone, is_phone_verified FROM users WHERE id = ?',
    [req.user.id]
  );

  const u = users[0];
  const isEmail = channel === 'email';

  // Check if this is the only verified identifier
  if (isEmail && u.is_email_verified && !u.is_phone_verified) {
    return res.status(400).json({
      error: {
        code: 'CANNOT_REMOVE_LAST_IDENTIFIER',
        message: 'Cannot unlink email because it is your only verified contact method. Please verify a phone number first.',
      },
    });
  }

  if (!isEmail && u.is_phone_verified && !u.is_email_verified) {
    return res.status(400).json({
      error: {
        code: 'CANNOT_REMOVE_LAST_IDENTIFIER',
        message: 'Cannot unlink phone because it is your only verified contact method. Please verify an email address first.',
      },
    });
  }

  if (isEmail) {
    await executeQuery('UPDATE users SET email = NULL, is_email_verified = FALSE WHERE id = ?', [req.user.id]);
  } else {
    await executeQuery('UPDATE users SET phone = NULL, is_phone_verified = FALSE WHERE id = ?', [req.user.id]);
  }

  await logAuditEvent({
    actorId: req.user.id,
    action: 'account.unlink_identifier',
    entityType: 'user',
    entityId: req.user.id,
    details: { unlinkedChannel: channel },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: `${isEmail ? 'Email' : 'Phone number'} unlinked from your account.`,
  });
}

/**
 * Request account deletion with a 30-day grace period.
 */
export async function requestAccountDeletion(req, res) {
  const { reason } = req.body;
  const gracePeriodDays = 30;
  const scheduledDate = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);

  // Check if already requested
  const [existing] = await executeQuery(
    `SELECT id FROM account_deletion_requests WHERE user_id = ? AND status = 'pending_grace_period'`,
    [req.user.id]
  );

  if (existing.length > 0) {
    return res.status(400).json({
      error: {
        code: 'DELETION_ALREADY_REQUESTED',
        message: 'An account deletion request is already pending.',
      },
    });
  }

  const requestId = crypto.randomUUID();

  await executeQuery(
    `INSERT INTO account_deletion_requests 
      (id, user_id, reason, grace_period_days, scheduled_deletion_at, status)
     VALUES (?, ?, ?, ?, ?, 'pending_grace_period')`,
    [requestId, req.user.id, reason ? String(reason).slice(0, 500) : null, gracePeriodDays, scheduledDate]
  );

  await executeQuery("UPDATE users SET status = 'deletion_pending' WHERE id = ?", [req.user.id]);

  await logAuditEvent({
    actorId: req.user.id,
    action: 'account.deletion_requested',
    entityType: 'user',
    entityId: req.user.id,
    details: { gracePeriodDays, scheduledDeletionAt: scheduledDate.toISOString() },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.status(201).json({
    message: `Account deletion requested. Your account enters a ${gracePeriodDays}-day cooling-off period until ${scheduledDate.toISOString().slice(0, 10)}. You can cancel at any time before this date.`,
    requestId,
    gracePeriodDays,
    scheduledDeletionAt: scheduledDate,
  });
}

/**
 * Cancel a pending account deletion request.
 */
export async function cancelAccountDeletion(req, res) {
  const [existing] = await executeQuery(
    `SELECT id FROM account_deletion_requests WHERE user_id = ? AND status = 'pending_grace_period'`,
    [req.user.id]
  );

  if (existing.length === 0) {
    return res.status(400).json({
      error: { code: 'NO_PENDING_DELETION', message: 'No pending account deletion request found.' },
    });
  }

  await executeQuery(
    `UPDATE account_deletion_requests 
     SET status = 'cancelled', cancelled_at = NOW() 
     WHERE user_id = ? AND status = 'pending_grace_period'`,
    [req.user.id]
  );

  await executeQuery("UPDATE users SET status = 'active' WHERE id = ?", [req.user.id]);

  await logAuditEvent({
    actorId: req.user.id,
    action: 'account.deletion_cancelled',
    entityType: 'user',
    entityId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: 'Account deletion request has been cancelled. Your account remains active.',
  });
}
