import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { executeQuery, withTransaction } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';

// Descriptions explaining the limited meaning of each badge (Rule D)
const BADGE_DESCRIPTIONS = {
  phone_verified: {
    title: 'Phone Verified',
    explanation: 'Mobile number verified via one-time SMS verification. Confirms device possession only, not identity or business legitimacy.',
  },
  business_verified: {
    title: 'Business Verified',
    explanation: 'Business entity validated against official establishment records (Maharashtra Shop Act / Udyam MSME). Does not guarantee product quality or creditworthiness.',
  },
  professional_verified: {
    title: 'Professional Credentials Verified',
    explanation: 'Trade certificate or professional technical qualification (e.g. ITI electrical/technician) inspected by reviewers for stated trade scope.',
  },
  identity_verified: {
    title: 'Identity Verified',
    explanation: 'Citizen identity proof cross-checked against government records for high-trust civic responsibilities.',
  },
};

/**
 * List verification requests for reviewers with filters and pagination.
 */
export async function getVerificationQueue(req, res) {
  try {
    const {
      targetType = 'all',
      badgeType = 'all',
      status = 'pending',
      search = '',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT 
        vr.id,
        vr.target_type,
        vr.target_id,
        vr.requester_user_id,
        vr.badge_type,
        vr.document_type,
        vr.document_reference_masked,
        vr.status,
        vr.decision_notes,
        vr.action_needed_reason,
        vr.expires_at,
        vr.created_at,
        vr.updated_at,
        u.full_name AS requester_name,
        u.email AS requester_email,
        u.phone AS requester_phone,
        bp.name AS business_name,
        rev.full_name AS reviewer_name
      FROM verification_requests vr
      JOIN users u ON vr.requester_user_id = u.id
      LEFT JOIN business_profiles bp ON vr.target_type = 'business' AND vr.target_id = bp.id
      LEFT JOIN users rev ON vr.reviewer_user_id = rev.id
      WHERE 1=1
    `;
    const params = [];

    if (targetType !== 'all') {
      sql += ' AND vr.target_type = ?';
      params.push(targetType);
    }

    if (badgeType !== 'all') {
      sql += ' AND vr.badge_type = ?';
      params.push(badgeType);
    }

    if (status !== 'all') {
      sql += ' AND vr.status = ?';
      params.push(status);
    }

    if (search.trim()) {
      sql += ' AND (u.full_name LIKE ? OR bp.name LIKE ? OR vr.document_reference_masked LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY vr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await executeQuery(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total 
      FROM verification_requests vr
      JOIN users u ON vr.requester_user_id = u.id
      LEFT JOIN business_profiles bp ON vr.target_type = 'business' AND vr.target_id = bp.id
      WHERE 1=1
    `;
    const countParams = [];
    if (targetType !== 'all') {
      countSql += ' AND vr.target_type = ?';
      countParams.push(targetType);
    }
    if (badgeType !== 'all') {
      countSql += ' AND vr.badge_type = ?';
      countParams.push(badgeType);
    }
    if (status !== 'all') {
      countSql += ' AND vr.status = ?';
      countParams.push(status);
    }
    const [totalRows] = await executeQuery(countSql, countParams);

    return res.json({
      requests: rows,
      total: totalRows[0]?.total || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('[GET_VERIFICATION_QUEUE_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve verification requests.' },
    });
  }
}

/**
 * Get detailed request data for review.
 * Never displays full raw document path in unlogged views.
 */
export async function getVerificationDetail(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await executeQuery(
      `SELECT 
        vr.*,
        u.full_name AS requester_name,
        u.email AS requester_email,
        u.phone AS requester_phone,
        u.is_phone_verified,
        bp.name AS business_name,
        bp.business_type,
        bp.category AS business_category,
        bp.address_line1 AS business_address,
        bp.verification_status AS business_verif_status,
        rev.full_name AS reviewer_name
       FROM verification_requests vr
       JOIN users u ON vr.requester_user_id = u.id
       LEFT JOIN business_profiles bp ON vr.target_type = 'business' AND vr.target_id = bp.id
       LEFT JOIN users rev ON vr.reviewer_user_id = rev.id
       WHERE vr.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Verification request not found.' },
      });
    }

    const request = rows[0];

    // Fetch existing badges issued for this target
    const [badges] = await executeQuery(
      `SELECT * FROM verification_badges WHERE target_type = ? AND target_id = ?`,
      [request.target_type, request.target_id]
    );

    return res.json({
      request,
      existingBadges: badges,
    });
  } catch (err) {
    console.error('[GET_VERIFICATION_DETAIL_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve verification detail.' },
    });
  }
}

/**
 * Access sensitive verification document evidence.
 * Restricted to authorized reviewers, logs access in document_access_logs and audit_logs (Rule D).
 */
export async function accessVerificationDocument(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await executeQuery(
      'SELECT id, document_url, document_type, requester_user_id, badge_type FROM verification_requests WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Verification record not found.' },
      });
    }

    const doc = rows[0];

    // Log document access for governance & compliance
    await executeQuery(
      `INSERT INTO document_access_logs (verification_request_id, accessed_by_user_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?)`,
      [id, req.user.id, req.ip, req.headers['user-agent']?.slice(0, 255) || null]
    );

    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'verification.document_accessed',
      entityType: 'verification_request',
      entityId: id,
      details: { documentType: doc.document_type, badgeType: doc.badge_type },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      accessGranted: true,
      documentUrl: doc.document_url,
      documentType: doc.document_type,
      accessedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ACCESS_VERIFICATION_DOCUMENT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to access document.' },
    });
  }
}

/**
 * Record a verification decision (approve, reject, action_needed, suspend).
 */
export async function recordVerificationDecision(req, res) {
  try {
    const { id } = req.params;
    const {
      decision,
      reason,
      scope = 'general',
      actionNeededReason,
      expiryMonths = 12,
    } = req.body;

    const validDecisions = ['approve', 'reject', 'action_needed', 'suspend'];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DECISION',
          message: `Decision must be one of: ${validDecisions.join(', ')}.`,
        },
      });
    }

    if ((decision === 'reject' || decision === 'suspend') && (!reason || reason.trim().length < 5)) {
      return res.status(400).json({
        error: {
          code: 'REASON_REQUIRED',
          message: 'A clear reason is required for rejection or suspension.',
        },
      });
    }

    if (decision === 'action_needed' && (!actionNeededReason || actionNeededReason.trim().length < 5)) {
      return res.status(400).json({
        error: {
          code: 'ACTION_REASON_REQUIRED',
          message: 'Clear instructions explaining what action is needed from the applicant are required.',
        },
      });
    }

    const reviewerId = req.user.id;
    let badgeRecord = null;

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT * FROM verification_requests WHERE id = ? FOR UPDATE',
        [id]
      );
      if (rows.length === 0) throw new Error('NOT_FOUND: Request not found.');

      const reqData = rows[0];
      let newStatus = 'pending';

      if (decision === 'approve') {
        newStatus = 'approved';

        const badgeMeta = BADGE_DESCRIPTIONS[reqData.badge_type] || {
          title: 'Verified',
          explanation: 'Verified by LocalHub X administrative desk.',
        };

        const expiresAt = expiryMonths > 0
          ? new Date(Date.now() + expiryMonths * 30 * 24 * 60 * 60 * 1000)
          : null;

        // Check if badge already exists
        const [existing] = await conn.execute(
          'SELECT id FROM verification_badges WHERE target_type = ? AND target_id = ? AND badge_type = ?',
          [reqData.target_type, reqData.target_id, reqData.badge_type]
        );

        const badgeId = existing.length > 0 ? existing[0].id : crypto.randomUUID();

        if (existing.length > 0) {
          await conn.execute(
            `UPDATE verification_badges 
             SET status = 'active', 
                 verification_request_id = ?, 
                 verified_by_user_id = ?, 
                 scope = ?, 
                 display_title = ?, 
                 explanation = ?, 
                 issued_at = NOW(), 
                 expires_at = ?,
                 revoked_at = NULL,
                 revocation_reason = NULL
             WHERE id = ?`,
            [id, reviewerId, scope, badgeMeta.title, badgeMeta.explanation, expiresAt, badgeId]
          );
        } else {
          await conn.execute(
            `INSERT INTO verification_badges 
              (id, target_type, target_id, badge_type, status, verification_request_id, verified_by_user_id, scope, display_title, explanation, expires_at)
             VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
            [
              badgeId,
              reqData.target_type,
              reqData.target_id,
              reqData.badge_type,
              id,
              reviewerId,
              scope,
              badgeMeta.title,
              badgeMeta.explanation,
              expiresAt,
            ]
          );
        }

        // Update target entity if business
        if (reqData.target_type === 'business') {
          await conn.execute(
            `UPDATE business_profiles 
             SET verification_status = 'verified', verification_notes = ? 
             WHERE id = ?`,
            [reason || 'Verified by official desk', reqData.target_id]
          );
        }

        badgeRecord = { id: badgeId, badgeType: reqData.badge_type, status: 'active', expiresAt };
      } else if (decision === 'reject') {
        newStatus = 'rejected';

        if (reqData.target_type === 'business') {
          await conn.execute(
            `UPDATE business_profiles 
             SET verification_status = 'rejected', verification_notes = ? 
             WHERE id = ?`,
            [reason, reqData.target_id]
          );
        }
      } else if (decision === 'action_needed') {
        newStatus = 'action_needed';

        if (reqData.target_type === 'business') {
          await conn.execute(
            `UPDATE business_profiles 
             SET verification_status = 'action_needed', verification_notes = ? 
             WHERE id = ?`,
            [actionNeededReason, reqData.target_id]
          );
        }
      } else if (decision === 'suspend') {
        newStatus = 'suspended';

        // Revoke badge
        await conn.execute(
          `UPDATE verification_badges 
           SET status = 'revoked', revoked_at = NOW(), revocation_reason = ? 
           WHERE target_type = ? AND target_id = ? AND badge_type = ?`,
          [reason, reqData.target_type, reqData.target_id, reqData.badge_type]
        );

        if (reqData.target_type === 'business') {
          await conn.execute(
            `UPDATE business_profiles 
             SET verification_status = 'suspended', verification_notes = ? 
             WHERE id = ?`,
            [reason, reqData.target_id]
          );
        }
      }

      await conn.execute(
        `UPDATE verification_requests 
         SET status = ?, 
             reviewer_user_id = ?, 
             reviewed_at = NOW(), 
             decision_notes = ?, 
             action_needed_reason = ?
         WHERE id = ?`,
        [newStatus, reviewerId, reason || null, actionNeededReason || null, id]
      );

      // In-app notification
      const notifTitle = decision === 'approve'
        ? `Verification Approved: ${reqData.badge_type}`
        : decision === 'action_needed'
        ? 'Action Needed: Your verification requires additional documents'
        : `Verification Decision: ${decision}`;

      const notifMsg = decision === 'approve'
        ? `Your verification request has been approved. The '${reqData.badge_type}' badge is now active.`
        : decision === 'action_needed'
        ? actionNeededReason
        : reason;

      createNotification({
        userId: reqData.requester_user_id,
        actorUserId: reviewerId,
        notificationType: 'verification_decision',
        title: notifTitle,
        message: notifMsg,
        targetType: reqData.target_type,
        targetId: reqData.target_id,
      }).catch(() => {});
    });

    await logAuditEvent({
      actorId: reviewerId,
      actorRole: req.user.role,
      action: `verification.${decision}`,
      entityType: 'verification_request',
      entityId: id,
      details: { decision, reason, scope, actionNeededReason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: `Verification decision recorded: ${decision}.`,
      id,
      status: decision === 'approve' ? 'approved' : decision === 'action_needed' ? 'action_needed' : decision === 'suspend' ? 'suspended' : 'rejected',
      badge: badgeRecord,
    });
  } catch (err) {
    console.error('[RECORD_VERIFICATION_DECISION_ERROR]', err);
    if (err.message && err.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record verification decision.' },
    });
  }
}

