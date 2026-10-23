import crypto from 'crypto';
import { getPool, executeQuery } from '../config/database.js';
import { recordStatusHistory, getStatusHistory } from '../services/requestHistory.service.js';
import { createNotification } from '../services/notification.service.js';
import { rateLimiter } from '../services/rateLimiter.service.js';

async function checkBusinessPermission(businessId, userId, permissionName) {
  if (!businessId) return { allowed: false, isOwner: false };
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
 * POST /api/requests/enquiries
 * Submit an in-platform enquiry for Rentals & PG, Marketplace, Krishi, etc.
 */
export async function submitEnquiry(req, res) {
  try {
    const userId = req.user.id;
    const {
      listingId,
      message,
      preferredContactMethod = 'phone',
      contactPhone,
      contactEmail,
    } = req.body;

    const rateCheck = rateLimiter.consume('enquiry_submit', userId, 20, 60);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many enquiries sent. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        },
      });
    }

    if (!listingId) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELD', message: 'listingId is required.' },
      });
    }

    const cleanMessage = String(message || '').trim();
    if (cleanMessage.length < 5 || cleanMessage.length > 2000) {
      return res.status(400).json({
        error: { code: 'INVALID_MESSAGE', message: 'Enquiry message must be between 5 and 2000 characters.' },
      });
    }

    const validMethods = ['phone', 'email', 'in_app', 'whatsapp'];
    const cleanMethod = validMethods.includes(preferredContactMethod) ? preferredContactMethod : 'phone';

    const cleanPhone = String(contactPhone || req.user.phone || '').trim();
    const cleanEmail = String(contactEmail || req.user.email || '').trim().toLowerCase();

    // Verify listing
    const [listings] = await executeQuery(
      `SELECT 
        l.id, l.title, l.module, l.status, l.availability_status,
        l.user_id AS listing_owner_id, l.business_profile_id,
        b.name AS business_name, b.owner_user_id AS business_owner_id
      FROM listings l
      LEFT JOIN business_profiles b ON l.business_profile_id = b.id
      WHERE l.id = ?`,
      [listingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found or has been removed.' },
      });
    }

    const listing = listings[0];

    if (['archived', 'rejected'].includes(listing.status)) {
      return res.status(400).json({
        error: {
          code: 'LISTING_UNAVAILABLE',
          message: 'This listing is archived or not accepting enquiries.',
        },
      });
    }

    // Prevent enquiry on own listing
    if (listing.listing_owner_id === userId || listing.business_owner_id === userId) {
      return res.status(400).json({
        error: {
          code: 'SELF_ENQUIRY_PROHIBITED',
          message: 'You cannot submit an enquiry on your own listing.',
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const enquiryId = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO listing_enquiries (
          id,
          listing_id,
          listing_title_cached,
          module,
          requester_user_id,
          business_profile_id,
          message,
          preferred_contact_method,
          contact_phone,
          contact_email,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', NOW(), NOW())`,
        [
          enquiryId,
          listingId,
          listing.title,
          listing.module,
          userId,
          listing.business_profile_id || null,
          cleanMessage,
          cleanMethod,
          cleanPhone || null,
          cleanEmail || null,
        ]
      );

      // Record history
      await recordStatusHistory(conn, {
        requestType: 'listing_enquiry',
        requestId: enquiryId,
        fromStatus: null,
        toStatus: 'sent',
        actorUserId: userId,
        actorRole: 'requester',
        reason: 'Enquiry submitted by user',
      });

      // Notify listing recipient (business owner or listing creator)
      const recipientId = listing.business_owner_id || listing.listing_owner_id;
      if (recipientId) {
        await createNotification(conn, {
          userId: recipientId,
          actorUserId: userId,
          notificationType: 'listing_enquiry_received',
          title: 'New Listing Enquiry Received',
          message: `Someone enquired regarding "${listing.title}".`,
          targetType: 'listing_enquiry',
          targetId: enquiryId,
        });
      }

      await conn.commit();

      return res.status(201).json({
        success: true,
        message: 'Your enquiry has been securely sent to the listing provider.',
        enquiry: {
          id: enquiryId,
          listingId,
          listingTitle: listing.title,
          status: 'sent',
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
    console.error('[SUBMIT_ENQUIRY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'ENQUIRY_FAILED', message: 'Failed to submit enquiry. Please retry.' },
    });
  }
}

/**
 * GET /api/requests/enquiries/:id
 */
export async function getEnquiry(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await executeQuery(
      `SELECT 
        e.id, e.listing_id, e.listing_title_cached, e.module, e.requester_user_id, e.business_profile_id,
        e.message, e.preferred_contact_method, e.contact_phone, e.contact_email,
        e.status, e.response_message, e.responded_at, e.created_at, e.updated_at,
        b.name AS business_name, b.owner_user_id AS business_owner_id,
        l.status AS listing_status, l.availability_status AS listing_availability,
        u.full_name AS requester_name
      FROM listing_enquiries e
      LEFT JOIN business_profiles b ON e.business_profile_id = b.id
      LEFT JOIN listings l ON e.listing_id = l.id
      LEFT JOIN users u ON e.requester_user_id = u.id
      WHERE e.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'ENQUIRY_NOT_FOUND', message: 'Enquiry not found.' },
      });
    }

    const enquiry = rows[0];
    const isRequester = enquiry.requester_user_id === userId;

    let isProvider = false;
    let canRespond = false;

    if (!isRequester) {
      const viewPerm = await checkBusinessPermission(enquiry.business_profile_id, userId, 'enquiries.view');
      if (!viewPerm.allowed && enquiry.business_owner_id !== userId) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You are not authorized to view this enquiry.' },
        });
      }
      isProvider = true;
      const respPerm = await checkBusinessPermission(enquiry.business_profile_id, userId, 'enquiries.respond');
      canRespond = respPerm.allowed || enquiry.business_owner_id === userId;
    }

    const pool = getPool();
    const history = await getStatusHistory(pool, 'listing_enquiry', id);

    return res.json({
      enquiry: {
        id: enquiry.id,
        listingId: enquiry.listing_id,
        listingTitle: enquiry.listing_title_cached,
        module: enquiry.module,
        businessProfileId: enquiry.business_profile_id,
        businessName: enquiry.business_name,
        listingStatus: enquiry.listing_status || 'deleted',
        listingAvailability: enquiry.listing_availability || 'unknown',
        status: enquiry.status,
        message: enquiry.message,
        preferredContactMethod: enquiry.preferred_contact_method,
        contactPhone: enquiry.contact_phone,
        contactEmail: enquiry.contact_email,
        responseMessage: enquiry.response_message,
        respondedAt: enquiry.responded_at,
        requesterName: isProvider ? enquiry.requester_name : 'You',
        createdAt: enquiry.created_at,
        updatedAt: enquiry.updated_at,
        userRole: isRequester ? 'requester' : 'provider',
        canRespond,
      },
      history,
    });
  } catch (err) {
    console.error('[GET_ENQUIRY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve enquiry.' },
    });
  }
}

/**
 * PATCH /api/requests/enquiries/:id/cancel
 * Requester cancels their enquiry.
 */
export async function cancelEnquiry(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body || {};

    const [rows] = await executeQuery(
      `SELECT e.id, e.requester_user_id, e.status, e.business_profile_id, b.owner_user_id, e.listing_title_cached
       FROM listing_enquiries e
       LEFT JOIN business_profiles b ON e.business_profile_id = b.id
       WHERE e.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'ENQUIRY_NOT_FOUND', message: 'Enquiry not found.' },
      });
    }

    const enquiry = rows[0];

    if (enquiry.requester_user_id !== userId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only cancel your own enquiries.' },
      });
    }

    if (['cancelled', 'closed'].includes(enquiry.status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot cancel an enquiry that is already ${enquiry.status}.`,
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE listing_enquiries SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
        [id]
      );

      await recordStatusHistory(conn, {
        requestType: 'listing_enquiry',
        requestId: id,
        fromStatus: enquiry.status,
        toStatus: 'cancelled',
        actorUserId: userId,
        actorRole: 'requester',
        reason: reason || 'Enquiry cancelled by user',
      });

      if (enquiry.owner_user_id) {
        await createNotification(conn, {
          userId: enquiry.owner_user_id,
          actorUserId: userId,
          notificationType: 'listing_enquiry_cancelled',
          title: 'Enquiry Cancelled',
          message: `User cancelled enquiry regarding "${enquiry.listing_title_cached}".`,
          targetType: 'listing_enquiry',
          targetId: id,
        });
      }

      await conn.commit();

      return res.json({
        success: true,
        message: 'Enquiry cancelled.',
        status: 'cancelled',
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[CANCEL_ENQUIRY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel enquiry.' },
    });
  }
}

/**
 * PATCH /api/requests/enquiries/:id/view
 * Listing provider marks enquiry as viewed.
 */
export async function markEnquiryViewed(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await executeQuery(
      `SELECT id, business_profile_id, status FROM listing_enquiries WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'ENQUIRY_NOT_FOUND', message: 'Enquiry not found.' },
      });
    }

    const enquiry = rows[0];

    const perm = await checkBusinessPermission(enquiry.business_profile_id, userId, 'enquiries.view');
    if (!perm.allowed) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You lack permission to view this enquiry.' },
      });
    }

    if (enquiry.status === 'sent') {
      const pool = getPool();
      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        await conn.execute(
          `UPDATE listing_enquiries SET status = 'viewed', updated_at = NOW() WHERE id = ?`,
          [id]
        );

        await recordStatusHistory(conn, {
          requestType: 'listing_enquiry',
          requestId: id,
          fromStatus: 'sent',
          toStatus: 'viewed',
          actorUserId: userId,
          actorRole: perm.isOwner ? 'provider_owner' : 'provider_team',
          reason: 'Marked as viewed by provider',
        });

        await conn.commit();
      } catch (txErr) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }
    }

    return res.json({ success: true, status: 'viewed' });
  } catch (err) {
    console.error('[VIEW_ENQUIRY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark enquiry viewed.' },
    });
  }
}

