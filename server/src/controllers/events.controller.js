import crypto from 'crypto';
import { getPool, executeQuery } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { rateLimiter } from '../services/rateLimiter.service.js';

const VALID_CATEGORIES = [
  'haat_bazaar',
  'yatra_festival',
  'agri_fair',
  'health_camp',
  'sports_tournament',
  'cultural_meet',
  'civic_meeting',
  'other',
];

/**
 * GET /api/events
 * Public list of published community events with response counts.
 */
export async function listEvents(req, res) {
  try {
    const {
      category,
      areaId,
      timeline = 'upcoming', // 'upcoming' | 'past' | 'all'
      search = '',
      page = 1,
      limit = 15,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ["e.status = 'published'"];
    const params = [];

    if (category && category !== 'All' && VALID_CATEGORIES.includes(category)) {
      conditions.push('e.category = ?');
      params.push(category);
    }

    if (areaId && areaId !== 'all') {
      conditions.push('e.area_id = ?');
      params.push(areaId);
    }

    if (timeline === 'upcoming') {
      conditions.push('e.end_date >= CURRENT_DATE()');
    } else if (timeline === 'past') {
      conditions.push('e.end_date < CURRENT_DATE()');
    }

    if (search && search.trim()) {
      conditions.push('(LOWER(e.title) LIKE ? OR LOWER(e.venue) LIKE ? OR LOWER(e.organizer_name) LIKE ?)');
      const pattern = `%${search.trim().toLowerCase()}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = timeline === 'past' ? 'ORDER BY e.start_date DESC' : 'ORDER BY e.start_date ASC';

    // Count query
    const [countRows] = await executeQuery(
      `SELECT COUNT(*) AS total_count FROM events e ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total_count || 0);

    // Items query with response aggregations
    const userId = req.user ? req.user.id : null;
    const userRespSelect = userId ? `, (SELECT response_type FROM event_responses WHERE event_id = e.id AND user_id = ?) AS user_response` : ', NULL AS user_response';
    const queryParams = userId ? [userId, ...params, limitNum, offset] : [...params, limitNum, offset];

    const [rows] = await executeQuery(
      `SELECT 
        e.id,
        e.title,
        e.category,
        e.description,
        e.start_date,
        e.start_time,
        e.end_date,
        e.end_time,
        e.venue,
        e.area_id,
        e.address_details,
        e.organizer_name,
        e.permit_contact_options,
        e.source_url,
        e.poster_url,
        e.business_profile_id,
        e.status,
        e.created_at,
        a.name AS area_name,
        a.marathi_name AS area_marathi_name,
        COALESCE(b.name, 'Independent Organizer') AS business_name,
        (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response_type = 'interested') AS interested_count,
        (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response_type = 'going') AS going_count
        ${userRespSelect}
      FROM events e
      LEFT JOIN taluka_areas a ON e.area_id = a.id
      LEFT JOIN business_profiles b ON e.business_profile_id = b.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?`,
      queryParams
    );

    return res.json({
      events: rows.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        description: r.description,
        startDate: r.start_date,
        startTime: r.start_time,
        endDate: r.end_date,
        endTime: r.end_time,
        venue: r.venue,
        areaId: r.area_id,
        areaName: r.area_name,
        areaMarathiName: r.area_marathi_name,
        addressDetails: r.address_details,
        organizerName: r.organizer_name,
        permitContactOptions: r.permit_contact_options,
        sourceUrl: r.source_url,
        posterUrl: r.poster_url,
        businessName: r.business_name,
        status: r.status,
        interestedCount: Number(r.interested_count || 0),
        goingCount: Number(r.going_count || 0),
        userResponse: r.user_response || null,
        isPast: new Date(r.end_date) < new Date(new Date().toDateString()),
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
    console.error('[LIST_EVENTS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve events.' },
    });
  }
}

/**
 * GET /api/events/:id
 * Single event detail view with organizer contact options.
 */
export async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    const [rows] = await executeQuery(
      `SELECT 
        e.*,
        a.name AS area_name,
        a.marathi_name AS area_marathi_name,
        b.name AS business_name,
        (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response_type = 'interested') AS interested_count,
        (SELECT COUNT(*) FROM event_responses WHERE event_id = e.id AND response_type = 'going') AS going_count,
        (SELECT response_type FROM event_responses WHERE event_id = e.id AND user_id = ?) AS user_response
      FROM events e
      LEFT JOIN taluka_areas a ON e.area_id = a.id
      LEFT JOIN business_profiles b ON e.business_profile_id = b.id
      WHERE e.id = ?`,
      [userId, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' },
      });
    }

    const event = rows[0];

    // Gating non-published events
    if (event.status !== 'published') {
      const isCreator = userId && event.created_by_user_id === userId;
      const isStaff = userRole === 'editor' || userRole === 'admin';
      if (!isCreator && !isStaff) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'This event is pending moderation review.' },
        });
      }
    }

    return res.json({
      event: {
        id: event.id,
        title: event.title,
        category: event.category,
        description: event.description,
        startDate: event.start_date,
        startTime: event.start_time,
        endDate: event.end_date,
        endTime: event.end_time,
        venue: event.venue,
        areaId: event.area_id,
        areaName: event.area_name,
        areaMarathiName: event.area_marathi_name,
        addressDetails: event.address_details,
        organizerName: event.organizer_name,
        organizerContactPhone: event.permit_contact_options.includes('phone') ? event.organizer_contact_phone : null,
        organizerContactEmail: event.permit_contact_options.includes('email') ? event.organizer_contact_email : null,
        permitContactOptions: event.permit_contact_options,
        sourceUrl: event.source_url,
        posterUrl: event.poster_url,
        businessName: event.business_name,
        status: event.status,
        cancellationReason: event.cancellation_reason,
        rejectionReason: event.created_by_user_id === userId ? event.rejection_reason : null,
        interestedCount: Number(event.interested_count || 0),
        goingCount: Number(event.going_count || 0),
        userResponse: event.user_response || null,
        isPast: new Date(event.end_date) < new Date(new Date().toDateString()),
        isCreator: Boolean(userId && event.created_by_user_id === userId),
        createdAt: event.created_at,
        disclaimer: 'Event details are published following administrative review. LocalHub X does not guarantee external venue safety or quality.',
      },
    });
  } catch (err) {
    console.error('[GET_EVENT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve event details.' },
    });
  }
}

