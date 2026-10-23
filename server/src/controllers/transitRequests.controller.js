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
 * Checks and updates expired pending transit requests.
 */
async function checkAndApplyExpiry(transitRequest, conn) {
  if (transitRequest.status === 'pending' && new Date(transitRequest.expires_at) < new Date()) {
    await conn.execute(
      `UPDATE transit_requests SET status = 'expired', updated_at = NOW() WHERE id = ?`,
      [transitRequest.id]
    );

    await recordStatusHistory(conn, {
      requestType: 'transit_request',
      requestId: transitRequest.id,
      fromStatus: 'pending',
      toStatus: 'expired',
      actorUserId: transitRequest.requester_user_id,
      actorRole: 'system',
      reason: 'Request expired automatically according to 24-hour validity policy',
    });

    transitRequest.status = 'expired';
    return true;
  }
  return false;
}

/**
 * POST /api/requests/transit
 * Submit a local ride or parcel delivery request.
 */
export async function submitTransitRequest(req, res) {
  try {
    const userId = req.user.id;
    const {
      requestType, // 'ride' | 'delivery'
      pickupAreaId,
      pickupAddress,
      dropoffAreaId,
      dropoffAddress,
      scheduledDate,
      scheduledTime,
      passengerCount,
      parcelCategory,
      parcelWeightKg,
      parcelDescription,
      recipientName,
      recipientPhone,
      contactName,
      contactPhone,
      contactPreference = 'phone',
      notes,
      providerBusinessId,
    } = req.body;

    const rateCheck = rateLimiter.consume('transit_req_submit', userId, 15, 60);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many transit requests. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        },
      });
    }

    if (!['ride', 'delivery'].includes(requestType)) {
      return res.status(400).json({
        error: { code: 'INVALID_TYPE', message: 'requestType must be either "ride" or "delivery".' },
      });
    }

    const cleanPickup = String(pickupAddress || '').trim();
    const cleanDropoff = String(dropoffAddress || '').trim();

    if (cleanPickup.length < 3 || cleanPickup.length > 255) {
      return res.status(400).json({
        error: { code: 'INVALID_PICKUP', message: 'Please specify a valid pickup landmark or address in Deori Taluka.' },
      });
    }

    if (cleanDropoff.length < 3 || cleanDropoff.length > 255) {
      return res.status(400).json({
        error: { code: 'INVALID_DROPOFF', message: 'Please specify a valid destination or drop-off address.' },
      });
    }

    const cleanName = String(contactName || req.user.fullName || '').trim();
    const cleanPhone = String(contactPhone || req.user.phone || '').trim();

    if (!cleanPhone || !/^\+?[0-9]{10,15}$/.test(cleanPhone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({
        error: { code: 'INVALID_PHONE', message: 'Valid 10-digit mobile number is required for driver coordination.' },
      });
    }

    // Type-specific validations
    let validPassengerCount = 1;
    let cleanParcelCategory = null;
    let cleanParcelWeight = null;
    let cleanParcelDesc = null;
    let cleanRecipientName = null;
    let cleanRecipientPhone = null;

    if (requestType === 'ride') {
      validPassengerCount = Math.max(1, Math.min(10, parseInt(passengerCount, 10) || 1));
    } else {
      cleanParcelDesc = String(parcelDescription || '').trim();
      if (cleanParcelDesc.length < 3) {
        return res.status(400).json({
          error: { code: 'INVALID_PARCEL_DESC', message: 'Please describe the parcel (e.g., agricultural seeds, documents, store goods).' },
        });
      }
      cleanParcelCategory = String(parcelCategory || 'general').trim();
      if (parcelWeightKg) cleanParcelWeight = parseFloat(parcelWeightKg) || null;

      cleanRecipientName = String(recipientName || '').trim();
      cleanRecipientPhone = String(recipientPhone || '').trim();
      if (cleanRecipientPhone && !/^\+?[0-9]{10,15}$/.test(cleanRecipientPhone.replace(/[\s-]/g, ''))) {
        return res.status(400).json({
          error: { code: 'INVALID_RECIPIENT_PHONE', message: 'Valid recipient mobile number is required.' },
        });
      }
    }

    // If specific transport provider targeted, verify existence
    let verifiedBusiness = null;
    if (providerBusinessId) {
      const [bizRows] = await executeQuery(
        'SELECT id, name, owner_user_id, status FROM business_profiles WHERE id = ?',
        [providerBusinessId]
      );
      if (bizRows.length === 0 || bizRows[0].status !== 'active') {
        return res.status(400).json({
          error: { code: 'PROVIDER_NOT_AVAILABLE', message: 'Selected transport or delivery provider is not currently active.' },
        });
      }
      verifiedBusiness = bizRows[0];
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const requestId = crypto.randomUUID();

      // Configurable expiry policy: default 24 hours from creation
      await conn.execute(
        `INSERT INTO transit_requests (
          id,
          request_type,
          requester_user_id,
          provider_business_id,
          pickup_area_id,
          pickup_address,
          dropoff_area_id,
          dropoff_address,
          scheduled_date,
          scheduled_time,
          passenger_count,
          parcel_category,
          parcel_weight_kg,
          parcel_description,
          recipient_name,
          recipient_phone,
          contact_name,
          contact_phone,
          contact_preference,
          notes,
          status,
          expires_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW(), NOW())`,
        [
          requestId,
          requestType,
          userId,
          providerBusinessId || null,
          pickupAreaId || null,
          cleanPickup,
          dropoffAreaId || null,
          cleanDropoff,
          scheduledDate || null,
          scheduledTime || null,
          requestType === 'ride' ? validPassengerCount : null,
          cleanParcelCategory,
          cleanParcelWeight,
          cleanParcelDesc,
          cleanRecipientName || null,
          cleanRecipientPhone || null,
          cleanName,
          cleanPhone,
          contactPreference,
          notes || null,
        ]
      );

      await recordStatusHistory(conn, {
        requestType: 'transit_request',
        requestId,
        fromStatus: null,
        toStatus: 'pending',
        actorUserId: userId,
        actorRole: 'requester',
        reason: `${requestType === 'ride' ? 'Ride' : 'Delivery'} request initiated`,
      });

      if (verifiedBusiness?.owner_user_id) {
        await createNotification(conn, {
          userId: verifiedBusiness.owner_user_id,
          actorUserId: userId,
          notificationType: `transit_${requestType}_created`,
          title: `New Local ${requestType === 'ride' ? 'Ride' : 'Delivery'} Request`,
          message: `${cleanName} requested ${requestType} from ${cleanPickup} to ${cleanDropoff}.`,
          targetType: 'transit_request',
          targetId: requestId,
        });
      }

      await conn.commit();

      return res.status(201).json({
        success: true,
        message: `Your ${requestType} request has been recorded. Operators will coordinate with you directly via phone.`,
        transitRequest: {
          id: requestId,
          requestType,
          status: 'pending',
          pickupAddress: cleanPickup,
          dropoffAddress: cleanDropoff,
          expiresInHours: 24,
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
    console.error('[SUBMIT_TRANSIT_REQ_ERROR]', err);
    return res.status(500).json({
      error: { code: 'REQUEST_FAILED', message: 'Failed to submit transit request. Please retry.' },
    });
  }
}

/**
 * GET /api/requests/transit/:id
 */
export async function getTransitRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      const [rows] = await conn.execute(
        `SELECT 
          t.id, t.request_type, t.requester_user_id, t.provider_business_id,
          t.pickup_area_id, t.pickup_address, t.dropoff_area_id, t.dropoff_address,
          t.scheduled_date, t.scheduled_time, t.passenger_count,
          t.parcel_category, t.parcel_weight_kg, t.parcel_description,
          t.recipient_name, t.recipient_phone, t.contact_name, t.contact_phone,
          t.contact_preference, t.notes, t.status, t.rejection_reason, t.cancellation_reason,
          t.expires_at, t.created_at, t.updated_at,
          b.name AS provider_business_name, b.owner_user_id AS business_owner_id,
          p_area.name AS pickup_area_name, p_area.marathi_name AS pickup_area_marathi,
          d_area.name AS dropoff_area_name, d_area.marathi_name AS dropoff_area_marathi,
          u.full_name AS requester_full_name
        FROM transit_requests t
        LEFT JOIN business_profiles b ON t.provider_business_id = b.id
        LEFT JOIN taluka_areas p_area ON t.pickup_area_id = p_area.id
        LEFT JOIN taluka_areas d_area ON t.dropoff_area_id = d_area.id
        LEFT JOIN users u ON t.requester_user_id = u.id
        WHERE t.id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: { code: 'REQUEST_NOT_FOUND', message: 'Transit request not found.' },
        });
      }

      const t = rows[0];

      // Check expiry automatically
      await checkAndApplyExpiry(t, conn);

      const isRequester = t.requester_user_id === userId;
      let isProvider = false;
      let canRespond = false;

      if (!isRequester) {
        if (t.provider_business_id) {
          const viewPerm = await checkBusinessPermission(t.provider_business_id, userId, 'enquiries.view');
          if (!viewPerm.allowed && t.business_owner_id !== userId) {
            return res.status(403).json({
              error: { code: 'FORBIDDEN', message: 'You are not authorized to view this transit request.' },
            });
          }
          isProvider = true;
          const respPerm = await checkBusinessPermission(t.provider_business_id, userId, 'enquiries.respond');
          canRespond = respPerm.allowed || t.business_owner_id === userId;
        } else {
          // Unassigned open transit request: accessible to verified transport businesses
          const [userBizList] = await conn.query(
            `SELECT b.id FROM business_profiles b WHERE b.owner_user_id = ? AND b.status = 'active'`,
            [userId]
          );
          if (userBizList.length > 0) {
            isProvider = true;
            canRespond = true; // Can claim / accept
          } else {
            return res.status(403).json({
              error: { code: 'FORBIDDEN', message: 'You are not authorized to view this transit request.' },
            });
          }
        }
      }

      const history = await getStatusHistory(conn, 'transit_request', id);

      return res.json({
        transitRequest: {
          id: t.id,
          requestType: t.request_type,
          providerBusinessId: t.provider_business_id,
          providerBusinessName: t.provider_business_name || 'Open Local Dispatch Pool',
          pickupAreaName: t.pickup_area_name || 'Deori Taluka',
          pickupAreaMarathi: t.pickup_area_marathi,
          pickupAddress: t.pickup_address,
          dropoffAreaName: t.dropoff_area_name || 'Deori Taluka',
          dropoffAreaMarathi: t.dropoff_area_marathi,
          dropoffAddress: t.dropoff_address,
          scheduledDate: t.scheduled_date,
          scheduledTime: t.scheduled_time,
          passengerCount: t.passenger_count,
          parcelCategory: t.parcel_category,
          parcelWeightKg: t.parcel_weight_kg,
          parcelDescription: t.parcel_description,
          recipientName: t.recipient_name,
          recipientPhone: t.recipient_phone,
          contactName: t.contact_name,
          contactPhone: t.contact_phone,
          contactPreference: t.contact_preference,
          notes: t.notes,
          status: t.status,
          rejectionReason: t.rejection_reason,
          cancellationReason: t.cancellation_reason,
          expiresAt: t.expires_at,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          userRole: isRequester ? 'requester' : 'provider',
          canRespond,
        },
        history,
      });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[GET_TRANSIT_REQ_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve transit request.' },
    });
  }
}

/**
 * PATCH /api/requests/transit/:id/cancel
 * Requester cancels transit request.
 */
export async function cancelTransitRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body || {};

    const [rows] = await executeQuery(
      `SELECT t.id, t.requester_user_id, t.status, t.request_type, t.provider_business_id, b.owner_user_id
       FROM transit_requests t
       LEFT JOIN business_profiles b ON t.provider_business_id = b.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'REQUEST_NOT_FOUND', message: 'Transit request not found.' },
      });
    }

    const t = rows[0];

    if (t.requester_user_id !== userId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only cancel your own transit requests.' },
      });
    }

    if (!['pending', 'accepted'].includes(t.status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot cancel a transit request that is ${t.status}.`,
        },
      });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE transit_requests 
         SET status = 'cancelled', cancellation_reason = ?, updated_at = NOW() 
         WHERE id = ?`,
        [reason || 'Cancelled by requester', id]
      );

      await recordStatusHistory(conn, {
        requestType: 'transit_request',
        requestId: id,
        fromStatus: t.status,
        toStatus: 'cancelled',
        actorUserId: userId,
        actorRole: 'requester',
        reason: reason || 'Cancelled by requester',
      });

      if (t.owner_user_id) {
        await createNotification(conn, {
          userId: t.owner_user_id,
          actorUserId: userId,
          notificationType: `transit_${t.request_type}_cancelled`,
          title: `${t.request_type === 'ride' ? 'Ride' : 'Delivery'} Request Cancelled`,
          message: `Requester cancelled their ${t.request_type} booking.`,
          targetType: 'transit_request',
          targetId: id,
        });
      }

      await conn.commit();

      return res.json({
        success: true,
        message: 'Transit request cancelled.',
        status: 'cancelled',
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[CANCEL_TRANSIT_REQ_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel transit request.' },
    });
  }
}

