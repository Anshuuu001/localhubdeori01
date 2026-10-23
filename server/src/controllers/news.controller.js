import crypto from 'crypto';
import { getPool, executeQuery } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { rateLimiter } from '../services/rateLimiter.service.js';

const VALID_NEWS_CATEGORIES = [
  'civic',
  'agriculture',
  'infrastructure',
  'weather',
  'education',
  'health',
  'sports',
  'community',
  'business',
  'other',
];

/**
 * GET /api/news
 * Public list of published grassroots news reports.
 */
export async function listNews(req, res) {
  try {
    const {
      category,
      areaId,
      search = '',
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ["n.status = 'published'"];
    const params = [];

    if (category && category !== 'All' && VALID_NEWS_CATEGORIES.includes(category)) {
      conditions.push('n.category = ?');
      params.push(category);
    }

    if (areaId && areaId !== 'all') {
      conditions.push('n.area_id = ?');
      params.push(areaId);
    }

    if (search && search.trim()) {
      conditions.push('(LOWER(n.headline) LIKE ? OR LOWER(n.summary) LIKE ? OR LOWER(n.source_name) LIKE ?)');
      const pattern = `%${search.trim().toLowerCase()}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count
    const [countRows] = await executeQuery(
      `SELECT COUNT(*) AS total_count FROM news_articles n ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total_count || 0);

    // Items
    const [rows] = await executeQuery(
      `SELECT 
        n.id,
        n.headline,
        n.summary,
        n.category,
        n.relevant_date,
        n.published_at,
        n.area_id,
        n.source_name,
        n.source_url,
        n.created_at,
        a.name AS area_name,
        a.marathi_name AS area_marathi_name
       FROM news_articles n
       LEFT JOIN taluka_areas a ON n.area_id = a.id
       ${whereClause}
       ORDER BY n.published_at DESC, n.relevant_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return res.json({
      news: rows.map(r => ({
        id: r.id,
        headline: r.headline,
        summary: r.summary,
        category: r.category,
        relevantDate: r.relevant_date,
        publishedAt: r.published_at,
        areaId: r.area_id,
        areaName: r.area_name,
        areaMarathiName: r.area_marathi_name,
        sourceName: r.source_name,
        sourceUrl: r.source_url,
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
    console.error('[LIST_NEWS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve news feed.' },
    });
  }
}

/**
 * GET /api/news/:id
 * Single news article detail with full content.
 */
export async function getNewsById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    const [rows] = await executeQuery(
      `SELECT 
        n.*,
        a.name AS area_name,
        a.marathi_name AS area_marathi_name,
        u.full_name AS submitter_name
       FROM news_articles n
       LEFT JOIN taluka_areas a ON n.area_id = a.id
       LEFT JOIN users u ON n.submitted_by_user_id = u.id
       WHERE n.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NEWS_NOT_FOUND', message: 'News report not found.' },
      });
    }

    const item = rows[0];

    // Privacy gating: non-published news only visible to submitter or editorial staff
    if (item.status !== 'published') {
      const isSubmitter = userId && item.submitted_by_user_id === userId;
      const isStaff = userRole === 'editor' || userRole === 'admin';
      if (!isSubmitter && !isStaff) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'This news report is pending editorial review.' },
        });
      }
    }

    return res.json({
      article: {
        id: item.id,
        headline: item.headline,
        summary: item.summary,
        content: item.content,
        category: item.category,
        relevantDate: item.relevant_date,
        publishedAt: item.published_at,
        areaId: item.area_id,
        areaName: item.area_name,
        areaMarathiName: item.area_marathi_name,
        sourceName: item.source_name,
        sourceUrl: item.source_url,
        evidenceUrl: item.evidence_url,
        status: item.status,
        rejectionReason: item.submitted_by_user_id === userId ? item.rejection_reason : null,
        submitterName: userRole === 'editor' || userRole === 'admin' ? item.submitter_name : null,
        isSubmitter: Boolean(userId && item.submitted_by_user_id === userId),
        createdAt: item.created_at,
        editorialNotice: 'Fact-checked local news report. Does not represent official government endorsement.',
      },
    });
  } catch (err) {
    console.error('[GET_NEWS_BY_ID_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve news report.' },
    });
  }
}

/**
 * POST /api/news
 * Submit a grassroots news report for review.
 */