/**
 * POST /api/events
 * Submit a community event for review.
 */
export async function submitEvent(req, res) {
  try {
    const userId = req.user.id;
    const {
      title,
      category,
      description,
      startDate,
      startTime,
      endDate,
      endTime,
      venue,
      areaId,
      addressDetails,
      organizerName,
      organizerContactPhone,
      organizerContactEmail,
      permitContactOptions = 'phone',
      sourceUrl,
      posterUrl,
      businessProfileId,
    } = req.body;

    const rateCheck = rateLimiter.consume('event_submit', userId, 10, 60);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many submissions. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
        },
      });
    }

    if (!title || title.trim().length < 3 || title.trim().length > 200) {
      return res.status(400).json({
        error: { code: 'INVALID_TITLE', message: 'Event title must be between 3 and 200 characters.' },
      });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: { code: 'INVALID_CATEGORY', message: `Please select a valid event category.` },
      });
    }

    if (!description || description.trim().length < 10 || description.trim().length > 5000) {
      return res.status(400).json({
        error: { code: 'INVALID_DESCRIPTION', message: 'Event description must be between 10 and 5000 characters.' },
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: { code: 'DATES_REQUIRED', message: 'Start date and end date are required.' },
      });
    }

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const today = new Date(new Date().toDateString());

    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      return res.status(400).json({
        error: { code: 'INVALID_DATE_FORMAT', message: 'Please provide valid ISO dates (YYYY-MM-DD).' },
      });
    }

    if (startObj < today) {
      return res.status(400).json({
        error: { code: 'PAST_DATE_PROHIBITED', message: 'Cannot submit an event starting in the past.' },
      });
    }

    if (endObj < startObj) {
      return res.status(400).json({
        error: { code: 'INVALID_DATE_RANGE', message: 'Event end date cannot be earlier than start date.' },
      });
    }

    if (!venue || venue.trim().length < 2 || venue.trim().length > 200) {
      return res.status(400).json({
        error: { code: 'INVALID_VENUE', message: 'Venue name/location must be between 2 and 200 characters.' },
      });
    }

    const cleanOrganizer = String(organizerName || req.user.fullName || '').trim();
    if (cleanOrganizer.length < 2) {
      return res.status(400).json({
        error: { code: 'ORGANIZER_REQUIRED', message: 'Organizer name is required.' },
      });
    }

    const cleanPhone = String(organizerContactPhone || req.user.phone || '').trim();
    const cleanEmail = String(organizerContactEmail || req.user.email || '').trim().toLowerCase();

    if (cleanPhone && !/^\+?[0-9]{10,15}$/.test(cleanPhone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({
        error: { code: 'INVALID_PHONE', message: 'Please provide a valid 10-digit phone number.' },
      });
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' },
      });
    }

    const eventId = crypto.randomUUID();

    await executeQuery(
      `INSERT INTO events (
        id, title, category, description,
        start_date, start_time, end_date, end_time,
        venue, area_id, address_details,
        organizer_name, organizer_contact_phone, organizer_contact_email, permit_contact_options,
        source_url, poster_url, created_by_user_id, business_profile_id,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', NOW(), NOW())`,
      [
        eventId,
        title.trim(),
        category,
        description.trim(),
        startDate,
        startTime || '09:00 AM',
        endDate,
        endTime || '06:00 PM',
        venue.trim(),
        areaId || null,
        addressDetails ? addressDetails.trim() : null,
        cleanOrganizer,
        cleanPhone || null,
        cleanEmail || null,
        permitContactOptions || 'phone',
        sourceUrl ? sourceUrl.trim() : null,
        posterUrl ? posterUrl.trim() : null,
        userId,
        businessProfileId || null,
      ]
    );

    await logAuditEvent({
      actorId: userId,
      action: 'event.submitted',
      entityType: 'event',
      entityId: eventId,
      details: { title, category, startDate, endDate, venue },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      success: true,
      message: 'Event submitted for review. An authorized editor will inspect and publish it.',
      event: {
        id: eventId,
        title: title.trim(),
        status: 'pending_review',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[SUBMIT_EVENT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit event.' },
    });
  }
}

