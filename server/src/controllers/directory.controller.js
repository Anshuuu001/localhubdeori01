import { executeQuery } from '../config/database.js';

/**
 * Public Business Directory Listing
 * Supports search, category filter, taluka area filter, verification status filter, and pagination.
 */
export async function listDirectoryBusinesses(req, res) {
  try {
    const {
      category,
      areaId,
      search,
      verificationStatus,
      sort = 'recommended',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ["bp.status = 'active'"];
    const params = [];

    // Filter by category
    if (category && category !== 'All') {
      conditions.push('bp.category = ?');
      params.push(category);
    }

    // Filter by taluka area
    if (areaId && areaId !== 'all') {
      conditions.push('(bp.taluka_area_id = ? OR bb.taluka_area_id = ?)');
      params.push(areaId, areaId);
    }

    // Filter by verification status (e.g. 'verified')
    if (verificationStatus && verificationStatus !== 'all') {
      conditions.push('bp.verification_status = ?');
      params.push(verificationStatus);
    }

    // Search by name or description
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push('(bp.name LIKE ? OR bp.description LIKE ? OR bp.category LIKE ?)');
      params.push(q, q, q);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Order by: verified first, then newest
    let orderBy = 'FIELD(bp.verification_status, "verified", "pending", "unverified", "rejected"), bp.created_at DESC';
    if (sort === 'alpha') {
      orderBy = 'bp.name ASC';
    } else if (sort === 'newest') {
      orderBy = 'bp.created_at DESC';
    }

    // Total count
    const [countRows] = await executeQuery(
      `SELECT COUNT(DISTINCT bp.id) AS total
       FROM business_profiles bp
       LEFT JOIN business_branches bb ON bp.id = bb.business_profile_id AND bb.is_active = TRUE
       ${whereClause}`,
      params
    );

    const totalCount = countRows[0]?.total || 0;

    // Fetch businesses with branch count
    const [rows] = await executeQuery(
      `SELECT 
        bp.id,
        bp.name,
        bp.business_type,
        bp.category,
        bp.description,
        bp.address_line1,
        bp.taluka_area_id,
        bp.verification_status,
        bp.operating_hours,
        bp.logo_url,
        bp.banner_url,
        bp.photos,
        bp.is_phone_public,
        bp.is_email_public,
        CASE WHEN bp.is_phone_public = TRUE THEN bp.phone ELSE NULL END AS phone,
        CASE WHEN bp.is_email_public = TRUE THEN bp.email ELSE NULL END AS email,
        bp.whatsapp_number,
        bp.website,
        bp.created_at,
        bp.updated_at,
        ta.name AS area_name,
        ta.marathi_name AS area_marathi_name,
        COUNT(DISTINCT bb.id) AS active_branches_count,
        COUNT(DISTINCT l.id) AS published_listings_count
       FROM business_profiles bp
       LEFT JOIN taluka_areas ta ON bp.taluka_area_id = ta.id
       LEFT JOIN business_branches bb ON bp.id = bb.business_profile_id AND bb.is_active = TRUE
       LEFT JOIN listings l ON bp.id = l.business_profile_id AND l.status = 'published'
       ${whereClause}
       GROUP BY bp.id
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const businesses = rows.map((b) => {
      let photos = [];
      try {
        photos = typeof b.photos === 'string' ? JSON.parse(b.photos) : b.photos || [];
      } catch {
        photos = [];
      }

      return {
        ...b,
        photos,
        isVerified: b.verification_status === 'verified',
        is_phone_public: Boolean(b.is_phone_public),
        is_email_public: Boolean(b.is_email_public),
      };
    });

    return res.json({
      businesses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    console.error('[LIST_DIRECTORY_BUSINESSES_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve business directory entries.' },
    });
  }
}

/**
 * Public Business Directory Entry Detail by ID
 * Includes branches, public contact settings, and published catalog listings.
 */
export async function getDirectoryBusinessById(req, res) {
  try {
    const { id } = req.params;

    const [bizRows] = await executeQuery(
      `SELECT 
        bp.id,
        bp.name,
        bp.business_type,
        bp.category,
        bp.description,
        bp.address_line1,
        bp.taluka_area_id,
        bp.verification_status,
        bp.verification_notes,
        bp.operating_hours,
        bp.logo_url,
        bp.banner_url,
        bp.photos,
        bp.is_phone_public,
        bp.is_email_public,
        CASE WHEN bp.is_phone_public = TRUE THEN bp.phone ELSE NULL END AS phone,
        CASE WHEN bp.is_email_public = TRUE THEN bp.email ELSE NULL END AS email,
        bp.whatsapp_number,
        bp.website,
        bp.created_at,
        bp.updated_at,
        ta.name AS area_name,
        ta.marathi_name AS area_marathi_name
       FROM business_profiles bp
       LEFT JOIN taluka_areas ta ON bp.taluka_area_id = ta.id
       WHERE bp.id = ? AND bp.status = 'active'`,
      [id]
    );

    if (bizRows.length === 0) {
      return res.status(404).json({
        error: { code: 'BUSINESS_NOT_FOUND', message: 'Business directory entry not found or inactive.' },
      });
    }

    const business = bizRows[0];

    // Fetch all active branches
    const [branches] = await executeQuery(
      `SELECT 
        bb.id,
        bb.branch_name,
        bb.taluka_area_id,
        bb.address,
        bb.phone,
        bb.email,
        bb.whatsapp_number,
        bb.operating_hours,
        bb.is_headquarters,
        ta.name AS area_name,
        ta.marathi_name AS area_marathi_name
       FROM business_branches bb
       LEFT JOIN taluka_areas ta ON bb.taluka_area_id = ta.id
       WHERE bb.business_profile_id = ? AND bb.is_active = TRUE
       ORDER BY bb.is_headquarters DESC, bb.created_at ASC`,
      [id]
    );

    // Fetch all published listings by this business across all modules
    const [listings] = await executeQuery(
      `SELECT 
        l.id,
        l.module,
        l.title,
        l.category,
        l.description,
        l.price,
        l.price_period,
        l.availability_status,
        l.photos,
        l.created_at,
        ta.name AS area_name
       FROM listings l
       LEFT JOIN taluka_areas ta ON l.taluka_area_id = ta.id
       WHERE l.business_profile_id = ? AND l.status = 'published'
       ORDER BY l.created_at DESC`,
      [id]
    );

    const parsedListings = listings.map((l) => {
      let photos = [];
      try {
        photos = typeof l.photos === 'string' ? JSON.parse(l.photos) : l.photos || [];
      } catch {
        photos = [];
      }
      return {
        ...l,
        photos,
      };
    });

    let photos = [];
    try {
      photos = typeof business.photos === 'string' ? JSON.parse(business.photos) : business.photos || [];
    } catch {
      photos = [];
    }

    return res.json({
      business: {
        ...business,
        photos,
        isVerified: business.verification_status === 'verified',
        is_phone_public: Boolean(business.is_phone_public),
        is_email_public: Boolean(business.is_email_public),
        branches,
        listings: parsedListings,
        verificationDisclaimer:
          business.verification_status === 'verified'
            ? 'Verified Badge confirms registered commercial presence in Deori Taluka. Verification does not imply guarantee of merchandise quality or financial solvency.'
            : 'This business has not completed identity verification. Please exercise normal commercial prudence.',
      },
    });
  } catch (err) {
    console.error('[GET_DIRECTORY_BUSINESS_BY_ID_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve business directory entry.' },
    });
  }
}
