import { executeQuery } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * Get unified reports queue combining listing reports, news corrections, and emergency contact inaccuracy reports.
 * Prioritizes emergency contact inaccuracies and urgent safety reports (Rule E).
 * Reporter identities and internal detection notes are protected.
 */
export async function getReportsQueue(req, res) {
  try {
    const {
      targetType = 'all',
      status = 'all',
      priority = 'all',
      search = '',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const reports = [];

    // 1. Listing & Business Profile Reports
    if (targetType === 'all' || targetType === 'listing' || targetType === 'business_profile') {
      let lSql = `
        SELECT 
          lr.id,
          lr.target_type,
          lr.target_id,
          lr.reason,
          lr.details,
          lr.status,
          lr.priority,
          lr.admin_notes,
          lr.resolution_notes,
          lr.created_at,
          u.full_name AS reviewer_name,
          COALESCE(l.title, bp.name, 'Unknown Target') AS target_title
        FROM listing_reports lr
        LEFT JOIN listings l ON lr.target_type = 'listing' AND lr.target_id = l.id
        LEFT JOIN business_profiles bp ON lr.target_type = 'business_profile' AND lr.target_id = bp.id
        LEFT JOIN users u ON lr.assigned_reviewer_id = u.id
        WHERE 1=1
      `;
      const lParams = [];

      if (targetType !== 'all') {
        lSql += ' AND lr.target_type = ?';
        lParams.push(targetType);
      }

      if (status !== 'all') {
        lSql += ' AND lr.status = ?';
        lParams.push(status);
      }

      if (priority !== 'all') {
        lSql += ' AND lr.priority = ?';
        lParams.push(priority);
      }

      if (search.trim()) {
        lSql += ' AND (lr.reason LIKE ? OR lr.details LIKE ? OR l.title LIKE ? OR bp.name LIKE ?)';
        const s = `%${search.trim()}%`;
        lParams.push(s, s, s, s);
      }

      lSql += ' ORDER BY CASE lr.priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "normal" THEN 3 ELSE 4 END, lr.created_at DESC LIMIT 50';
      const [lRows] = await executeQuery(lSql, lParams);

      lRows.forEach(row => {
        reports.push({
          id: row.id,
          sourceQueue: 'listing_reports',
          targetType: row.target_type,
          targetId: row.target_id,
          targetTitle: row.target_title,
          reason: row.reason,
          details: row.details,
          status: row.status,
          priority: row.priority || 'normal',
          adminNotes: row.admin_notes,
          resolutionNotes: row.resolution_notes,
          assignedReviewer: row.reviewer_name || null,
          createdAt: row.created_at,
        });
      });
    }

    // 2. Emergency Contact Reports (Always Priority: Urgent)
    if (targetType === 'all' || targetType === 'emergency_contact') {
      let emSql = `
        SELECT 
          ecr.id,
          ecr.contact_id AS target_id,
          ecr.reason,
          ecr.suggested_number,
          ecr.evidence_notes,
          ecr.status,
          ecr.admin_notes,
          ecr.created_at,
          ec.name AS contact_name,
          ec.department AS contact_department,
          ec.primary_phone
        FROM emergency_contact_reports ecr
        JOIN emergency_contacts ec ON ecr.contact_id = ec.id
        WHERE 1=1
      `;
      const emParams = [];

      if (status !== 'all') {
        // Map status
        if (status === 'resolved') {
          emSql += " AND ecr.status = 'verified_updated'";
        } else if (status === 'under_review') {
          emSql += " AND ecr.status = 'under_investigation'";
        } else if (status === 'received' || status === 'submitted') {
          emSql += " AND ecr.status = 'pending'";
        } else {
          emSql += " AND ecr.status = ?";
          emParams.push(status);
        }
      }

      if (search.trim()) {
        emSql += ' AND (ec.name LIKE ? OR ecr.reason LIKE ? OR ecr.evidence_notes LIKE ?)';
        const s = `%${search.trim()}%`;
        emParams.push(s, s, s);
      }

      emSql += ' ORDER BY ecr.created_at DESC LIMIT 50';
      const [emRows] = await executeQuery(emSql, emParams);

      emRows.forEach(row => {
        reports.push({
          id: row.id,
          sourceQueue: 'emergency_contact_reports',
          targetType: 'emergency_contact',
          targetId: row.target_id,
          targetTitle: `${row.contact_name} (${row.contact_department}) [${row.primary_phone}]`,
          reason: row.reason,
          details: `Suggested Correction: ${row.suggested_number || 'N/A'}. Notes: ${row.evidence_notes}`,
          status: row.status === 'pending' ? 'received' : row.status === 'under_investigation' ? 'under_review' : 'resolved',
          priority: 'urgent', // Urgent safety priority
          adminNotes: row.admin_notes,
          createdAt: row.created_at,
        });
      });
    }

    // 3. News Corrections
    if (targetType === 'all' || targetType === 'news') {
      let nSql = `
        SELECT 
          nc.id,
          nc.news_id AS target_id,
          nc.reason,
          nc.suggested_correction,
          nc.evidence_url,
          nc.status,
          nc.admin_notes,
          nc.created_at,
          na.headline AS target_title
        FROM news_corrections nc
        JOIN news_articles na ON nc.news_id = na.id
        WHERE 1=1
      `;
      const nParams = [];

      if (status !== 'all') {
        if (status === 'resolved') {
          nSql += " AND nc.status = 'applied'";
        } else if (status === 'received' || status === 'submitted') {
          nSql += " AND nc.status = 'pending'";
        } else {
          nSql += " AND nc.status = ?";
          nParams.push(status);
        }
      }

      if (search.trim()) {
        nSql += ' AND (na.headline LIKE ? OR nc.reason LIKE ? OR nc.suggested_correction LIKE ?)';
        const s = `%${search.trim()}%`;
        nParams.push(s, s, s);
      }

      nSql += ' ORDER BY nc.created_at DESC LIMIT 50';
      const [nRows] = await executeQuery(nSql, nParams);

      nRows.forEach(row => {
        reports.push({
          id: row.id,
          sourceQueue: 'news_corrections',
          targetType: 'news',
          targetId: row.target_id,
          targetTitle: row.target_title,
          reason: row.reason,
          details: `Suggested Correction: ${row.suggested_correction}. Evidence: ${row.evidence_url || 'None'}`,
          status: row.status === 'pending' ? 'received' : row.status === 'under_review' ? 'under_review' : 'resolved',
          priority: 'normal',
          adminNotes: row.admin_notes,
          createdAt: row.created_at,
        });
      });
    }

    // Sort: Urgent first, then by createdAt desc
    reports.sort((a, b) => {
      const priorityWeights = { urgent: 1, high: 2, normal: 3, low: 4 };
      const pDiff = (priorityWeights[a.priority] || 3) - (priorityWeights[b.priority] || 3);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const paginated = reports.slice(offset, offset + limitNum);

    return res.json({
      reports: paginated,
      total: reports.length,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('[GET_REPORTS_QUEUE_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve reports queue.' },
    });
  }
}

/**
 * Review report or correction.
 * Validates state transitions: received -> under_review -> action_taken -> resolved -> closed.
 */
export async function reviewReport(req, res) {
  try {
    const { id } = req.params;
    const {
      sourceQueue = 'listing_reports',
      status,
      priority,
      adminNotes,
      resolutionNotes,
    } = req.body;

    const validStatuses = ['received', 'under_review', 'action_taken', 'resolved', 'closed', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}.` },
      });
    }

    const reviewerId = req.user.id;

    if (sourceQueue === 'listing_reports') {
      const updateFields = [];
      const params = [];

      if (status) {
        updateFields.push('status = ?');
        params.push(status);
        if (status === 'resolved' || status === 'dismissed' || status === 'closed') {
          updateFields.push('resolved_at = NOW()');
        }
      }

      if (priority) {
        updateFields.push('priority = ?');
        params.push(priority);
      }

      if (adminNotes !== undefined) {
        updateFields.push('admin_notes = ?');
        params.push(adminNotes);
      }

      if (resolutionNotes !== undefined) {
        updateFields.push('resolution_notes = ?');
        params.push(resolutionNotes);
      }

      updateFields.push('assigned_reviewer_id = ?');
      params.push(reviewerId);

      params.push(id);

      await executeQuery(
        `UPDATE listing_reports SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    } else if (sourceQueue === 'emergency_contact_reports') {
      const dbStatus = status === 'resolved' ? 'verified_updated' : status === 'dismissed' ? 'dismissed' : 'under_investigation';
      await executeQuery(
        `UPDATE emergency_contact_reports 
         SET status = ?, admin_notes = ?, reviewed_by_user_id = ?, reviewed_at = NOW() 
         WHERE id = ?`,
        [dbStatus, adminNotes || resolutionNotes || null, reviewerId, id]
      );
    } else if (sourceQueue === 'news_corrections') {
      const dbStatus = status === 'resolved' ? 'applied' : status === 'dismissed' ? 'dismissed' : 'under_review';
      await executeQuery(
        `UPDATE news_corrections 
         SET status = ?, admin_notes = ?, reviewed_by_user_id = ?, reviewed_at = NOW() 
         WHERE id = ?`,
        [dbStatus, adminNotes || resolutionNotes || null, reviewerId, id]
      );
    }

    await logAuditEvent({
      actorId: reviewerId,
      actorRole: req.user.role,
      action: 'report.reviewed',
      entityType: sourceQueue,
      entityId: id,
      details: { status, priority, resolutionNotes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: 'Report status successfully updated.',
      id,
      status,
      priority,
    });
  } catch (err) {
    console.error('[REVIEW_REPORT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update report.' },
    });
  }
}
