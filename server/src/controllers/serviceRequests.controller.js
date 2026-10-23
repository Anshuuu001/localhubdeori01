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
 * POST /api/requests/services
 * Book a local service from an eligible active service listing.
 */
export async function submitServiceRequest(req, res) {
  try {
    const userId = req.user.id;
    const {
      listingId,
      serviceDescription,
      serviceAreaId,
      addressDetails,
      preferredDate,
      preferredTimeSlot,
      contactName,
      contactPhone,
      attachments,
    } = req.body;

    const rateCheck = rateLimiter.consume('service_req_submit', userId, 15, 60);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many service requests. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        },
      });
    }

    if (!listingId) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELD', message: 'listingId is required.' },
      });
    }

    const cleanDesc = String(serviceDescription || '').trim();
    if (cleanDesc.length < 10 || cleanDesc.length > 3000) {
      return res.status(400).json({
        error: { code: 'INVALID_DESCRIPTION', message: 'Service description must be between 10 and 3000 characters.' },
      });
    }

    const cleanAddress = String(addressDetails || '').trim();
    if (cleanAddress.length < 3 || cleanAddress.length > 255) {
      return res.status(400).json({
        error: { code: 'INVALID_ADDRESS', message: 'Please provide a valid service address/location in Deori Taluka.' },
      });
    }

    const cleanName = String(contactName || req.user.fullName || '').trim();
    if (cleanName.length < 2) {
      return res.status(400).json({
        error: { code: 'INVALID_NAME', message: 'Contact name is required.' },
      });
    }

    const cleanPhone = String(contactPhone || req.user.phone || '').trim();
    if (!cleanPhone || !/^\+?[0-9]{10,15}$/.test(cleanPhone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({
        error: { code: 'INVALID_PHONE', message: 'Please provide a valid 10-digit mobile number for communication.' },
      });
    }

    // Inspect service listing
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

    if (listings.length === 0 || listings[0].module !== 'services') {
      return res.status(404).json({
        error: { code: 'SERVICE_NOT_FOUND', message: 'Service listing not found or is invalid.' },
      });
    }

    const service = listings[0];

    if (service.status !== 'published') {
      return res.status(400).json({
        error: {
          code: 'SERVICE_NOT_AVAILABLE',
          message: 'This service listing is currently pending review or not published.',
        },
      });
    }

    if (service.availability_status !== 'available') {
      return res.status(400).json({
        error: {
          code: 'SERVICE_NOT_AVAILABLE',
          message: 'The provider is currently not accepting new service bookings.',
        },
      });
    }

    if (service.listing_owner_id === userId || service.business_owner_id === userId) {
      return res.status(400).json({
        error: {
          code: 'SELF_REQUEST_PROHIBITED',
          message: 'You cannot request services from your own listing or business.',
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const requestId = crypto.randomUUID();
      const attachmentsJson = Array.isArray(attachments) ? JSON.stringify(attachments) : null;

      await conn.execute(
        `INSERT INTO service_requests (
          id,
          listing_id,
          listing_title_cached,
          requester_user_id,
          business_profile_id,
          service_description,
          service_area_id,
          address_details,
          preferred_date,
          preferred_time_slot,
          contact_name,
          contact_phone,
          attachments,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [
          requestId,
          listingId,
          service.title,
          userId,
          service.business_profile_id,
          cleanDesc,
          serviceAreaId || null,
          cleanAddress,
          preferredDate || null,
          preferredTimeSlot || null,
          cleanName,
          cleanPhone,
          attachmentsJson,
        ]
      );

      await recordStatusHistory(conn, {
        requestType: 'service_request',
        requestId,
        fromStatus: null,
        toStatus: 'pending',
        actorUserId: userId,
        actorRole: 'requester',
        reason: 'Service request created by customer',
      });

      if (service.business_owner_id) {
        await createNotification(conn, {
          userId: service.business_owner_id,
          actorUserId: userId,
          notificationType: 'service_request_created',
          title: 'New Service Booking Request',
          message: `${cleanName} requested "${service.title}".`,
          targetType: 'service_request',
          targetId: requestId,
        });
      }

      await conn.commit();

      return res.status(201).json({
        success: true,
        message: 'Your service request has been submitted to the provider.',
        serviceRequest: {
          id: requestId,
          listingId,
          serviceTitle: service.title,
          businessName: service.business_name,
          status: 'pending',
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
    console.error('[SUBMIT_SERVICE_REQ_ERROR]', err);
    return res.status(500).json({
      error: { code: 'REQUEST_FAILED', message: 'Failed to submit service request. Please retry.' },
    });
  }
}

/**
 * GET /api/requests/services/:id
 */
export async function getServiceRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await executeQuery(
      `SELECT 
        s.id, s.listing_id, s.listing_title_cached, s.requester_user_id, s.business_profile_id,
        s.service_description, s.service_area_id, s.address_details, s.preferred_date, s.preferred_time_slot,
        s.contact_name, s.contact_phone, s.attachments, s.status, s.rejection_reason, s.cancellation_reason,
        s.provider_notes, s.created_at, s.updated_at,
        b.name AS business_name, b.owner_user_id AS business_owner_id,
        l.status AS listing_status, l.availability_status AS listing_availability,
        a.name AS area_name, a.marathi_name AS area_marathi_name,
        u.full_name AS requester_full_name
      FROM service_requests s
      LEFT JOIN business_profiles b ON s.business_profile_id = b.id
      LEFT JOIN listings l ON s.listing_id = l.id
      LEFT JOIN taluka_areas a ON s.service_area_id = a.id
      LEFT JOIN users u ON s.requester_user_id = u.id
      WHERE s.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'REQUEST_NOT_FOUND', message: 'Service request not found.' },
      });
    }

    const s = rows[0];
    const isRequester = s.requester_user_id === userId;

    let isProvider = false;
    let canRespond = false;

    if (!isRequester) {
      const viewPerm = await checkBusinessPermission(s.business_profile_id, userId, 'enquiries.view');
      if (!viewPerm.allowed && s.business_owner_id !== userId) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You are not authorized to view this service request.' },
        });
      }
      isProvider = true;
      const respPerm = await checkBusinessPermission(s.business_profile_id, userId, 'enquiries.respond');
      canRespond = respPerm.allowed || s.business_owner_id === userId;
    }

    const pool = getPool();
    const history = await getStatusHistory(pool, 'service_request', id);

    let parsedAttachments = [];
    try {
      parsedAttachments = typeof s.attachments === 'string' ? JSON.parse(s.attachments) : s.attachments || [];
    } catch {
      parsedAttachments = [];
    }

    return res.json({
      serviceRequest: {
        id: s.id,
        listingId: s.listing_id,
        serviceTitle: s.listing_title_cached,
        businessProfileId: s.business_profile_id,
        businessName: s.business_name,
        listingStatus: s.listing_status || 'deleted',
        listingAvailability: s.listing_availability || 'unknown',
        status: s.status,
        serviceDescription: s.service_description,
        areaName: s.area_name || 'Deori Taluka',
        areaMarathiName: s.area_marathi_name,
        addressDetails: s.address_details,
        preferredDate: s.preferred_date,
        preferredTimeSlot: s.preferred_time_slot,
        contactName: s.contact_name,
        contactPhone: s.contact_phone,
        attachments: parsedAttachments,
        rejectionReason: s.rejection_reason,
        cancellationReason: s.cancellation_reason,
        providerNotes: isProvider ? s.provider_notes : null,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        userRole: isRequester ? 'requester' : 'provider',
        canRespond,
      },
      history,
    });
  } catch (err) {
    console.error('[GET_SERVICE_REQ_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve service request.' },
    });
  }
}