/**
 * PATCH /api/events/:id/cancel
 * Creator or Admin cancels an event.
 */
export async function cancelEvent(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { reason } = req.body || {};

    const [rows] = await executeQuery('SELECT * FROM events WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' },
      });
    }

    const event = rows[0];
    const isOwner = event.created_by_user_id === userId;
    const isStaff = userRole === 'editor' || userRole === 'admin';

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You are not authorized to cancel this event.' },
      });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({
        error: { code: 'ALREADY_CANCELLED', message: 'Event is already marked as cancelled.' },
      });
    }

    const cleanReason = String(reason || 'Cancelled by organizer').trim();

    await executeQuery(
      `UPDATE events SET status = 'cancelled', cancellation_reason = ?, updated_at = NOW() WHERE id = ?`,
      [cleanReason, id]
    );

    await logAuditEvent({
      actorId: userId,
      action: 'event.cancelled',
      entityType: 'event',
      entityId: id,
      details: { reason: cleanReason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      success: true,
      message: 'Event has been marked as cancelled.',
      status: 'cancelled',
    });
  } catch (err) {
    console.error('[CANCEL_EVENT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel event.' },
    });
  }
}

/**
 * POST /api/events/:id/respond
 * Record user response: interested, going, or remove response.
 */
export async function respondToEvent(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { responseType } = req.body; // 'interested' | 'going' | null

    const [eRows] = await executeQuery('SELECT id, status FROM events WHERE id = ?', [id]);
    if (eRows.length === 0) {
      return res.status(404).json({
        error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' },
      });
    }

    if (eRows[0].status !== 'published') {
      return res.status(400).json({
        error: { code: 'EVENT_NOT_AVAILABLE', message: 'Can only respond to published events.' },
      });
    }

    if (!responseType) {
      // Remove response
      await executeQuery('DELETE FROM event_responses WHERE event_id = ? AND user_id = ?', [id, userId]);
      return res.json({
        success: true,
        message: 'Response removed.',
        responseType: null,
      });
    }

    if (!['interested', 'going'].includes(responseType)) {
      return res.status(400).json({
        error: { code: 'INVALID_RESPONSE', message: 'responseType must be "interested" or "going".' },
      });
    }

    const respId = crypto.randomUUID();
    await executeQuery(
      `INSERT INTO event_responses (id, event_id, user_id, response_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE response_type = VALUES(response_type), updated_at = NOW()`,
      [respId, id, userId, responseType]
    );

    return res.json({
      success: true,
      message: `Marked as ${responseType}.`,
      responseType,
    });
  } catch (err) {
    console.error('[RESPOND_EVENT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record response.' },
    });
  }
}