export async function submitNews(req, res) {
  try {
    const userId = req.user.id;
    const {
      headline,
      summary,
      content,
      category,
      relevantDate,
      areaId,
      sourceName,
      sourceUrl,
      evidenceUrl,
    } = req.body;

    const rateCheck = rateLimiter.consume('news_submit', userId, 10, 60);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many submissions. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
        },
      });
    }

    if (!headline || headline.trim().length < 5 || headline.trim().length > 255) {
      return res.status(400).json({
        error: { code: 'INVALID_HEADLINE', message: 'Headline must be between 5 and 255 characters.' },
      });
    }

    if (!summary || summary.trim().length < 10 || summary.trim().length > 1000) {
      return res.status(400).json({
        error: { code: 'INVALID_SUMMARY', message: 'Summary must be between 10 and 1000 characters.' },
      });
    }

    if (!content || content.trim().length < 20) {
      return res.status(400).json({
        error: { code: 'INVALID_CONTENT', message: 'News article body must be at least 20 characters.' },
      });
    }

    if (!category || !VALID_NEWS_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: { code: 'INVALID_CATEGORY', message: 'Please select a valid news category.' },
      });
    }

    if (!relevantDate) {
      return res.status(400).json({
        error: { code: 'DATE_REQUIRED', message: 'Relevant date of the news event is required.' },
      });
    }

    if (!sourceName || sourceName.trim().length < 2) {
      return res.status(400).json({
        error: { code: 'SOURCE_REQUIRED', message: 'Please provide the source name or attribution.' },
      });
    }

    // Duplicate detection: check if same headline already submitted for this date and area
    const [existing] = await executeQuery(
      `SELECT id, status FROM news_articles 
       WHERE LOWER(headline) = LOWER(?) AND relevant_date = ? AND status IN ('pending_review', 'published')`,
      [headline.trim(), relevantDate]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: {
          code: 'SIMILAR_SUBMISSION_EXISTS',
          message: 'A news report with this exact headline and date is already submitted or published.',
        },
      });
    }

    const newsId = crypto.randomUUID();

    await executeQuery(
      `INSERT INTO news_articles (
        id, headline, summary, content, category,
        relevant_date, area_id, source_name, source_url, evidence_url,
        submitted_by_user_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', NOW(), NOW())`,
      [
        newsId,
        headline.trim(),
        summary.trim(),
        content.trim(),
        category,
        relevantDate,
        areaId || null,
        sourceName.trim(),
        sourceUrl ? sourceUrl.trim() : null,
        evidenceUrl ? evidenceUrl.trim() : null,
        userId,
      ]
    );

    await logAuditEvent({
      actorId: userId,
      action: 'news.submitted',
      entityType: 'news_article',
      entityId: newsId,
      details: { headline, category, relevantDate },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      success: true,
      message: 'News report submitted for editorial review. Fact-checking will be performed before publication.',
      news: {
        id: newsId,
        headline: headline.trim(),
        status: 'pending_review',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[SUBMIT_NEWS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit news report.' },
    });
  }
}

/**
 * POST /api/news/:id/corrections
 * Request correction or report inaccurate information in a news article.
 */
