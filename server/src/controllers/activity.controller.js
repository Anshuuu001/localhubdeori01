import { executeQuery } from '../config/database.js';

/**
 * GET /api/activity/my-activity
 * Aggregates all requests initiated by the authenticated user across:
 * - Job Applications
 * - Listing Enquiries
 * - Local Service Requests
 * - Transit Requests (Rides & Deliveries)
 */
export async function getMyActivity(req, res) {
  try {
    const userId = req.user.id;
    const {
      type = 'all', // 'all' | 'jobs' | 'enquiries' | 'services' | 'rides' | 'deliveries'
      status = 'all', // 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'
      sort = 'newest',
      search = '',
      page = 1,
      limit = 15,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;
    const searchPattern = search ? `%${search.trim().toLowerCase()}%` : null;

    // Build subqueries with consistent column projections:
    // id, item_type, reference_id, title, counterparty_name, status, status_group,
    // listing_status, listing_availability, created_at, updated_at, details_snippet

    const subqueries = [];

    // 1. Job Applications
    if (type === 'all' || type === 'jobs') {
      subqueries.push(`
        SELECT 
          a.id AS id,
          'jobs' AS item_type,
          CONCAT('JOB-', UPPER(SUBSTRING(a.id, 1, 6))) AS reference_id,
          a.listing_title_cached AS title,
          COALESCE(b.name, 'Deori Employer') AS counterparty_name,
          a.status AS status,
          CASE 
            WHEN a.status = 'submitted' THEN 'pending'
            WHEN a.status = 'shortlisted' THEN 'in_progress'
            WHEN a.status = 'hired' THEN 'completed'
            WHEN a.status IN ('rejected', 'withdrawn') THEN 'cancelled'
            ELSE 'other'
          END AS status_group,
          COALESCE(l.status, 'deleted') AS listing_status,
          COALESCE(l.availability_status, 'unavailable') AS listing_availability,
          a.created_at AS created_at,
          a.updated_at AS updated_at,
          COALESCE(a.cover_note, a.qualifications, 'Direct Application') AS details_snippet,
          a.listing_id AS listing_id
        FROM job_applications a
        LEFT JOIN business_profiles b ON a.business_profile_id = b.id
        LEFT JOIN listings l ON a.listing_id = l.id
        WHERE a.applicant_user_id = '${userId}'
      `);
    }

    // 2. Listing Enquiries
    if (type === 'all' || type === 'enquiries') {
      subqueries.push(`
        SELECT 
          e.id AS id,
          'enquiries' AS item_type,
          CONCAT('ENQ-', UPPER(SUBSTRING(e.id, 1, 6))) AS reference_id,
          e.listing_title_cached AS title,
          COALESCE(b.name, 'Listing Owner') AS counterparty_name,
          e.status AS status,
          CASE 
            WHEN e.status = 'sent' THEN 'pending'
            WHEN e.status IN ('viewed', 'responded') THEN 'in_progress'
            WHEN e.status = 'closed' THEN 'completed'
            WHEN e.status = 'cancelled' THEN 'cancelled'
            ELSE 'other'
          END AS status_group,
          COALESCE(l.status, 'deleted') AS listing_status,
          COALESCE(l.availability_status, 'unavailable') AS listing_availability,
          e.created_at AS created_at,
          e.updated_at AS updated_at,
          e.message AS details_snippet,
          e.listing_id AS listing_id
        FROM listing_enquiries e
        LEFT JOIN business_profiles b ON e.business_profile_id = b.id
        LEFT JOIN listings l ON e.listing_id = l.id
        WHERE e.requester_user_id = '${userId}'
      `);
    }

    // 3. Local Service Requests
    if (type === 'all' || type === 'services') {
      subqueries.push(`
        SELECT 
          s.id AS id,
          'services' AS item_type,
          CONCAT('SRV-', UPPER(SUBSTRING(s.id, 1, 6))) AS reference_id,
          s.listing_title_cached AS title,
          COALESCE(b.name, 'Service Technician') AS counterparty_name,
          s.status AS status,
          CASE 
            WHEN s.status = 'pending' THEN 'pending'
            WHEN s.status IN ('accepted', 'in_progress') THEN 'in_progress'
            WHEN s.status = 'completed' THEN 'completed'
            WHEN s.status IN ('rejected', 'cancelled') THEN 'cancelled'
            ELSE 'other'
          END AS status_group,
          COALESCE(l.status, 'deleted') AS listing_status,
          COALESCE(l.availability_status, 'unavailable') AS listing_availability,
          s.created_at AS created_at,
          s.updated_at AS updated_at,
          s.service_description AS details_snippet,
          s.listing_id AS listing_id
        FROM service_requests s
        LEFT JOIN business_profiles b ON s.business_profile_id = b.id
        LEFT JOIN listings l ON s.listing_id = l.id
        WHERE s.requester_user_id = '${userId}'
      `);
    }

    // 4. Transit Requests (Rides & Deliveries)
    if (type === 'all' || type === 'rides' || type === 'deliveries') {
      let transitTypeFilter = '';
      if (type === 'rides') transitTypeFilter = ` AND t.request_type = 'ride'`;
      if (type === 'deliveries') transitTypeFilter = ` AND t.request_type = 'delivery'`;

      subqueries.push(`
        SELECT 
          t.id AS id,
          CASE WHEN t.request_type = 'ride' THEN 'rides' ELSE 'deliveries' END AS item_type,
          CONCAT(CASE WHEN t.request_type = 'ride' THEN 'RIDE-' ELSE 'DEL-' END, UPPER(SUBSTRING(t.id, 1, 6))) AS reference_id,
          CONCAT(t.pickup_address, ' → ', t.dropoff_address) AS title,
          COALESCE(b.name, 'Local Transport Stand') AS counterparty_name,
          t.status AS status,
          CASE 
            WHEN t.status = 'pending' THEN 'pending'
            WHEN t.status IN ('accepted', 'in_progress') THEN 'in_progress'
            WHEN t.status = 'completed' THEN 'completed'
            WHEN t.status IN ('rejected', 'cancelled', 'expired') THEN 'cancelled'
            ELSE 'other'
          END AS status_group,
          'published' AS listing_status,
          'available' AS listing_availability,
          t.created_at AS created_at,
          t.updated_at AS updated_at,
          COALESCE(t.notes, t.parcel_description, 'Local Transit Request') AS details_snippet,
          NULL AS listing_id
        FROM transit_requests t
        LEFT JOIN business_profiles b ON t.provider_business_id = b.id
        WHERE t.requester_user_id = '${userId}'${transitTypeFilter}
      `);
    }

    if (subqueries.length === 0) {
      return res.json({
        items: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
        summary: { total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 },
      });
    }

    const unionSql = subqueries.join(' UNION ALL ');

    // Filter by status group if specified
    let filterClause = '';
    const filterParams = [];

    if (status !== 'all') {
      filterClause += ` WHERE status_group = ?`;
      filterParams.push(status);
    }

    if (searchPattern) {
      filterClause += filterClause ? ' AND' : ' WHERE';
      filterClause += ` (LOWER(title) LIKE ? OR LOWER(counterparty_name) LIKE ? OR LOWER(reference_id) LIKE ?)`;
      filterParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Count query
    const countSql = `SELECT COUNT(*) AS total_count FROM (${unionSql}) AS combined ${filterClause}`;
    const [countRows] = await executeQuery(countSql, filterParams);
    const totalCount = countRows[0]?.total_count || 0;

    // Summary counts query across all categories for user
    const allUnionSql = `
      SELECT status_group FROM (${subqueries.join(' UNION ALL ')}) AS all_combined
    `;
    const [allStatusRows] = await executeQuery(allUnionSql);
    const summary = {
      total: allStatusRows.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of allStatusRows) {
      if (row.status_group === 'pending') summary.pending++;
      else if (row.status_group === 'in_progress') summary.inProgress++;
      else if (row.status_group === 'completed') summary.completed++;
      else if (row.status_group === 'cancelled') summary.cancelled++;
    }

    // Items query with sorting
    const orderDirection = sort === 'oldest' ? 'ASC' : 'DESC';
    const itemsSql = `
      SELECT * FROM (${unionSql}) AS combined
      ${filterClause}
      ORDER BY created_at ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    const [items] = await executeQuery(itemsSql, [...filterParams, limitNum, offset]);

    return res.json({
      items: items.map(i => ({
        id: i.id,
        itemType: i.item_type,
        referenceId: i.reference_id,
        title: i.title,
        counterpartyName: i.counterparty_name,
        status: i.status,
        statusGroup: i.status_group,
        listingStatus: i.listing_status,
        listingAvailability: i.listing_availability,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        detailsSnippet: i.details_snippet,
        listingId: i.listing_id,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      summary,
    });
  } catch (err) {
    console.error('[GET_MY_ACTIVITY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve user activity.' },
    });
  }
}