/**
 * GET /api/events/moderation/pending
 * List events awaiting editorial review. Requires editor/admin role.
 */
export async function listPendingEvents(req, res) {
  try {
    const [rows] = await executeQuery(
      `SELECT 
        e.*,
        u.full_name AS submitter_name,
        u.email AS submitter_email,
        u.phone AS submitter_phone,
        a.name AS area_name
       FROM events e
       JOIN users u ON e.created_by_user_id = u.id
       LEFT JOIN taluka_areas a ON e.area_id = a.id
       WHERE e.status = 'pending_review'
       ORDER BY e.created_at ASC`
    );

    return res.json({
      pendingEvents: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error('[LIST_PENDING_EVENTS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve moderation queue.' },
    });
  }
}

/**
 * POST /api/events/moderation/review/:id
 * Review event submission: published or rejected. Requires editor/admin role.
 */
export async function reviewEvent(req, res) {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { decision, notes, rejectionReason } = req.body;

    if (!decision || !['published', 'rejected'].includes(decision)) {
      return res.status(400).json({
        error: { code: 'INVALID_DECISION', message: 'Decision must be "published" or "rejected".' },
      });
    }

    const [rows] = await executeQuery('SELECT * FROM events WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' },
      });
    }

    const event = rows[0];

    await executeQuery(
      `UPDATE events 
       SET status = ?, 
           moderation_notes = ?, 
           rejection_reason = ?,
           reviewed_by_user_id = ?, 
           reviewed_at = NOW(), 
           updated_at = NOW() 
       WHERE id = ?`,
      [decision, notes || null, decision === 'rejected' ? (rejectionReason || 'Does not meet civic event criteria') : null, reviewerId, id]
    );

    await logAuditEvent({
      actorId: reviewerId,
      action: `event.${decision}`,
      entityType: 'event',
      entityId: id,
      details: { decision, notes, rejectionReason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await createNotification(conn, {
        userId: event.created_by_user_id,
        actorUserId: reviewerId,
        notificationType: `event_${decision}`,
        title: decision === 'published' ? 'Event Approved & Published' : 'Event Review Update',
        message: decision === 'published' 
          ? `Your event "${event.title}" is now published on the Deori Events Desk.`
          : `Your event "${event.title}" was not approved: ${rejectionReason || 'Civic guidelines requirement'}`,
        targetType: 'event',
        targetId: id,
      });
    } catch (e) {
      // Non-fatal notification failure
    } finally {
      conn.release();
    }

    return res.json({
      success: true,
      message: `Event decision recorded: ${decision}.`,
      status: decision,
    });
  } catch (err) {
    console.error('[REVIEW_EVENT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record event review.' },
    });
  }
}