export async function submitNewsCorrection(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const { reason, suggestedCorrection, evidenceUrl } = req.body;

    const [newsRows] = await executeQuery('SELECT id, status FROM news_articles WHERE id = ?', [id]);
    if (newsRows.length === 0) {
      return res.status(404).json({
        error: { code: 'NEWS_NOT_FOUND', message: 'News report not found.' },
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: { code: 'REASON_REQUIRED', message: 'Please specify the correction reason.' },
      });
    }

    if (!suggestedCorrection || suggestedCorrection.trim().length < 5) {
      return res.status(400).json({
        error: { code: 'CORRECTION_DETAILS_REQUIRED', message: 'Please provide at least 5 characters detailing the accurate fact or correction.' },
      });
    }

    const corrId = crypto.randomUUID();

    await executeQuery(
      `INSERT INTO news_corrections (
        id, news_id, user_id, reason, suggested_correction, evidence_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        corrId,
        id,
        userId,
        reason.trim(),
        suggestedCorrection.trim(),
        evidenceUrl ? evidenceUrl.trim() : null,
      ]
    );

    await logAuditEvent({
      actorId: userId || 'anonymous',
      action: 'news.correction_requested',
      entityType: 'news_article',
      entityId: id,
      details: { corrId, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      success: true,
      message: 'Correction request submitted. Our editorial desk will investigate the evidence.',
      correctionId: corrId,
      status: 'pending',
    });
  } catch (err) {
    console.error('[SUBMIT_NEWS_CORRECTION_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit correction request.' },
    });
  }
}

/**
 * GET /api/news/moderation/pending
 * List pending news submissions. Requires editor/admin role.
 */
export async function listPendingNews(req, res) {
  try {
    const [rows] = await executeQuery(
      `SELECT 
        n.*,
        u.full_name AS submitter_name,
        u.email AS submitter_email,
        a.name AS area_name
       FROM news_articles n
       JOIN users u ON n.submitted_by_user_id = u.id
       LEFT JOIN taluka_areas a ON n.area_id = a.id
       WHERE n.status = 'pending_review'
       ORDER BY n.created_at ASC`
    );

    return res.json({
      pendingNews: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error('[LIST_PENDING_NEWS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve moderation queue.' },
    });
  }
}

/**
 * POST /api/news/moderation/review/:id
 * Review news submission: published or rejected. Requires editor/admin role.
 */
export async function reviewNews(req, res) {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { decision, notes, rejectionReason } = req.body;

    if (!decision || !['published', 'rejected'].includes(decision)) {
      return res.status(400).json({
        error: { code: 'INVALID_DECISION', message: 'Decision must be "published" or "rejected".' },
      });
    }

    const [rows] = await executeQuery('SELECT * FROM news_articles WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NEWS_NOT_FOUND', message: 'News report not found.' },
      });
    }

    const item = rows[0];

    await executeQuery(
      `UPDATE news_articles 
       SET status = ?,
           published_at = CASE WHEN ? = 'published' THEN NOW() ELSE published_at END,
           moderation_notes = ?,
           rejection_reason = ?,
           reviewed_by_user_id = ?,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [decision, decision, notes || null, decision === 'rejected' ? (rejectionReason || 'Does not meet civic news standards') : null, reviewerId, id]
    );

    await logAuditEvent({
      actorId: reviewerId,
      action: `news.${decision}`,
      entityType: 'news_article',
      entityId: id,
      details: { decision, notes, rejectionReason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await createNotification(conn, {
        userId: item.submitted_by_user_id,
        actorUserId: reviewerId,
        notificationType: `news_${decision}`,
        title: decision === 'published' ? 'News Report Published' : 'News Review Update',
        message: decision === 'published'
          ? `Your news report "${item.headline}" is now live on the Taluka News Feed.`
          : `Your news submission was not published: ${rejectionReason || 'Editorial requirement'}`,
        targetType: 'news_article',
        targetId: id,
      });
    } catch (e) {
      // Non-fatal
    } finally {
      conn.release();
    }

    return res.json({
      success: true,
      message: `News report status updated to ${decision}.`,
      status: decision,
    });
  } catch (err) {
    console.error('[REVIEW_NEWS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record review.' },
    });
  }
}

/**
 * GET /api/news/corrections/queue
 * List correction requests awaiting editorial review. Requires editor/admin role.
 */
export async function listNewsCorrections(req, res) {
  try {
    const [rows] = await executeQuery(
      `SELECT 
        c.*,
        n.headline,
        u.full_name AS reporter_name
       FROM news_corrections c
       JOIN news_articles n ON c.news_id = n.id
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.status IN ('pending', 'under_review')
       ORDER BY c.created_at ASC`
    );

    return res.json({
      corrections: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error('[LIST_CORRECTIONS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve corrections queue.' },
    });
  }
}

/**
 * POST /api/news/corrections/:id/review
 * Review correction request. Requires editor/admin role.
 */
export async function reviewNewsCorrection(req, res) {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { decision, notes } = req.body; // 'applied' | 'dismissed'

    if (!decision || !['applied', 'dismissed'].includes(decision)) {
      return res.status(400).json({
        error: { code: 'INVALID_DECISION', message: 'Decision must be "applied" or "dismissed".' },
      });
    }

    const [rows] = await executeQuery('SELECT * FROM news_corrections WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Correction request not found.' },
      });
    }

    await executeQuery(
      `UPDATE news_corrections 
       SET status = ?, admin_notes = ?, reviewed_by_user_id = ?, reviewed_at = NOW() 
       WHERE id = ?`,
      [decision, notes || null, reviewerId, id]
    );

    await logAuditEvent({
      actorId: reviewerId,
      action: `news_correction.${decision}`,
      entityType: 'news_correction',
      entityId: id,
      details: { decision, notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      success: true,
      message: `Correction request marked as ${decision}.`,
      status: decision,
    });
  } catch (err) {
    console.error('[REVIEW_CORRECTION_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record correction review.' },
    });
  }
}
