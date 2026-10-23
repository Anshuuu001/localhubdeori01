import { executeQuery } from '../config/database.js';

/**
 * GET /api/business/:businessId/requests
 * Aggregates all incoming customer requests & applications directed to this business.
 * Requires business permission 'enquiries.view'.
 */
export async function getBusinessRequests(req, res) {
  try {
    const { businessId } = req.params;
    const {
      type = 'all', // 'all' | 'jobs' | 'enquiries' | 'services' | 'transit'
      status = 'all',
      sort = 'newest',
      page = 1,
      limit = 15,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const subqueries = [];

    // 1. Job Applications
    if (type === 'all' || type === 'jobs') {
      subqueries.push(`
        SELECT 
          a.id AS id,
          'jobs' AS item_type,
          CONCAT('JOB-', UPPER(SUBSTRING(a.id, 1, 6))) AS reference_id,
          a.listing_title_cached AS title,
          a.applicant_name AS customer_name,
          a.applicant_phone AS customer_phone,
          a.applicant_email AS customer_email,
          a.status AS status,
          a.cover_note AS customer_message,
          a.created_at AS created_at,
          a.updated_at AS updated_at,
          a.listing_id AS listing_id
        FROM job_applications a
        WHERE a.business_profile_id = '${businessId}'
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
          u.full_name AS customer_name,
          e.contact_phone AS customer_phone,
          e.contact_email AS customer_email,
          e.status AS status,
          e.message AS customer_message,
          e.created_at AS created_at,
          e.updated_at AS updated_at,
          e.listing_id AS listing_id
        FROM listing_enquiries e
        LEFT JOIN users u ON e.requester_user_id = u.id
        WHERE e.business_profile_id = '${businessId}'
      `);
    }

    // 3. Service Requests
    if (type === 'all' || type === 'services') {
      subqueries.push(`
        SELECT 
          s.id AS id,
          'services' AS item_type,
          CONCAT('SRV-', UPPER(SUBSTRING(s.id, 1, 6))) AS reference_id,
          s.listing_title_cached AS title,
          s.contact_name AS customer_name,
          s.contact_phone AS customer_phone,
          NULL AS customer_email,
          s.status AS status,
          s.service_description AS customer_message,
          s.created_at AS created_at,
          s.updated_at AS updated_at,
          s.listing_id AS listing_id
        FROM service_requests s
        WHERE s.business_profile_id = '${businessId}'
      `);
    }

    // 4. Transit Requests
    if (type === 'all' || type === 'transit') {
      subqueries.push(`
        SELECT 
          t.id AS id,
          CASE WHEN t.request_type = 'ride' THEN 'rides' ELSE 'deliveries' END AS item_type,
          CONCAT(CASE WHEN t.request_type = 'ride' THEN 'RIDE-' ELSE 'DEL-' END, UPPER(SUBSTRING(t.id, 1, 6))) AS reference_id,
          CONCAT(t.pickup_address, ' → ', t.dropoff_address) AS title,
          t.contact_name AS customer_name,
          t.contact_phone AS customer_phone,
          NULL AS customer_email,
          t.status AS status,
          COALESCE(t.notes, t.parcel_description) AS customer_message,
          t.created_at AS created_at,
          t.updated_at AS updated_at,
          NULL AS listing_id
        FROM transit_requests t
        WHERE t.provider_business_id = '${businessId}'
      `);
    }

    if (subqueries.length === 0) {
      return res.json({
        items: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
        summary: { total: 0, unhandled: 0, active: 0, completed: 0 },
      });
    }

    const unionSql = subqueries.join(' UNION ALL ');

    let filterClause = '';
    const filterParams = [];

    if (status !== 'all') {
      filterClause += ` WHERE status = ?`;
      filterParams.push(status);
    }

    const countSql = `SELECT COUNT(*) AS total_count FROM (${unionSql}) AS combined ${filterClause}`;
    const [countRows] = await executeQuery(countSql, filterParams);
    const totalCount = countRows[0]?.total_count || 0;

    // Summary counts
    const [allStatusRows] = await executeQuery(`SELECT status FROM (${unionSql}) AS all_combined`);
    const summary = {
      total: allStatusRows.length,
      unhandled: 0,
      active: 0,
      completed: 0,
    };
    for (const row of allStatusRows) {
      if (['submitted', 'sent', 'pending'].includes(row.status)) {
        summary.unhandled++;
      } else if (['viewed', 'shortlisted', 'accepted', 'in_progress', 'responded'].includes(row.status)) {
        summary.active++;
      } else if (['hired', 'completed', 'closed'].includes(row.status)) {
        summary.completed++;
      }
    }

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
        customerName: i.customer_name,
        customerPhone: i.customer_phone,
        customerEmail: i.customer_email,
        status: i.status,
        customerMessage: i.customer_message,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
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
    console.error('[GET_BUSINESS_REQUESTS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve business requests.' },
    });
  }
}
