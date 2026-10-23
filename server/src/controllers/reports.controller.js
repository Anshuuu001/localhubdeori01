import crypto from 'crypto';
import { executeQuery } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * Submit a report or correction request for a listing or business profile.
 * Persists to listing_reports table.
 */
export async function submitReport(req, res) {
  try {
    const {
      targetType,
      targetId,
      reason,
      details,
      reporterName,
      reporterContact,
    } = req.body;

    if (!targetType || !['listing', 'business_profile'].includes(targetType)) {
      return res.status(400).json({
        error: { code: 'INVALID_TARGET_TYPE', message: 'Target type must be listing or business_profile.' },
      });
    }

    if (!targetId) {
      return res.status(400).json({
        error: { code: 'MISSING_TARGET_ID', message: 'Target identifier is required.' },
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: { code: 'MISSING_REASON', message: 'Report reason is required.' },
      });
    }

    if (!details || !details.trim() || details.trim().length < 5) {
      return res.status(400).json({
        error: { code: 'INVALID_DETAILS', message: 'Please provide at least 5 characters explaining the report or correction.' },
      });
    }

    // Verify target exists
    if (targetType === 'listing') {
      const [lRows] = await executeQuery('SELECT id FROM listings WHERE id = ?', [targetId]);
      if (lRows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Listing to report does not exist.' },
        });
      }
    } else {
      const [bRows] = await executeQuery('SELECT id FROM business_profiles WHERE id = ?', [targetId]);
      if (bRows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Business profile to report does not exist.' },
        });
      }
    }

    const reportId = crypto.randomUUID();
    const reporterUserId = req.user ? req.user.id : null;

    await executeQuery(
      `INSERT INTO listing_reports (
        id, target_type, target_id, reporter_user_id,
        reporter_name, reporter_contact, reason, details, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [
        reportId,
        targetType,
        targetId,
        reporterUserId,
        reporterName || (req.user ? req.user.fullName : 'Anonymous Citizen'),
        reporterContact || (req.user ? (req.user.phone || req.user.email) : null),
        reason.trim(),
        details.trim(),
      ]
    );

    await logAuditEvent({
      actorId: reporterUserId,
      action: 'report.submitted',
      entityType: targetType,
      entityId: targetId,
      details: { reportId, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      message: 'Report submitted successfully. LocalHub X moderation desk will investigate.',
      reportId,
      status: 'submitted',
    });
  } catch (err) {
    console.error('[SUBMIT_REPORT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit report.' },
    });
  }
}

/**
 * List pending listings requiring moderation review.
 */
export async function listPendingModeration(req, res) {
  try {
    const [rows] = await executeQuery(
      `SELECT 
        l.id,
        l.module,
        l.provider_type,
        l.business_profile_id,
        l.title,
        l.category,
        l.description,
        l.price,
        l.price_period,
        l.status,
        l.created_at,
        bp.name AS business_name,
        bp.verification_status AS business_verification_status,
        u.full_name AS provider_name,
        u.email AS provider_email,
        u.phone AS provider_phone
       FROM listings l
       LEFT JOIN business_profiles bp ON l.business_profile_id = bp.id
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.status = 'pending_review'
       ORDER BY l.created_at ASC`
    );

    return res.json({
      pendingListings: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error('[LIST_PENDING_MODERATION_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve moderation queue.' },
    });
  }
}

/**
 * Admin / Moderation Review Action on a Listing
 * Changes status to 'published' or 'rejected' with moderation notes.
 */
export async function reviewListing(req, res) {
  try {
    const { listingId } = req.params;
    const { decision, notes } = req.body;

    if (!decision || !['published', 'rejected'].includes(decision)) {
      return res.status(400).json({
        error: { code: 'INVALID_DECISION', message: 'Decision must be published or rejected.' },
      });
    }

    const [rows] = await executeQuery('SELECT * FROM listings WHERE id = ?', [listingId]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.' },
      });
    }

    await executeQuery(
      'UPDATE listings SET status = ?, moderation_notes = ? WHERE id = ?',
      [decision, notes || null, listingId]
    );

    await logAuditEvent({
      actorId: req.user ? req.user.id : 'moderation_system',
      action: `listing.${decision}`,
      entityType: 'listing',
      entityId: listingId,
      details: { decision, notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: `Listing moderation decision recorded: ${decision}.`,
      listingId,
      status: decision,
      moderationNotes: notes || null,
    });
  } catch (err) {
    console.error('[REVIEW_LISTING_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record moderation decision.' },
    });
  }
}