/**
 * PATCH /api/requests/services/:id/cancel
 * Requester cancels service request.
 */
export async function cancelServiceRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body || {};

    const [rows] = await executeQuery(
      `SELECT s.id, s.requester_user_id, s.status, s.business_profile_id, b.owner_user_id, s.listing_title_cached
       FROM service_requests s
       LEFT JOIN business_profiles b ON s.business_profile_id = b.id
       WHERE s.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'REQUEST_NOT_FOUND', message: 'Service request not found.' },
      });
    }

    const s = rows[0];

    if (s.requester_user_id !== userId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only cancel your own service requests.' },
      });
    }

    if (!['pending', 'accepted'].includes(s.status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot cancel a service request that is already ${s.status}.`,
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE service_requests 
         SET status = 'cancelled', cancellation_reason = ?, updated_at = NOW() 
         WHERE id = ?`,
        [reason || 'Cancelled by requester', id]
      );

      await recordStatusHistory(conn, {
        requestType: 'service_request',
        requestId: id,
        fromStatus: s.status,
        toStatus: 'cancelled',
        actorUserId: userId,
        actorRole: 'requester',
        reason: reason || 'Cancelled by requester',
      });

      if (s.owner_user_id) {
        await createNotification(conn, {
          userId: s.owner_user_id,
          actorUserId: userId,
          notificationType: 'service_request_cancelled',
          title: 'Service Request Cancelled',
          message: `Requester cancelled service request for "${s.listing_title_cached}".`,
          targetType: 'service_request',
          targetId: id,
        });
      }

      await conn.commit();

      return res.json({
        success: true,
        message: 'Service request cancelled.',
        status: 'cancelled',
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[CANCEL_SERVICE_REQ_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel service request.' },
    });
  }
}

/**
 * PATCH /api/requests/services/:id/status
 * Provider transitions status: accepted, in_progress, completed, rejected.
 */
export async function updateServiceRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status: targetStatus, reason, notes } = req.body;

    const allowedTransitions = {
      pending: ['accepted', 'rejected'],
      accepted: ['in_progress', 'rejected', 'cancelled'],
      in_progress: ['completed'],
    };

    const [rows] = await executeQuery(
      `SELECT s.id, s.requester_user_id, s.status, s.listing_title_cached, s.business_profile_id 
       FROM service_requests s
       WHERE s.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'REQUEST_NOT_FOUND', message: 'Service request not found.' },
      });
    }

    const s = rows[0];

    const perm = await checkBusinessPermission(s.business_profile_id, userId, 'enquiries.respond');
    if (!perm.allowed) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You lack permission to update service request status.' },
      });
    }

    const validNextStatuses = allowedTransitions[s.status] || [];
    if (!validNextStatuses.includes(targetStatus)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition service request status from '${s.status}' to '${targetStatus}'. Allowed: ${validNextStatuses.join(', ')}.`,
        },
      });
    }

    if (targetStatus === 'rejected' && (!reason || reason.trim().length < 3)) {
      return res.status(400).json({
        error: {
          code: 'REJECTION_REASON_REQUIRED',
          message: 'Please provide a clear reason for declining the service request.',
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE service_requests 
         SET status = ?, 
             rejection_reason = CASE WHEN ? = 'rejected' THEN ? ELSE rejection_reason END,
             provider_notes = COALESCE(?, provider_notes),
             updated_at = NOW() 
         WHERE id = ?`,
        [targetStatus, targetStatus, reason || null, notes || null, id]
      );

      await recordStatusHistory(conn, {
        requestType: 'service_request',
        requestId: id,
        fromStatus: s.status,
        toStatus: targetStatus,
        actorUserId: userId,
        actorRole: perm.isOwner ? 'provider_owner' : 'provider_team',
        reason: reason || `Status updated to ${targetStatus} by provider`,
        metadata: notes ? { providerNotes: notes } : null,
      });

      const titles = {
        accepted: 'Service Booking Confirmed!',
        in_progress: 'Service Work In Progress',
        completed: 'Service Marked as Completed',
        rejected: 'Service Request Declined',
      };

      await createNotification(conn, {
        userId: s.requester_user_id,
        actorUserId: userId,
        notificationType: `service_request_${targetStatus}`,
        title: titles[targetStatus] || 'Service Status Update',
        message: `Your request for "${s.listing_title_cached}" was updated to ${targetStatus}.`,
        targetType: 'service_request',
        targetId: id,
      });

      await conn.commit();

      return res.json({
        success: true,
        message: `Service request status updated to ${targetStatus}.`,
        status: targetStatus,
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[UPDATE_SERVICE_REQ_STATUS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update service request status.' },
    });
  }
}
