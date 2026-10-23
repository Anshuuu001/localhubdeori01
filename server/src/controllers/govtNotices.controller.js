import crypto from 'crypto';
import { getPool, executeQuery } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { rateLimiter } from '../services/rateLimiter.service.js';

const VALID_AUTHORITIES = [
  'Tahsil Office Deori',
  'Panchayat Samiti Deori',
  'Deori Nagar Panchayat',
  'Gondia District Collectorate',
  'MSEDCL Deori Sub-Division',
  'Rural Hospital Deori',
  'Sub-Divisional Police Officer (SDPO) Deori',
  'Forest Department Gondia Division',
  'Agricultural Department (Krishi Vibhag)',
  'Gram Panchayat Office',
  'Other Official Department',
];

/**
 * GET /api/notices
 * Public list of published official government notices.
 */
export async function listGovtNotices(req, res) {
  try {
    const {
      authority,
      areaId,
      statusFilter = 'active', // 'active' (deadline not passed or no deadline) | 'expired' | 'all'
      search = '',
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ["n.status = 'published'"];
    const params = [];

    if (authority && authority !== 'All') {
      conditions.push('n.issuing_authority = ?');
      params.push(authority);
    }

    if (areaId && areaId !== 'all') {
      conditions.push('n.area_id = ?');
      params.push(areaId);
    }

    if (statusFilter === 'active') {
      conditions.push('(n.deadline_date IS NULL OR n.deadline_date >= CURRENT_DATE())');
    } else if (statusFilter === 'expired') {
      conditions.push('n.deadline_date < CURRENT_DATE()');
    }

    if (search && search.trim()) {
      conditions.push('(LOWER(n.notice_title) LIKE ? OR LOWER(n.summary) LIKE ? OR LOWER(n.issuing_authority) LIKE ?)');
      const pattern = `%${search.trim().toLowerCase()}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await executeQuery(
      `SELECT COUNT(*) AS total_count FROM govt_notices n ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total_count || 0);

    const [rows] = await executeQuery(
      `SELECT 
        n.id,
        n.issuing_authority,
        n.notice_title,
        n.summary,
        n.issue_date,
        n.deadline_date,
        n.area_id,
        n.official_source_url,
        n.document_url,
        n.is_official_verified,
        n.verified_at,
        n.status,
        n.created_at,
        a.name AS area_name,
        a.marathi_name AS area_marathi_name
       FROM govt_notices n
       LEFT JOIN taluka_areas a ON n.area_id = a.id
       ${whereClause}
       ORDER BY n.issue_date DESC, n.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return res.json({
      notices: rows.map(r => ({
        id: r.id,
        issuingAuthority: r.issuing_authority,
        noticeTitle: r.notice_title,
        summary: r.summary,
        issueDate: r.issue_date,
        deadlineDate: r.deadline_date,
        isDeadlinePassed: r.deadline_date ? new Date(r.deadline_date) < new Date(new Date().toDateString()) : false,
        areaId: r.area_id,
        areaName: r.area_name,
        areaMarathiName: r.area_marathi_name,
        officialSourceUrl: r.official_source_url,
        documentUrl: r.document_url,
        isOfficialVerified: Boolean(r.is_official_verified),
        verifiedAt: r.verified_at,
        status: r.status,
        createdAt: r.created_at,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[LIST_GOVT_NOTICES_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve government notices.' },
    });
  }
}

/**
 * GET /api/notices/:id
 * Notice detail view with verification info.
 */
export async function getGovtNoticeById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    const [rows] = await executeQuery(
      `SELECT 
        n.*,
        a.name AS area_name,
        a.marathi_name AS area_marathi_name,
        u.full_name AS verified_by_name
       FROM govt_notices n
       LEFT JOIN taluka_areas a ON n.area_id = a.id
       LEFT JOIN users u ON n.verified_by_user_id = u.id
       WHERE n.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOTICE_NOT_FOUND', message: 'Government notice not found.' },
      });
    }

    const n = rows[0];

    // Privacy gating: non-published notices visible only to submitter or editorial staff
    if (n.status !== 'published') {
      const isSubmitter = userId && n.created_by_user_id === userId;
      const isStaff = userRole === 'editor' || userRole === 'admin';
      if (!isSubmitter && !isStaff) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'This notice is pending administrative verification.' },
        });
      }
    }

    return res.json({
      notice: {
        id: n.id,
        issuingAuthority: n.issuing_authority,
        noticeTitle: n.notice_title,
        summary: n.summary,
        content: n.content,
        issueDate: n.issue_date,
        deadlineDate: n.deadline_date,
        isDeadlinePassed: n.deadline_date ? new Date(n.deadline_date) < new Date(new Date().toDateString()) : false,
        areaId: n.area_id,
        areaName: n.area_name,
        areaMarathiName: n.area_marathi_name,
        officialSourceUrl: n.official_source_url,
        documentUrl: n.document_url,
        isOfficialVerified: Boolean(n.is_official_verified),
        verificationSourceNotes: n.verification_source_notes,
        verifiedByName: n.verified_by_name || 'Authorized Editor',
        verifiedAt: n.verified_at,
        status: n.status,
        isSubmitter: Boolean(userId && n.created_by_user_id === userId),
        createdAt: n.created_at,
        authenticityNotice: 'Official source verified against gazette or issuing departmental portal. Not an advertisement.',
      },
    });
  } catch (err) {
    console.error('[GET_NOTICE_BY_ID_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve notice details.' },
    });
  }
}

/**
 * POST /api/notices
 * Submit an official notice for administrative verification.
 */