/**
 * PATCH /api/requests/enquiries/:id/respond
 * Listing provider records a response message.
 */
export async function respondToEnquiry(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { responseMessage } = req.body;

    const cleanResponse = String(responseMessage || '').trim();
    if (cleanResponse.length < 2 || cleanResponse.length > 2000) {
      return res.status(400).json({
        error: { code: 'INVALID_RESPONSE', message: 'Response message must be between 2 and 2000 characters.' },
      });
    }

    const [rows] = await executeQuery(
      `SELECT id, business_profile_id, requester_user_id, status, listing_title_cached 
       FROM listing_enquiries WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'ENQUIRY_NOT_FOUND', message: 'Enquiry not found.' },
      });
    }

    const enquiry = rows[0];

    const perm = await checkBusinessPermission(enquiry.business_profile_id, userId, 'enquiries.respond');
    if (!perm.allowed) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You lack permission to respond to this enquiry.' },
      });
    }

    if (['cancelled', 'closed'].includes(enquiry.status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot respond to an enquiry that is ${enquiry.status}.`,
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE listing_enquiries 
         SET status = 'responded', response_message = ?, responded_at = NOW(), updated_at = NOW() 
         WHERE id = ?`,
        [cleanResponse, id]
      );

      await recordStatusHistory(conn, {
        requestType: 'listing_enquiry',
        requestId: id,
        fromStatus: enquiry.status,
        toStatus: 'responded',
        actorUserId: userId,
        actorRole: perm.isOwner ? 'provider_owner' : 'provider_team',
        reason: 'Provider responded to enquiry',
        metadata: { responseSnippet: cleanResponse.slice(0, 100) },
      });

      // Notify requester
      await createNotification(conn, {
        userId: enquiry.requester_user_id,
        actorUserId: userId,
        notificationType: 'listing_enquiry_responded',
        title: 'New Response on Your Enquiry',
        message: `The provider responded to your enquiry for "${enquiry.listing_title_cached}".`,
        targetType: 'listing_enquiry',
        targetId: id,
      });

      await conn.commit();

      return res.json({
        success: true,
        message: 'Response recorded and notification sent to requester.',
        status: 'responded',
        responseMessage: cleanResponse,
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[RESPOND_ENQUIRY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record response.' },
    });
  }
}

/**
 * PATCH /api/requests/enquiries/:id/close
 * Listing provider closes enquiry.
 */
export async function closeEnquiry(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body || {};

    const [rows] = await executeQuery(
      `SELECT id, business_profile_id, status FROM listing_enquiries WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'ENQUIRY_NOT_FOUND', message: 'Enquiry not found.' },
      });
    }

    const enquiry = rows[0];

    const perm = await checkBusinessPermission(enquiry.business_profile_id, userId, 'enquiries.respond');
    if (!perm.allowed) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You lack permission to close this enquiry.' },
      });
    }

    if (['cancelled', 'closed'].includes(enquiry.status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Enquiry is already ${enquiry.status}.`,
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE listing_enquiries SET status = 'closed', updated_at = NOW() WHERE id = ?`,
        [id]
      );

      await recordStatusHistory(conn, {
        requestType: 'listing_enquiry',
        requestId: id,
        fromStatus: enquiry.status,
        toStatus: 'closed',
        actorUserId: userId,
        actorRole: perm.isOwner ? 'provider_owner' : 'provider_team',
        reason: reason || 'Enquiry marked as closed by provider',
      });

      await conn.commit();

      return res.json({
        success: true,
        message: 'Enquiry closed.',
        status: 'closed',
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[CLOSE_ENQUIRY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to close enquiry.' },
    });
  }
}