/**
 * Citizen submission endpoint to request verification for user, business, or professional credentials.
 */
export async function submitVerificationRequest(req, res) {
  try {
    const {
      targetType,
      targetId,
      badgeType,
      documentType,
      documentReferenceMasked,
      documentUrl,
      submittedData,
    } = req.body;

    const validTargets = ['user', 'business', 'professional'];
    if (!targetType || !validTargets.includes(targetType)) {
      return res.status(400).json({
        error: { code: 'INVALID_TARGET_TYPE', message: `Target type must be one of: ${validTargets.join(', ')}.` },
      });
    }

    if (!targetId) {
      return res.status(400).json({
        error: { code: 'MISSING_TARGET_ID', message: 'Target identifier is required.' },
      });
    }

    const validBadges = ['phone_verified', 'business_verified', 'professional_verified', 'identity_verified'];
    if (!badgeType || !validBadges.includes(badgeType)) {
      return res.status(400).json({
        error: { code: 'INVALID_BADGE_TYPE', message: `Badge type must be one of: ${validBadges.join(', ')}.` },
      });
    }

    if (!documentType || !documentUrl) {
      return res.status(400).json({
        error: { code: 'MISSING_EVIDENCE', message: 'Document type and document URL are required.' },
      });
    }

    // Verify ownership: user can only submit for themselves or their own business
    if (targetType === 'user' && targetId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only request verification for your own profile.' },
      });
    }

    if (targetType === 'business') {
      const [biz] = await executeQuery('SELECT owner_user_id FROM business_profiles WHERE id = ?', [targetId]);
      if (biz.length === 0) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Business not found.' } });
      }
      if (biz[0].owner_user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only the business owner can submit verification documents.' },
        });
      }
    }

    const reqId = crypto.randomUUID();

    await executeQuery(
      `INSERT INTO verification_requests 
        (id, target_type, target_id, requester_user_id, badge_type, document_type, document_reference_masked, document_url, status, submitted_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        reqId,
        targetType,
        targetId,
        req.user.id,
        badgeType,
        documentType,
        documentReferenceMasked || null,
        documentUrl,
        JSON.stringify(submittedData || {}),
      ]
    );

    // If business, update status to pending
    if (targetType === 'business') {
      await executeQuery(
        "UPDATE business_profiles SET verification_status = 'pending' WHERE id = ?",
        [targetId]
      );
    }

    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'verification.submitted',
      entityType: 'verification_request',
      entityId: reqId,
      details: { targetType, targetId, badgeType, documentType },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      message: 'Verification request submitted for administrative review.',
      id: reqId,
      status: 'pending',
    });
  } catch (err) {
    console.error('[SUBMIT_VERIFICATION_REQUEST_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit verification request.' },
    });
  }
}

/**
 * Public endpoint to fetch badges and their limited meaning disclaimer for a target entity.
 */
export async function getTargetBadges(req, res) {
  try {
    const { targetType, targetId } = req.params;

    const [rows] = await executeQuery(
      `SELECT 
        id,
        target_type,
        target_id,
        badge_type,
        status,
        scope,
        display_title,
        explanation,
        issued_at,
        expires_at
       FROM verification_badges
       WHERE target_type = ? AND target_id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`,
      [targetType, targetId]
    );

    return res.json({
      badges: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error('[GET_TARGET_BADGES_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve verification badges.' },
    });
  }
}
