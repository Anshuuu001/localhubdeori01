import crypto from 'crypto';
import { executeQuery, withTransaction } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';

/**
 * List active and historical restrictions with filters.
 */
export async function getRestrictions(req, res) {
  try {
    const {
      status = 'active',
      targetType = 'all',
      search = '',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT 
        ar.*,
        u.full_name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        admin.full_name AS restricted_by_name,
        lifted_admin.full_name AS lifted_by_name
      FROM account_restrictions ar
      JOIN users u ON ar.user_id = u.id
      JOIN users admin ON ar.restricted_by_user_id = admin.id
      LEFT JOIN users lifted_admin ON ar.lifted_by_user_id = lifted_admin.id
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'all') {
      sql += ' AND ar.status = ?';
      params.push(status);
    }

    if (targetType !== 'all') {
      sql += ' AND ar.target_type = ?';
      params.push(targetType);
    }

    if (search.trim()) {
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR ar.reason_category LIKE ? OR ar.public_reason LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY ar.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await executeQuery(sql, params);

    // Get count
    let countSql = `
      SELECT COUNT(*) as total 
      FROM account_restrictions ar
      JOIN users u ON ar.user_id = u.id
      WHERE 1=1
    `;
    const countParams = [];
    if (status !== 'all') {
      countSql += ' AND ar.status = ?';
      countParams.push(status);
    }
    if (targetType !== 'all') {
      countSql += ' AND ar.target_type = ?';
      countParams.push(targetType);
    }
    const [totalRows] = await executeQuery(countSql, countParams);

    return res.json({
      restrictions: rows,
      total: totalRows[0]?.total || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('[GET_RESTRICTIONS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve restrictions.' },
    });
  }
}

/**
 * Impose a restriction on a user account, business profile, listing, or feature.
 * Automatically enforces 30-day appeal window.
 * Sanitizes user notice (no private detection signals or reporter details).
 */
export async function createRestriction(req, res) {
  try {
    const {
      userId,
      targetType,
      targetId,
      restrictionType,
      reasonCategory,
      publicReason,
      internalNotes,
      affectedScope,
      expiryDays = null,
      reviewDueDays = 7,
    } = req.body;

    const validTargets = ['user_account', 'business_profile', 'listing', 'feature_posting', 'feature_booking', 'emergency_protective'];
    if (!targetType || !validTargets.includes(targetType)) {
      return res.status(400).json({
        error: { code: 'INVALID_TARGET_TYPE', message: `Target type must be one of: ${validTargets.join(', ')}.` },
      });
    }

    const validRestrictions = ['warning', 'listing_hold', 'listing_removal', 'feature_restriction', 'account_suspension', 'emergency_protective_action'];
    if (!restrictionType || !validRestrictions.includes(restrictionType)) {
      return res.status(400).json({
        error: { code: 'INVALID_RESTRICTION_TYPE', message: `Restriction type must be one of: ${validRestrictions.join(', ')}.` },
      });
    }

    if (!userId || !targetId) {
      return res.status(400).json({
        error: { code: 'MISSING_TARGETS', message: 'User ID and Target ID are required.' },
      });
    }

    if (!reasonCategory || !publicReason || publicReason.trim().length < 5) {
      return res.status(400).json({
        error: { code: 'REASON_REQUIRED', message: 'Reason category and a user-facing explanation are required.' },
      });
    }

    const restrictionId = crypto.randomUUID();
    const reviewerId = req.user.id;

    // Calculate dates
    const startsAt = new Date();
    const appealWindowEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day appeal window
    const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null;
    const reviewDueAt = reviewDueDays ? new Date(Date.now() + reviewDueDays * 24 * 60 * 60 * 1000) : null;

    await withTransaction(async (conn) => {
      // 1. Insert restriction record
      await conn.execute(
        `INSERT INTO account_restrictions 
          (id, user_id, target_type, target_id, restriction_type, reason_category, public_reason, internal_notes, affected_scope, status, restricted_by_user_id, starts_at, expires_at, review_due_at, appeal_window_ends_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
        [
          restrictionId,
          userId,
          targetType,
          targetId,
          restrictionType,
          reasonCategory,
          publicReason.trim(),
          internalNotes || null,
          affectedScope || 'general',
          reviewerId,
          startsAt,
          expiresAt,
          reviewDueAt,
          appealWindowEndsAt,
        ]
      );

      // 2. Apply operational impact
      if (restrictionType === 'account_suspension') {
        await conn.execute("UPDATE users SET status = 'suspended' WHERE id = ?", [userId]);
      } else if (targetType === 'listing' && (restrictionType === 'listing_hold' || restrictionType === 'listing_removal')) {
        const listStatus = restrictionType === 'listing_removal' ? 'removed' : 'paused';
        await conn.execute("UPDATE listings SET status = ?, moderation_notes = ? WHERE id = ?", [listStatus, publicReason, targetId]);
      } else if (targetType === 'business_profile' && restrictionType === 'account_suspension') {
        await conn.execute("UPDATE business_profiles SET status = 'suspended' WHERE id = ?", [targetId]);
      }

      // 3. Record decision history
      const histId = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO restriction_decisions_history 
          (id, restriction_id, action, actor_user_id, notes, new_state)
         VALUES (?, ?, 'created', ?, ?, ?)`,
        [
          histId,
          restrictionId,
          reviewerId,
          `Imposed ${restrictionType}: ${reasonCategory}`,
          JSON.stringify({ restrictionType, affectedScope, expiryDays }),
        ]
      );
    });

    // 4. Log audit event
    await logAuditEvent({
      actorId: reviewerId,
      actorRole: req.user.role,
      action: `restriction.${restrictionType}`,
      entityType: targetType,
      entityId: targetId,
      details: { restrictionId, restrictionType, reasonCategory, affectedScope },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // 5. Send user notification with sanitized public reason & appeal instructions
    createNotification({
      userId,
      actorUserId: reviewerId,
      notificationType: 'account_restriction',
      title: `Notice: Protective Action Imposed (${restrictionType.replace('_', ' ').toUpperCase()})`,
      message: `${publicReason.trim()} You have 30 days to appeal this decision via the LocalHub X Resolution Desk.`,
      targetType: 'account_restriction',
      targetId: restrictionId,
    }).catch(() => {});

    return res.status(201).json({
      message: 'Restriction successfully imposed and recorded.',
      id: restrictionId,
      restrictionType,
      appealWindowEndsAt: appealWindowEndsAt.toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });
  } catch (err) {
    console.error('[CREATE_RESTRICTION_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to impose restriction.' },
    });
  }
}

/**
 * Reassess, modify, or lift a restriction.
 */
export async function reassessRestriction(req, res) {
  try {
    const { id } = req.params;
    const { action, liftReason, newExpiryDays, internalNotes } = req.body;

    if (!action || !['lift', 'modify'].includes(action)) {
      return res.status(400).json({
        error: { code: 'INVALID_ACTION', message: 'Action must be lift or modify.' },
      });
    }

    if (action === 'lift' && (!liftReason || liftReason.trim().length < 5)) {
      return res.status(400).json({
        error: { code: 'REASON_REQUIRED', message: 'A documented reason is required to lift a restriction.' },
      });
    }

    const reviewerId = req.user.id;

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT * FROM account_restrictions WHERE id = ? FOR UPDATE',
        [id]
      );
      if (rows.length === 0) throw new Error('NOT_FOUND: Restriction not found.');

      const r = rows[0];

      if (action === 'lift') {
        await conn.execute(
          `UPDATE account_restrictions 
           SET status = 'lifted', lifted_at = NOW(), lifted_by_user_id = ?, lift_reason = ? 
           WHERE id = ?`,
          [reviewerId, liftReason, id]
        );

        // Restore operational impact
        if (r.restriction_type === 'account_suspension') {
          await conn.execute("UPDATE users SET status = 'active' WHERE id = ?", [r.user_id]);
        } else if (r.target_type === 'listing') {
          await conn.execute("UPDATE listings SET status = 'published' WHERE id = ?", [r.target_id]);
        } else if (r.target_type === 'business_profile') {
          await conn.execute("UPDATE business_profiles SET status = 'active' WHERE id = ?", [r.target_id]);
        }

        // Record history
        const histId = crypto.randomUUID();
        await conn.execute(
          `INSERT INTO restriction_decisions_history 
            (id, restriction_id, action, actor_user_id, notes)
           VALUES (?, ?, 'lifted', ?, ?)`,
          [histId, id, reviewerId, liftReason]
        );

        // Notify user
        createNotification({
          userId: r.user_id,
          actorUserId: reviewerId,
          notificationType: 'restriction_lifted',
          title: 'Account Restriction Lifted',
          message: `The restriction on your account/item has been lifted. Reason: ${liftReason}`,
          targetType: 'account_restriction',
          targetId: id,
        }).catch(() => {});
      } else {
        // Modify
        const newExpiry = newExpiryDays ? new Date(Date.now() + newExpiryDays * 24 * 60 * 60 * 1000) : r.expires_at;
        await conn.execute(
          `UPDATE account_restrictions 
           SET status = 'modified', expires_at = ?, internal_notes = CONCAT(COALESCE(internal_notes, ''), '\n', ?) 
           WHERE id = ?`,
          [newExpiry, internalNotes || 'Modified by reviewer', id]
        );

        const histId = crypto.randomUUID();
        await conn.execute(
          `INSERT INTO restriction_decisions_history 
            (id, restriction_id, action, actor_user_id, notes, new_state)
           VALUES (?, ?, 'modified', ?, ?, ?)`,
          [histId, id, reviewerId, internalNotes || 'Modified restriction', JSON.stringify({ newExpiryDays })]
        );
      }
    });

    await logAuditEvent({
      actorId: reviewerId,
      actorRole: req.user.role,
      action: `restriction.${action}`,
      entityType: 'account_restriction',
      entityId: id,
      details: { action, liftReason, internalNotes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: `Restriction successfully ${action === 'lift' ? 'lifted' : 'modified'}.`,
      id,
      status: action === 'lift' ? 'lifted' : 'modified',
    });
  } catch (err) {
    console.error('[REASSESS_RESTRICTION_ERROR]', err);
    if (err.message && err.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update restriction.' },
    });
  }
}

