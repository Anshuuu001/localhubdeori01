import crypto from 'crypto';

/**
 * Records an immutable status transition record in request_status_history.
 * Must be executed within a database transaction connection.
 * 
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {Object} params
 * @param {string} params.requestType - 'job_application' | 'listing_enquiry' | 'service_request' | 'transit_request'
 * @param {string} params.requestId
 * @param {string|null} params.fromStatus
 * @param {string} params.toStatus
 * @param {string} params.actorUserId
 * @param {string} params.actorRole - 'applicant' | 'requester' | 'provider_owner' | 'provider_team' | 'system'
 * @param {string|null} [params.reason]
 * @param {Object|null} [params.metadata]
 */
export async function recordStatusHistory(connection, {
  requestType,
  requestId,
  fromStatus,
  toStatus,
  actorUserId,
  actorRole,
  reason = null,
  metadata = null,
}) {
  const historyId = crypto.randomUUID();
  const metaJson = metadata ? JSON.stringify(metadata) : null;

  await connection.execute(
    `INSERT INTO request_status_history (
      id,
      request_type,
      request_id,
      from_status,
      to_status,
      actor_user_id,
      actor_role,
      reason,
      metadata,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      historyId,
      requestType,
      requestId,
      fromStatus,
      toStatus,
      actorUserId,
      actorRole,
      reason,
      metaJson,
    ]
  );

  return historyId;
}

/**
 * Retrieves the full status history timeline for a request.
 * 
 * @param {import('mysql2/promise').Pool} poolOrConn
 * @param {string} requestType
 * @param {string} requestId
 */
export async function getStatusHistory(poolOrConn, requestType, requestId) {
  const [rows] = await poolOrConn.query(
    `SELECT 
      h.id,
      h.request_type,
      h.request_id,
      h.from_status,
      h.to_status,
      h.actor_user_id,
      h.actor_role,
      h.reason,
      h.metadata,
      h.created_at,
      u.full_name AS actor_name
    FROM request_status_history h
    LEFT JOIN users u ON h.actor_user_id = u.id
    WHERE h.request_type = ? AND h.request_id = ?
    ORDER BY h.created_at ASC`,
    [requestType, requestId]
  );

  return rows.map(r => ({
    id: r.id,
    requestType: r.request_type,
    requestId: r.request_id,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    actorUserId: r.actor_user_id,
    actorRole: r.actor_role,
    actorName: r.actor_name || 'System / User',
    reason: r.reason,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
    createdAt: r.created_at,
  }));
}