/**
 * PATCH /api/requests/transit/:id/status
 * Provider transitions status: accepted, in_progress, completed, rejected.
 */
export async function updateTransitRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status: targetStatus, reason, businessId } = req.body;

    const allowedTransitions = {
      pending: ['accepted', 'rejected'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed'],
    };

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        `SELECT t.id, t.requester_user_id, t.status, t.request_type, t.provider_business_id, t.expires_at 
         FROM transit_requests t
         WHERE t.id = ? FOR UPDATE`,
        [id]
      );

      if (rows.length === 0) {
        await conn.rollback();
        return res.status(404).json({
          error: { code: 'REQUEST_NOT_FOUND', message: 'Transit request not found.' },
        });
      }

      const t = rows[0];

      // Auto expiry check
      if (t.status === 'pending' && new Date(t.expires_at) < new Date()) {
        await conn.execute(
          `UPDATE transit_requests SET status = 'expired', updated_at = NOW() WHERE id = ?`,
          [id]
        );
        await conn.commit();
        return res.status(400).json({
          error: { code: 'REQUEST_EXPIRED', message: 'This transit request has expired and can no longer be accepted.' },
        });
      }

      // Check provider authorization
      let effectiveBizId = t.provider_business_id || businessId;
      if (!effectiveBizId) {
        // Find user's active business
        const [userBizList] = await conn.query(
          `SELECT b.id FROM business_profiles b WHERE b.owner_user_id = ? AND b.status = 'active' LIMIT 1`,
          [userId]
        );
        if (userBizList.length > 0) {
          effectiveBizId = userBizList[0].id;
        } else {
          await conn.rollback();
          return res.status(403).json({
            error: { code: 'NO_BUSINESS_PROFILE', message: 'A registered business profile is required to accept transport requests.' },
          });
        }
      }

      const perm = await checkBusinessPermission(effectiveBizId, userId, 'enquiries.respond');
      if (!perm.allowed) {
        await conn.rollback();
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You lack permission to manage transit requests.' },
        });
      }

      const validNextStatuses = allowedTransitions[t.status] || [];
      if (!validNextStatuses.includes(targetStatus)) {
        await conn.rollback();
        return res.status(400).json({
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot transition transit request from '${t.status}' to '${targetStatus}'. Allowed: ${validNextStatuses.join(', ')}.`,
          },
        });
      }

      if (targetStatus === 'rejected' && (!reason || reason.trim().length < 3)) {
        await conn.rollback();
        return res.status(400).json({
          error: {
            code: 'REJECTION_REASON_REQUIRED',
            message: 'Please provide a reason for declining the transport request.',
          },
        });
      }

      // Update record (and bind provider_business_id if it was unassigned)
      await conn.execute(
        `UPDATE transit_requests 
         SET status = ?, 
             provider_business_id = COALESCE(provider_business_id, ?),
             rejection_reason = CASE WHEN ? = 'rejected' THEN ? ELSE rejection_reason END,
             updated_at = NOW() 
         WHERE id = ?`,
        [targetStatus, effectiveBizId, targetStatus, reason || null, id]
      );

      await recordStatusHistory(conn, {
        requestType: 'transit_request',
        requestId: id,
        fromStatus: t.status,
        toStatus: targetStatus,
        actorUserId: userId,
        actorRole: perm.isOwner ? 'provider_owner' : 'provider_team',
        reason: reason || `Status updated to ${targetStatus} by transport provider`,
        metadata: { providerBusinessId: effectiveBizId },
      });

      const titles = {
        accepted: `${t.request_type === 'ride' ? 'Ride' : 'Delivery'} Request Accepted!`,
        in_progress: `${t.request_type === 'ride' ? 'Driver is En Route' : 'Parcel is In Transit'}`,
        completed: `${t.request_type === 'ride' ? 'Ride' : 'Delivery'} Marked as Completed`,
        rejected: `${t.request_type === 'ride' ? 'Ride' : 'Delivery'} Request Declined`,
      };

      await createNotification(conn, {
        userId: t.requester_user_id,
        actorUserId: userId,
        notificationType: `transit_${targetStatus}`,
        title: titles[targetStatus] || 'Transit Status Update',
        message: `Your ${t.request_type} request was updated to ${targetStatus}.`,
        targetType: 'transit_request',
        targetId: id,
      });

      await conn.commit();

      return res.json({
        success: true,
        message: `Transit request status updated to ${targetStatus}.`,
        status: targetStatus,
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[UPDATE_TRANSIT_REQ_STATUS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update transit request status.' },
    });
  }
}
