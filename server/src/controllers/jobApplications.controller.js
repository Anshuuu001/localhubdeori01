import crypto from 'crypto';
import { getPool, executeQuery } from '../config/database.js';
import { recordStatusHistory, getStatusHistory } from '../services/requestHistory.service.js';
import { createNotification } from '../services/notification.service.js';
import { rateLimiter } from '../services/rateLimiter.service.js';

/**
 * Validates whether user is owner or has specified permission for a business.
 */
async function checkBusinessPermission(businessId, userId, permissionName) {
  const [bizRows] = await executeQuery(
    'SELECT id, owner_user_id FROM business_profiles WHERE id = ?',
    [businessId]
  );
  if (bizRows.length === 0) return { allowed: false, isOwner: false };
  if (bizRows[0].owner_user_id === userId) {
    return { allowed: true, isOwner: true };
  }

  const [memberRows] = await executeQuery(
    `SELECT m.id, m.role_id, rp.permission_id 
     FROM business_memberships m
     JOIN role_permissions rp ON m.role_id = rp.role_id
     WHERE m.business_profile_id = ? AND m.user_id = ? AND m.status = 'active' AND rp.permission_id = ?`,
    [businessId, userId, permissionName]
  );
  return { allowed: memberRows.length > 0, isOwner: false };
}

/**
 * POST /api/requests/jobs
 * Apply for an active, published job.
 */