/**
 * Citizen endpoint: Submit an appeal against an active restriction.
 * Enforces 30-day appeal window with documented late justification policy (Rule F).
 */
export async function submitAppeal(req, res) {
  try {
    const { restrictionId } = req.params;
    const { appealReason, supportingEvidence, lateJustification } = req.body;

    if (!appealReason || appealReason.trim().length < 10) {
      return res.status(400).json({
        error: { code: 'REASON_REQUIRED', message: 'Please provide at least 10 characters explaining your appeal.' },
      });
    }

    const [rows] = await executeQuery(
      'SELECT * FROM account_restrictions WHERE id = ?',
      [restrictionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Restriction not found.' },
      });
    }

    const restriction = rows[0];

    // Verify caller is the restricted user
    if (restriction.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only appeal restrictions placed on your own account.' },
      });
    }

    // Check appeal window (30 days)
    const isPastWindow = new Date() > new Date(restriction.appeal_window_ends_at);
    let isLate = false;

    if (isPastWindow) {
      if (!lateJustification || lateJustification.trim().length < 10) {
        return res.status(400).json({
          error: {
            code: 'APPEAL_WINDOW_EXPIRED',
            message: 'The standard 30-day appeal window has passed. A documented justification for the late filing is required to proceed.',
          },
        });
      }
      isLate = true;
    }

    const appealId = crypto.randomUUID();

    await executeQuery(
      `INSERT INTO restriction_appeals 
        (id, restriction_id, appellant_user_id, appeal_reason, supporting_evidence, status, is_late_appeal, late_justification)
       VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?)`,
      [
        appealId,
        restrictionId,
        req.user.id,
        appealReason.trim(),
        supportingEvidence || null,
        isLate,
        lateJustification || null,
      ]
    );

    // Record decision history
    const histId = crypto.randomUUID();
    await executeQuery(
      `INSERT INTO restriction_decisions_history (id, restriction_id, action, actor_user_id, notes)
       VALUES (?, ?, 'appealed', ?, ?)`,
      [histId, restrictionId, req.user.id, `Appeal submitted: ${appealReason.slice(0, 100)}`]
    );

    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'appeal.submitted',
      entityType: 'restriction_appeal',
      entityId: appealId,
      details: { restrictionId, isLate },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      message: 'Your appeal has been submitted to the LocalHub X Resolution Desk.',
      appealId,
      status: 'submitted',
      isLateAppeal: isLate,
    });
  } catch (err) {
    console.error('[SUBMIT_APPEAL_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit appeal.' },
    });
  }
}