export async function submitGovtNotice(req, res) {
  try {
    const userId = req.user.id;
    const {
      issuingAuthority,
      noticeTitle,
      summary,
      content,
      issueDate,
      deadlineDate,
      areaId,
      officialSourceUrl,
      documentUrl,
    } = req.body;

    const rateCheck = rateLimiter.consume('notice_submit', userId, 10, 60);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many submissions. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
        },
      });
    }

    if (!issuingAuthority || issuingAuthority.trim().length < 3) {
      return res.status(400).json({
        error: { code: 'AUTHORITY_REQUIRED', message: 'Issuing government authority or department is required.' },
      });
    }

    if (!noticeTitle || noticeTitle.trim().length < 5 || noticeTitle.trim().length > 255) {
      return res.status(400).json({
        error: { code: 'INVALID_TITLE', message: 'Notice title must be between 5 and 255 characters.' },
      });
    }

    if (!summary || summary.trim().length < 10) {
      return res.status(400).json({
        error: { code: 'SUMMARY_REQUIRED', message: 'Notice summary must be at least 10 characters.' },
      });
    }

    if (!issueDate) {
      return res.status(400).json({
        error: { code: 'ISSUE_DATE_REQUIRED', message: 'Official issue date is required.' },
      });
    }

    if (deadlineDate && issueDate && new Date(deadlineDate) < new Date(issueDate)) {
      return res.status(400).json({
        error: { code: 'INVALID_DEADLINE', message: 'Application or response deadline cannot be earlier than issue date.' },
      });
    }

    const noticeId = crypto.randomUUID();

    await executeQuery(
      `INSERT INTO govt_notices (
        id, issuing_authority, notice_title, summary, content,
        issue_date, deadline_date, area_id, official_source_url, document_url,
        is_official_verified, status, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 'pending_review', ?, NOW(), NOW())`,
      [
        noticeId,
        issuingAuthority.trim(),
        noticeTitle.trim(),
        summary.trim(),
        content ? content.trim() : null,
        issueDate,
        deadlineDate || null,
        areaId || null,
        officialSourceUrl ? officialSourceUrl.trim() : null,
        documentUrl ? documentUrl.trim() : null,
        userId,
      ]
    );

    await logAuditEvent({
      actorId: userId,
      action: 'notice.submitted',
      entityType: 'govt_notice',
      entityId: noticeId,
      details: { issuingAuthority, noticeTitle, issueDate },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      success: true,
      message: 'Government notice submitted for verification against official gazette or portal.',
      notice: {
        id: noticeId,
        noticeTitle: noticeTitle.trim(),
        status: 'pending_review',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[SUBMIT_GOVT_NOTICE_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit government notice.' },
    });
  }
}

/**
 * GET /api/notices/moderation/pending
 * List notices awaiting official verification. Requires editor/admin role.
 */
export async function listPendingGovtNotices(req, res) {
  try {
    const [rows] = await executeQuery(
      `SELECT 
        n.*,
        u.full_name AS submitter_name,
        u.email AS submitter_email,
        a.name AS area_name
       FROM govt_notices n
       JOIN users u ON n.created_by_user_id = u.id
       LEFT JOIN taluka_areas a ON n.area_id = a.id
       WHERE n.status = 'pending_review'
       ORDER BY n.created_at ASC`
    );

    return res.json({
      pendingNotices: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error('[LIST_PENDING_NOTICES_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve moderation queue.' },
    });
  }
}

/**
 * POST /api/notices/moderation/verify/:id
 * Verify notice against authoritative source and publish or reject. Requires editor/admin role.
 */
export async function verifyAndPublishNotice(req, res) {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { decision, verificationSourceNotes, notes } = req.body; // 'published' | 'rejected'

    if (!decision || !['published', 'rejected'].includes(decision)) {
      return res.status(400).json({
        error: { code: 'INVALID_DECISION', message: 'Decision must be "published" or "rejected".' },
      });
    }

    if (decision === 'published' && (!verificationSourceNotes || verificationSourceNotes.trim().length < 5)) {
      return res.status(400).json({
        error: {
          code: 'VERIFICATION_SOURCE_REQUIRED',
          message: 'Authoritative source proof or official circular reference is required to verify an official notice.',
        },
      });
    }

    const [rows] = await executeQuery('SELECT * FROM govt_notices WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOTICE_NOT_FOUND', message: 'Government notice not found.' },
      });
    }

    const notice = rows[0];

    const isVerified = decision === 'published';

    await executeQuery(
      `UPDATE govt_notices 
       SET status = ?,
           is_official_verified = ?,
           verification_source_notes = ?,
           verified_by_user_id = ?,
           verified_at = NOW(),
           moderation_notes = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [decision, isVerified, verificationSourceNotes ? verificationSourceNotes.trim() : null, reviewerId, notes || null, id]
    );

    await logAuditEvent({
      actorId: reviewerId,
      action: `notice.${decision}`,
      entityType: 'govt_notice',
      entityId: id,
      details: { decision, verificationSourceNotes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await createNotification(conn, {
        userId: notice.created_by_user_id,
        actorUserId: reviewerId,
        notificationType: `notice_${decision}`,
        title: decision === 'published' ? 'Government Notice Verified & Published' : 'Notice Verification Update',
        message: decision === 'published'
          ? `The official notice "${notice.notice_title}" has been verified and published.`
          : `The notice "${notice.notice_title}" could not be verified against authoritative records.`,
        targetType: 'govt_notice',
        targetId: id,
      });
    } catch (e) {
      // Non-fatal
    } finally {
      conn.release();
    }

    return res.json({
      success: true,
      message: `Notice status updated to ${decision}. Official verification status: ${isVerified}.`,
      status: decision,
      isOfficialVerified: isVerified,
    });
  } catch (err) {
    console.error('[VERIFY_NOTICE_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to verify government notice.' },
    });
  }
}