export async function submitJobApplication(req, res) {
  try {
    const userId = req.user.id;
    const {
      listingId,
      applicantName,
      applicantPhone,
      applicantEmail,
      coverNote,
      experienceSummary,
      qualifications,
      resumeUrl,
    } = req.body;

    // Rate limiting
    const rateCheck = rateLimiter.consume('job_app_submit', userId, 15, 60);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many applications submitted. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        },
      });
    }

    if (!listingId) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELD', message: 'Job listingId is required.' },
      });
    }

    const cleanName = String(applicantName || req.user.fullName || '').trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        error: { code: 'INVALID_NAME', message: 'Applicant name must be between 2 and 100 characters.' },
      });
    }

    const cleanPhone = String(applicantPhone || req.user.phone || '').trim();
    const cleanEmail = String(applicantEmail || req.user.email || '').trim().toLowerCase();

    if (!cleanPhone && !cleanEmail) {
      return res.status(400).json({
        error: { code: 'CONTACT_REQUIRED', message: 'At least one contact method (phone or email) is required.' },
      });
    }

    if (cleanPhone && !/^\+?[0-9]{10,15}$/.test(cleanPhone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({
        error: { code: 'INVALID_PHONE', message: 'Please provide a valid 10-digit mobile number.' },
      });
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' },
      });
    }

    if (coverNote && coverNote.length > 2000) {
      return res.status(400).json({
        error: { code: 'COVER_NOTE_TOO_LONG', message: 'Cover note cannot exceed 2000 characters.' },
      });
    }

    // Inspect Job Listing
    const [listings] = await executeQuery(
      `SELECT 
        l.id, l.title, l.module, l.status, l.availability_status, 
        l.user_id AS listing_owner_id, l.business_profile_id,
        b.name AS business_name, b.owner_user_id AS business_owner_id,
        lj.expires_at AS job_expires_at
      FROM listings l
      LEFT JOIN business_profiles b ON l.business_profile_id = b.id
      LEFT JOIN listing_jobs lj ON l.id = lj.listing_id
      WHERE l.id = ?`,
      [listingId]
    );

    if (listings.length === 0 || listings[0].module !== 'jobs') {
      return res.status(404).json({
        error: { code: 'JOB_NOT_FOUND', message: 'Job opening not found or does not exist.' },
      });
    }

    const job = listings[0];

    // Status validations
    if (job.status !== 'published') {
      return res.status(400).json({
        error: {
          code: 'JOB_NOT_AVAILABLE',
          message: 'This job opening is pending review or currently unavailable for applications.',
        },
      });
    }

    if (job.availability_status !== 'available') {
      return res.status(400).json({
        error: {
          code: 'JOB_NOT_AVAILABLE',
          message: 'This job vacancy has already been filled or closed.',
        },
      });
    }

    if (job.job_expires_at && new Date(job.job_expires_at) < new Date()) {
      return res.status(400).json({
        error: {
          code: 'JOB_LISTING_EXPIRED',
          message: 'The application deadline for this job posting has expired.',
        },
      });
    }

    // Prevent applying to own listing
    if (job.listing_owner_id === userId || job.business_owner_id === userId) {
      return res.status(400).json({
        error: {
          code: 'SELF_APPLICATION_PROHIBITED',
          message: 'You cannot apply to a job posted by your own account or business.',
        },
      });
    }

    // Check duplicate active application
    const [existingApps] = await executeQuery(
      `SELECT id, status FROM job_applications 
       WHERE listing_id = ? AND applicant_user_id = ? AND status IN ('submitted', 'shortlisted', 'hired')`,
      [listingId, userId]
    );

    if (existingApps.length > 0) {
      return res.status(409).json({
        error: {
          code: 'APPLICATION_ALREADY_EXISTS',
          message: `You already have an active application (${existingApps[0].status}) for this position.`,
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const appId = crypto.randomUUID();
      const targetBusinessId = job.business_profile_id;

      await conn.execute(
        `INSERT INTO job_applications (
          id,
          listing_id,
          listing_title_cached,
          applicant_user_id,
          business_profile_id,
          applicant_name,
          applicant_phone,
          applicant_email,
          cover_note,
          experience_summary,
          qualifications,
          resume_url,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW(), NOW())`,
        [
          appId,
          listingId,
          job.title,
          userId,
          targetBusinessId,
          cleanName,
          cleanPhone || null,
          cleanEmail || null,
          coverNote || null,
          experienceSummary || null,
          qualifications || null,
          resumeUrl || null,
        ]
      );

      // Append status history
      await recordStatusHistory(conn, {
        requestType: 'job_application',
        requestId: appId,
        fromStatus: null,
        toStatus: 'submitted',
        actorUserId: userId,
        actorRole: 'applicant',
        reason: 'Application submitted by candidate',
      });

      // Dispatch in-app notification to business owner
      if (job.business_owner_id) {
        await createNotification(conn, {
          userId: job.business_owner_id,
          actorUserId: userId,
          notificationType: 'job_application_submitted',
          title: 'New Job Application Received',
          message: `${cleanName} applied for "${job.title}".`,
          targetType: 'job_application',
          targetId: appId,
        });
      }

      await conn.commit();

      return res.status(201).json({
        success: true,
        message: 'Your job application has been securely submitted.',
        application: {
          id: appId,
          listingId,
          jobTitle: job.title,
          businessName: job.business_name,
          status: 'submitted',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[SUBMIT_JOB_APP_ERROR]', err);
    return res.status(500).json({
      error: { code: 'APPLICATION_FAILED', message: 'Failed to submit job application. Please retry.' },
    });
  }
}

/**
 * GET /api/requests/jobs/:id
 * Retrieve application detail with full status history and permission boundary.
 */
export async function getJobApplication(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await executeQuery(
      `SELECT 
        a.id, a.listing_id, a.listing_title_cached, a.applicant_user_id, a.business_profile_id,
        a.applicant_name, a.applicant_phone, a.applicant_email, a.cover_note,
        a.experience_summary, a.qualifications, a.resume_url, a.status, a.employer_notes,
        a.created_at, a.updated_at,
        b.name AS business_name, b.owner_user_id AS business_owner_id,
        l.status AS listing_status, l.availability_status AS listing_availability,
        u.email AS user_auth_email, u.phone AS user_auth_phone
      FROM job_applications a
      LEFT JOIN business_profiles b ON a.business_profile_id = b.id
      LEFT JOIN listings l ON a.listing_id = l.id
      LEFT JOIN users u ON a.applicant_user_id = u.id
      WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'APPLICATION_NOT_FOUND', message: 'Job application not found.' },
      });
    }

    const app = rows[0];
    const isApplicant = app.applicant_user_id === userId;

    let isEmployer = false;
    let canRespond = false;

    if (!isApplicant) {
      const viewPerm = await checkBusinessPermission(app.business_profile_id, userId, 'enquiries.view');
      if (!viewPerm.allowed) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You are not authorized to view this application.' },
        });
      }
      isEmployer = true;
      const respPerm = await checkBusinessPermission(app.business_profile_id, userId, 'enquiries.respond');
      canRespond = respPerm.allowed;
    }

    const pool = getPool();
    const history = await getStatusHistory(pool, 'job_application', id);

    return res.json({
      application: {
        id: app.id,
        listingId: app.listing_id,
        jobTitle: app.listing_title_cached,
        businessProfileId: app.business_profile_id,
        businessName: app.business_name,
        listingStatus: app.listing_status || 'deleted',
        listingAvailability: app.listing_availability || 'unknown',
        status: app.status,
        applicantName: app.applicant_name,
        // Privacy: phone & email only exposed to authorized applicant & employer
        applicantPhone: app.applicant_phone,
        applicantEmail: app.applicant_email,
        coverNote: app.cover_note,
        experienceSummary: app.experience_summary,
        qualifications: app.qualifications,
        resumeUrl: app.resume_url,
        employerNotes: isEmployer ? app.employer_notes : null,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
        userRole: isApplicant ? 'applicant' : 'employer',
        canRespond,
      },
      history,
    });
  } catch (err) {
    console.error('[GET_JOB_APP_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve job application.' },
    });
  }
}

/**
 * PATCH /api/requests/jobs/:id/withdraw
 * Applicant withdraws their own application.
 */
export async function withdrawJobApplication(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body || {};

    const [rows] = await executeQuery(
      `SELECT a.id, a.applicant_user_id, a.status, a.listing_title_cached, a.business_profile_id, b.owner_user_id 
       FROM job_applications a
       JOIN business_profiles b ON a.business_profile_id = b.id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found.' },
      });
    }

    const app = rows[0];

    if (app.applicant_user_id !== userId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only withdraw your own applications.' },
      });
    }

    if (['withdrawn', 'rejected', 'hired'].includes(app.status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot withdraw an application that is already in '${app.status}' status.`,
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE job_applications SET status = 'withdrawn', updated_at = NOW() WHERE id = ?`,
        [id]
      );

      await recordStatusHistory(conn, {
        requestType: 'job_application',
        requestId: id,
        fromStatus: app.status,
        toStatus: 'withdrawn',
        actorUserId: userId,
        actorRole: 'applicant',
        reason: reason || 'Application withdrawn by applicant',
      });

      if (app.owner_user_id) {
        await createNotification(conn, {
          userId: app.owner_user_id,
          actorUserId: userId,
          notificationType: 'job_application_withdrawn',
          title: 'Job Application Withdrawn',
          message: `Candidate withdrew application for "${app.listing_title_cached}".`,
          targetType: 'job_application',
          targetId: id,
        });
      }

      await conn.commit();

      return res.json({
        success: true,
        message: 'Application has been successfully withdrawn.',
        status: 'withdrawn',
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[WITHDRAW_JOB_APP_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to withdraw application.' },
    });
  }
}

/**
 * PATCH /api/requests/jobs/:id/status
 * Employer status transition: shortlisted, rejected, hired.
 */
export async function updateJobApplicationStatus(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status: targetStatus, reason, notes } = req.body;

    const allowedTransitions = {
      submitted: ['shortlisted', 'rejected', 'hired'],
      shortlisted: ['hired', 'rejected'],
    };

    const [rows] = await executeQuery(
      `SELECT a.id, a.applicant_user_id, a.status, a.listing_title_cached, a.business_profile_id 
       FROM job_applications a
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found.' },
      });
    }

    const app = rows[0];

    const perm = await checkBusinessPermission(app.business_profile_id, userId, 'enquiries.respond');
    if (!perm.allowed) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You lack permission to update candidate application status.' },
      });
    }

    const validNextStatuses = allowedTransitions[app.status] || [];
    if (!validNextStatuses.includes(targetStatus)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition application status from '${app.status}' to '${targetStatus}'. Allowed: ${validNextStatuses.join(', ')}.`,
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE job_applications 
         SET status = ?, employer_notes = COALESCE(?, employer_notes), updated_at = NOW() 
         WHERE id = ?`,
        [targetStatus, notes || null, id]
      );

      await recordStatusHistory(conn, {
        requestType: 'job_application',
        requestId: id,
        fromStatus: app.status,
        toStatus: targetStatus,
        actorUserId: userId,
        actorRole: perm.isOwner ? 'provider_owner' : 'provider_team',
        reason: reason || `Status updated to ${targetStatus} by employer`,
        metadata: notes ? { employerNotes: notes } : null,
      });

      // Dispatch notification to candidate
      const notificationTitles = {
        shortlisted: 'Your Application was Shortlisted!',
        hired: 'Congratulations! You Have Been Hired',
        rejected: 'Application Status Update',
      };

      await createNotification(conn, {
        userId: app.applicant_user_id,
        actorUserId: userId,
        notificationType: `job_application_${targetStatus}`,
        title: notificationTitles[targetStatus] || 'Application Status Update',
        message: `Your application for "${app.listing_title_cached}" was updated to ${targetStatus}.`,
        targetType: 'job_application',
        targetId: id,
      });

      await conn.commit();

      return res.json({
        success: true,
        message: `Application status updated to ${targetStatus}.`,
        status: targetStatus,
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[UPDATE_JOB_APP_STATUS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update application status.' },
    });
  }
}