/**
 * Staff endpoint: List appeals for review.
 */
export async function getAppeals(req, res) {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT 
        ra.*,
        u.full_name AS appellant_name,
        u.email AS appellant_email,
        u.phone AS appellant_phone,
        ar.restriction_type,
        ar.reason_category,
        ar.public_reason,
        ar.restricted_by_user_id,
        ar.status AS restriction_status,
        rev.full_name AS reviewer_name,
        admin.full_name AS original_restricter_name
      FROM restriction_appeals ra
      JOIN users u ON ra.appellant_user_id = u.id
      JOIN account_restrictions ar ON ra.restriction_id = ar.id
      JOIN users admin ON ar.restricted_by_user_id = admin.id
      LEFT JOIN users rev ON ra.reviewer_user_id = rev.id
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'all') {
      sql += ' AND ra.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY ra.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await executeQuery(sql, params);

    return res.json({
      appeals: rows,
      count: rows.length,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('[GET_APPEALS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve appeals.' },
    });
  }
}

/**
 * Staff endpoint: Decide on an appeal (uphold, modify, lift, info_requested).
 * Implements reviewer separation check (Rule F: separate reviewer where practical).
 */
export async function reviewAppeal(req, res) {
  try {
    const { id } = req.params;
    const {
      decision,
      decisionNotes,
      liftReason,
    } = req.body;

    const validDecisions = ['uphold', 'modify', 'lift', 'info_requested'];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        error: { code: 'INVALID_DECISION', message: `Decision must be one of: ${validDecisions.join(', ')}.` },
      });
    }

    if (!decisionNotes || decisionNotes.trim().length < 5) {
      return res.status(400).json({
        error: { code: 'NOTES_REQUIRED', message: 'Detailed decision notes are required.' },
      });
    }

    const reviewerId = req.user.id;

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        `SELECT ra.*, ar.restricted_by_user_id, ar.target_type, ar.target_id, ar.restriction_type, ar.user_id
         FROM restriction_appeals ra
         JOIN account_restrictions ar ON ra.restriction_id = ar.id
         WHERE ra.id = ? FOR UPDATE`,
        [id]
      );

      if (rows.length === 0) throw new Error('NOT_FOUND: Appeal not found.');

      const appeal = rows[0];

      // Reviewer separation guard (Rule F)
      if (appeal.restricted_by_user_id === reviewerId && req.user.role !== 'super_admin') {
        // Warning: Separation of duties
        console.warn(`[APPEAL_REVIEW_SEPARATION] Reviewer ${reviewerId} is reviewing restriction they imposed.`);
      }

      let newAppealStatus = decision;
      if (decision === 'uphold') newAppealStatus = 'upheld';
      else if (decision === 'modify') newAppealStatus = 'modified';
      else if (decision === 'lift') newAppealStatus = 'lifted';

      await conn.execute(
        `UPDATE restriction_appeals 
         SET status = ?, reviewer_user_id = ?, reviewed_at = NOW(), decision_notes = ? 
         WHERE id = ?`,
        [newAppealStatus, reviewerId, decisionNotes, id]
      );

      // If lifted, lift the restriction as well
      if (decision === 'lift') {
        await conn.execute(
          `UPDATE account_restrictions 
           SET status = 'lifted', lifted_at = NOW(), lifted_by_user_id = ?, lift_reason = ? 
           WHERE id = ?`,
          [reviewerId, liftReason || decisionNotes, appeal.restriction_id]
        );

        if (appeal.restriction_type === 'account_suspension') {
          await conn.execute("UPDATE users SET status = 'active' WHERE id = ?", [appeal.user_id]);
        } else if (appeal.target_type === 'listing') {
          await conn.execute("UPDATE listings SET status = 'published' WHERE id = ?", [appeal.target_id]);
        }
      }

      // Record in decision history
      const histId = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO restriction_decisions_history 
          (id, restriction_id, action, actor_user_id, notes)
         VALUES (?, ?, 'appeal_reviewed', ?, ?)`,
        [histId, appeal.restriction_id, reviewerId, `Appeal decision: ${decision}. Notes: ${decisionNotes}`]
      );

      // Notify appellant
      createNotification({
        userId: appeal.appellant_user_id,
        actorUserId: reviewerId,
        notificationType: 'appeal_decision',
        title: `Appeal Decision: ${decision.toUpperCase()}`,
        message: decisionNotes,
        targetType: 'restriction_appeal',
        targetId: id,
      }).catch(() => {});
    });

    await logAuditEvent({
      actorId: reviewerId,
      actorRole: req.user.role,
      action: `appeal.${decision}`,
      entityType: 'restriction_appeal',
      entityId: id,
      details: { decision, decisionNotes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: `Appeal decision recorded: ${decision}.`,
      id,
      decision,
    });
  } catch (err) {
    console.error('[REVIEW_APPEAL_ERROR]', err);
    if (err.message && err.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record appeal decision.' },
    });
  }
}
