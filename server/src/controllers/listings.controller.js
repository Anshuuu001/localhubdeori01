import crypto from 'crypto';
import { executeQuery, getPool } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';

// Valid listing modules
const VALID_MODULES = new Set([
  'jobs',
  'rentals',
  'marketplace',
  'krishi_products',
  'krishi_equipment',
  'services',
]);

/**
 * Helper to check whether an authenticated user has listing management permission
 * for a specific business profile.
 */
async function verifyBusinessListingPermission(businessId, userId, requiredPermission = 'listings.manage') {
  const [bizRows] = await executeQuery(
    'SELECT id, name, owner_user_id, status, verification_status FROM business_profiles WHERE id = ?',
    [businessId]
  );

  if (bizRows.length === 0) {
    return { allowed: false, code: 'BUSINESS_NOT_FOUND', message: 'Business profile not found.' };
  }

  const business = bizRows[0];
  if (business.status !== 'active') {
    return { allowed: false, code: 'BUSINESS_INACTIVE', message: 'This business profile is not currently active.' };
  }

  // Owner always has full permission
  if (business.owner_user_id === userId) {
    return { allowed: true, business, role: 'owner' };
  }

  // Check team membership and granular role permissions
  const [memberRows] = await executeQuery(
    `SELECT m.id, m.role_id, r.name AS role_name
     FROM business_memberships m
     JOIN roles r ON m.role_id = r.id
     WHERE m.business_profile_id = ? AND m.user_id = ? AND m.status = 'active'`,
    [businessId, userId]
  );

  if (memberRows.length === 0) {
    return { allowed: false, code: 'FORBIDDEN', message: 'You are not an authorized member of this business.' };
  }

  const [permRows] = await executeQuery(
    'SELECT permission_id FROM role_permissions WHERE role_id = ? AND permission_id = ?',
    [memberRows[0].role_id, requiredPermission]
  );

  if (permRows.length === 0) {
    return {
      allowed: false,
      code: 'INSUFFICIENT_PERMISSIONS',
      message: `Your business role lacks the required '${requiredPermission}' permission.`,
    };
  }

  return { allowed: true, business, role: memberRows[0].role_id };
}

/**
 * Public Browse / Search / Filter Listings
 * Strict policy: Returns ONLY published listings.
 */
export async function listPublicListings(req, res) {
  try {
    const {
      module,
      category,
      areaId,
      search,
      availability,
      minPrice,
      maxPrice,
      propertyType,
      jobType,
      krishiType,
      equipmentMode,
      serviceMode,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ["l.status = 'published'"];
    const params = [];

    // Filter by module
    if (module && VALID_MODULES.has(module)) {
      conditions.push('l.module = ?');
      params.push(module);
    }

    // Filter by category
    if (category && category !== 'All') {
      conditions.push('l.category = ?');
      params.push(category);
    }

    // Filter by taluka area
    if (areaId && areaId !== 'all') {
      conditions.push('l.taluka_area_id = ?');
      params.push(areaId);
    }

    // Filter by availability
    if (availability && availability !== 'all') {
      conditions.push('l.availability_status = ?');
      params.push(availability);
    }

    // Price range
    if (minPrice && !isNaN(Number(minPrice))) {
      conditions.push('l.price >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      conditions.push('l.price <= ?');
      params.push(Number(maxPrice));
    }

    // Module-specific filters
    if (propertyType) {
      conditions.push('lr.property_type = ?');
      params.push(propertyType);
    }

    if (jobType) {
      conditions.push('lj.job_type = ?');
      params.push(jobType);
    }

    if (krishiType) {
      conditions.push('lk.krishi_type = ?');
      params.push(krishiType);
    }

    if (equipmentMode) {
      conditions.push('lk.listing_mode = ?');
      params.push(equipmentMode);
    }

    if (serviceMode) {
      conditions.push('(ls.service_mode = ? OR ls.service_mode = "both")');
      params.push(serviceMode);
    }

    // Fulltext/keyword search
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        '(l.title LIKE ? OR l.description LIKE ? OR l.category LIKE ? OR lk.crop_name LIKE ? OR lk.equipment_name LIKE ?)'
      );
      params.push(q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    let orderBy = 'l.created_at DESC';
    if (sort === 'price_asc') {
      orderBy = 'l.price ASC, l.created_at DESC';
    } else if (sort === 'price_desc') {
      orderBy = 'l.price DESC, l.created_at DESC';
    } else if (sort === 'oldest') {
      orderBy = 'l.created_at ASC';
    }

    // Count query
    const [countRows] = await executeQuery(
      `SELECT COUNT(DISTINCT l.id) AS total
       FROM listings l
       LEFT JOIN listing_jobs lj ON l.id = lj.listing_id
       LEFT JOIN listing_rentals lr ON l.id = lr.listing_id
       LEFT JOIN listing_marketplace lm ON l.id = lm.listing_id
       LEFT JOIN listing_krishi lk ON l.id = lk.listing_id
       LEFT JOIN listing_services ls ON l.id = ls.listing_id
       ${whereClause}`,
      params
    );

    const totalCount = countRows[0]?.total || 0;

    // Data query
    const selectQuery = `
      SELECT 
        l.id,
        l.module,
        l.provider_type,
        l.business_profile_id,
        l.business_branch_id,
        l.user_id,
        l.taluka_area_id,
        l.title,
        l.category,
        l.description,
        l.price,
        l.price_period,
        l.is_price_negotiable,
        l.availability_status,
        l.status,
        l.is_contact_hidden,
        l.contact_phone,
        l.contact_email,
        l.contact_whatsapp,
        l.photos,
        l.created_at,
        l.updated_at,
        ta.name AS area_name,
        ta.marathi_name AS area_marathi_name,
        bp.name AS business_name,
        bp.verification_status AS business_verification_status,
        bp.logo_url AS business_logo,
        bb.branch_name,
        bb.address AS branch_address,
        u.full_name AS provider_name,
        -- Jobs fields
        lj.job_type,
        lj.qualifications,
        lj.experience_required,
        lj.salary_min,
        lj.salary_max,
        lj.salary_period,
        lj.vacancies_count,
        lj.application_method,
        lj.expires_at AS job_expires_at,
        -- Rentals fields
        lr.property_type,
        lr.deposit_amount,
        lr.furnishing_status,
        lr.amenities,
        lr.address_details AS rental_address,
        -- Marketplace fields
        lm.is_condition_new,
        lm.warranty_info,
        lm.brand,
        lm.sku,
        -- Krishi fields
        lk.krishi_type,
        lk.crop_name,
        lk.quantity AS crop_quantity,
        lk.unit AS crop_unit,
        lk.equipment_name,
        lk.equipment_type,
        lk.listing_mode AS equipment_mode,
        lk.rental_rate_unit,
        lk.rental_terms,
        lk.security_deposit AS equipment_deposit,
        -- Services fields
        ls.service_mode,
        ls.pricing_type,
        ls.service_hours,
        ls.experience_years
      FROM listings l
      LEFT JOIN taluka_areas ta ON l.taluka_area_id = ta.id
      LEFT JOIN business_profiles bp ON l.business_profile_id = bp.id
      LEFT JOIN business_branches bb ON l.business_branch_id = bb.id
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN listing_jobs lj ON l.id = lj.listing_id
      LEFT JOIN listing_rentals lr ON l.id = lr.listing_id
      LEFT JOIN listing_marketplace lm ON l.id = lm.listing_id
      LEFT JOIN listing_krishi lk ON l.id = lk.listing_id
      LEFT JOIN listing_services ls ON l.id = ls.listing_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await executeQuery(selectQuery, [...params, limitNum, offset]);

    // Sanitize contact visibility
    const listings = rows.map((item) => {
      let photos = [];
      try {
        photos = typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos || [];
      } catch {
        photos = [];
      }

      let amenities = [];
      try {
        amenities = typeof item.amenities === 'string' ? JSON.parse(item.amenities) : item.amenities || [];
      } catch {
        amenities = [];
      }

      const isHidden = Boolean(item.is_contact_hidden);

      return {
        ...item,
        photos,
        amenities,
        is_price_negotiable: Boolean(item.is_price_negotiable),
        is_contact_hidden: isHidden,
        contact_phone: isHidden ? null : item.contact_phone,
        contact_email: isHidden ? null : item.contact_email,
        contact_whatsapp: isHidden ? null : item.contact_whatsapp,
        business: item.business_profile_id
          ? {
              id: item.business_profile_id,
              name: item.business_name,
              verificationStatus: item.business_verification_status || 'unverified',
              isVerified: item.business_verification_status === 'verified',
              logoUrl: item.business_logo,
              branchName: item.branch_name,
              branchAddress: item.branch_address,
            }
          : null,
      };
    });

    return res.json({
      listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    console.error('[LIST_PUBLIC_LISTINGS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve listings.' },
    });
  }
}

/**
 * Public Listing Detail by ID
 */
export async function getListingById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await executeQuery(
      `SELECT 
        l.*,
        ta.name AS area_name,
        ta.marathi_name AS area_marathi_name,
        bp.name AS business_name,
        bp.verification_status AS business_verification_status,
        bp.description AS business_description,
        bp.logo_url AS business_logo,
        bp.phone AS business_phone,
        bp.email AS business_email,
        bp.address_line1 AS business_address,
        bb.branch_name,
        bb.address AS branch_address,
        bb.phone AS branch_phone,
        u.full_name AS provider_name,
        lj.job_type,
        lj.qualifications,
        lj.experience_required,
        lj.salary_min,
        lj.salary_max,
        lj.salary_period,
        lj.vacancies_count,
        lj.application_method,
        lj.how_to_apply,
        lj.expires_at AS job_expires_at,
        lr.property_type,
        lr.deposit_amount,
        lr.furnishing_status,
        lr.amenities,
        lr.address_details AS rental_address,
        lm.is_condition_new,
        lm.warranty_info,
        lm.brand,
        lm.sku,
        lk.krishi_type,
        lk.crop_name,
        lk.quantity AS crop_quantity,
        lk.unit AS crop_unit,
        lk.equipment_name,
        lk.equipment_type,
        lk.listing_mode AS equipment_mode,
        lk.rental_rate_unit,
        lk.rental_terms,
        lk.security_deposit AS equipment_deposit,
        ls.service_mode,
        ls.pricing_type,
        ls.service_hours,
        ls.experience_years
       FROM listings l
       LEFT JOIN taluka_areas ta ON l.taluka_area_id = ta.id
       LEFT JOIN business_profiles bp ON l.business_profile_id = bp.id
       LEFT JOIN business_branches bb ON l.business_branch_id = bb.id
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN listing_jobs lj ON l.id = lj.listing_id
       LEFT JOIN listing_rentals lr ON l.id = lr.listing_id
       LEFT JOIN listing_marketplace lm ON l.id = lm.listing_id
       LEFT JOIN listing_krishi lk ON l.id = lk.listing_id
       LEFT JOIN listing_services ls ON l.id = ls.listing_id
       WHERE l.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.' },
      });
    }

    const item = rows[0];

    // If listing is not published, only the owner/team member or creator can view it
    if (item.status !== 'published') {
      let isAuthorized = false;
      if (req.user) {
        if (req.user.id === item.user_id) {
          isAuthorized = true;
        } else if (item.business_profile_id) {
          const authCheck = await verifyBusinessListingPermission(
            item.business_profile_id,
            req.user.id,
            'listings.manage'
          );
          if (authCheck.allowed) isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(404).json({
          error: { code: 'LISTING_NOT_FOUND', message: 'Listing is not publicly visible.' },
        });
      }
    }

    let photos = [];
    try {
      photos = typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos || [];
    } catch {
      photos = [];
    }

    let amenities = [];
    try {
      amenities = typeof item.amenities === 'string' ? JSON.parse(item.amenities) : item.amenities || [];
    } catch {
      amenities = [];
    }

    const isHidden = Boolean(item.is_contact_hidden);

    const responseData = {
      ...item,
      photos,
      amenities,
      is_price_negotiable: Boolean(item.is_price_negotiable),
      is_contact_hidden: isHidden,
      contact_phone: isHidden ? null : item.contact_phone,
      contact_email: isHidden ? null : item.contact_email,
      contact_whatsapp: isHidden ? null : item.contact_whatsapp,
      business: item.business_profile_id
        ? {
            id: item.business_profile_id,
            name: item.business_name,
            verificationStatus: item.business_verification_status || 'unverified',
            isVerified: item.business_verification_status === 'verified',
            description: item.business_description,
            logoUrl: item.business_logo,
            address: item.business_address,
            phone: isHidden ? null : item.business_phone,
            email: isHidden ? null : item.business_email,
            branch: item.business_branch_id
              ? {
                  id: item.business_branch_id,
                  name: item.branch_name,
                  address: item.branch_address,
                  phone: isHidden ? null : item.branch_phone,
                }
              : null,
          }
        : null,
    };

    return res.json({ listing: responseData });
  } catch (err) {
    console.error('[GET_LISTING_BY_ID_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve listing detail.' },
    });
  }
}

/**
 * List all listings for a business (Owner & Team Workspace view)
 */
export async function listBusinessListings(req, res) {
  try {
    const { businessId } = req.params;

    const authCheck = await verifyBusinessListingPermission(
      businessId,
      req.user.id,
      'listings.manage'
    );

    if (!authCheck.allowed) {
      return res.status(403).json({
        error: { code: authCheck.code, message: authCheck.message },
      });
    }

    const [listings] = await executeQuery(
      `SELECT 
        l.*,
        ta.name AS area_name,
        bb.branch_name,
        lj.job_type,
        lr.property_type,
        lm.is_condition_new,
        lk.krishi_type,
        lk.crop_name,
        lk.equipment_name,
        ls.service_mode
       FROM listings l
       LEFT JOIN taluka_areas ta ON l.taluka_area_id = ta.id
       LEFT JOIN business_branches bb ON l.business_branch_id = bb.id
       LEFT JOIN listing_jobs lj ON l.id = lj.listing_id
       LEFT JOIN listing_rentals lr ON l.id = lr.listing_id
       LEFT JOIN listing_marketplace lm ON l.id = lm.listing_id
       LEFT JOIN listing_krishi lk ON l.id = lk.listing_id
       LEFT JOIN listing_services ls ON l.id = ls.listing_id
       WHERE l.business_profile_id = ?
       ORDER BY l.created_at DESC`,
      [businessId]
    );

    const parsed = listings.map((l) => ({
      ...l,
      photos: typeof l.photos === 'string' ? JSON.parse(l.photos || '[]') : l.photos || [],
      is_contact_hidden: Boolean(l.is_contact_hidden),
      is_price_negotiable: Boolean(l.is_price_negotiable),
    }));

    return res.json({
      listings: parsed,
      count: parsed.length,
      business: {
        id: authCheck.business.id,
        name: authCheck.business.name,
        verificationStatus: authCheck.business.verification_status,
      },
    });
  } catch (err) {
    console.error('[LIST_BUSINESS_LISTINGS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve business listings.' },
    });
  }
}

/**
 * Create a new listing across any of the 5 listing modules.
 * Enforces business authorization, unverified moderation policy, and module rules.
 */
export async function createListing(req, res) {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const {
      module,
      providerType = 'business',
      businessProfileId,
      businessBranchId,
      talukaAreaId,
      title,
      category,
      description,
      price,
      pricePeriod,
      isPriceNegotiable = false,
      availabilityStatus = 'available',
      contactPhone,
      contactEmail,
      contactWhatsapp,
      isContactHidden = false,
      photos = [],
      // Module 1: Jobs
      jobType,
      qualifications,
      experienceRequired,
      salaryMin,
      salaryMax,
      salaryPeriod,
      isSalaryNegotiable,
      vacanciesCount,
      applicationMethod,
      howToApply,
      expiresAt,
      // Module 2: Rentals
      propertyType,
      depositAmount,
      furnishingStatus,
      amenities,
      addressDetails,
      // Module 3: Marketplace
      isConditionNew = true,
      warrantyInfo,
      brand,
      sku,
      // Module 4: Krishi
      krishiType,
      cropName,
      quantity,
      unit,
      equipmentName,
      equipmentType,
      listingMode,
      rentalRateUnit,
      rentalTerms,
      securityDeposit,
      // Module 5: Services
      serviceMode,
      pricingType,
      serviceHours,
      experienceYears,
    } = req.body;

    // 1. Basic validation
    if (!module || !VALID_MODULES.has(module)) {
      return res.status(400).json({
        error: { code: 'INVALID_MODULE', message: `Module must be one of: ${Array.from(VALID_MODULES).join(', ')}` },
      });
    }

    if (!title || !title.trim() || title.trim().length < 3) {
      return res.status(400).json({
        error: { code: 'INVALID_TITLE', message: 'Title must be at least 3 characters long.' },
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        error: { code: 'INVALID_CATEGORY', message: 'Category is required.' },
      });
    }

    if (!description || !description.trim() || description.trim().length < 10) {
      return res.status(400).json({
        error: { code: 'INVALID_DESCRIPTION', message: 'Description must be at least 10 characters long.' },
      });
    }

    // 2. Marketplace Specific Constraint: STRICTLY NEW PRODUCTS ONLY
    if (module === 'marketplace') {
      if (isConditionNew === false || req.body.condition === 'used' || req.body.condition === 'second_hand') {
        return res.status(400).json({
          error: {
            code: 'SECOND_HAND_PROHIBITED',
            message: 'LocalHub X Marketplace strictly permits new retail products only. Second-hand listings are not accepted in Phase 3.',
          },
        });
      }
    }

    // 3. Provider & Business Authorization Verification
    let business = null;
    let initialStatus = 'pending_review';
    let publicationNotice = '';

    if (providerType === 'business') {
      if (!businessProfileId) {
        return res.status(400).json({
          error: { code: 'MISSING_BUSINESS_ID', message: 'Business profile identifier is required for business listings.' },
        });
      }

      const authCheck = await verifyBusinessListingPermission(
        businessProfileId,
        req.user.id,
        'listings.create'
      );

      if (!authCheck.allowed) {
        return res.status(403).json({
          error: { code: authCheck.code, message: authCheck.message },
        });
      }

      business = authCheck.business;

      // Verification policy check:
      // Verified businesses publish immediately.
      // Unverified or pending businesses are routed to pending_review.
      if (business.verification_status === 'verified') {
        initialStatus = 'published';
        publicationNotice = 'Listing published immediately under verified business credentials.';
      } else {
        initialStatus = 'pending_review';
        publicationNotice = 'Submitted for moderation review. Listings from unverified businesses require review before public display.';
      }
    } else {
      // Individual provider (services or rentals)
      if (module !== 'services' && module !== 'rentals') {
        return res.status(400).json({
          error: {
            code: 'INVALID_PROVIDER_TYPE',
            message: 'Individual provider listings are currently supported only for Local Services and Rentals & PG.',
          },
        });
      }

      // Require verified email or phone
      if (!req.user.isEmailVerified && !req.user.isPhoneVerified) {
        return res.status(403).json({
          error: {
            code: 'VERIFICATION_REQUIRED',
            message: 'A verified phone number or email is required to post individual listings.',
          },
        });
      }

      initialStatus = 'pending_review';
      publicationNotice = 'Individual listing submitted for moderation review.';
    }

    // 4. Validate Branch if provided
    let branchId = null;
    if (businessBranchId && providerType === 'business') {
      const [branchRows] = await executeQuery(
        'SELECT id FROM business_branches WHERE id = ? AND business_profile_id = ? AND is_active = TRUE',
        [businessBranchId, businessProfileId]
      );
      if (branchRows.length > 0) {
        branchId = businessBranchId;
      }
    }

    // 5. Begin DB Transaction
    await conn.beginTransaction();

    const listingId = crypto.randomUUID();
    const photosJson = JSON.stringify(Array.isArray(photos) ? photos : []);

    // Insert core listing
    await conn.execute(
      `INSERT INTO listings (
        id, module, provider_type, business_profile_id, business_branch_id,
        user_id, taluka_area_id, title, category, description,
        price, price_period, is_price_negotiable, availability_status,
        status, contact_phone, contact_email, contact_whatsapp,
        is_contact_hidden, photos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        listingId,
        module,
        providerType,
        businessProfileId || null,
        branchId,
        req.user.id,
        talukaAreaId || null,
        title.trim(),
        category.trim(),
        description.trim(),
        price ? Number(price) : null,
        pricePeriod || null,
        Boolean(isPriceNegotiable),
        availabilityStatus || 'available',
        initialStatus,
        contactPhone || null,
        contactEmail || null,
        contactWhatsapp || null,
        Boolean(isContactHidden),
        photosJson,
      ]
    );

    // Insert module-specific typed detail row
    if (module === 'jobs') {
      await conn.execute(
        `INSERT INTO listing_jobs (
          listing_id, job_type, qualifications, experience_required,
          salary_min, salary_max, salary_period, is_salary_negotiable,
          vacancies_count, application_method, how_to_apply, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          listingId,
          jobType || 'Full-time',
          qualifications || null,
          experienceRequired || null,
          salaryMin ? Number(salaryMin) : null,
          salaryMax ? Number(salaryMax) : null,
          salaryPeriod || 'monthly',
          Boolean(isSalaryNegotiable),
          vacanciesCount ? parseInt(vacanciesCount, 10) : 1,
          applicationMethod || 'direct_contact',
          howToApply || null,
          expiresAt || null,
        ]
      );
    } else if (module === 'rentals') {
      const amenitiesJson = JSON.stringify(Array.isArray(amenities) ? amenities : []);
      await conn.execute(
        `INSERT INTO listing_rentals (
          listing_id, property_type, deposit_amount, furnishing_status,
          amenities, address_details
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          listingId,
          propertyType || 'room',
          depositAmount ? Number(depositAmount) : 0,
          furnishingStatus || 'unfurnished',
          amenitiesJson,
          addressDetails || null,
        ]
      );
    } else if (module === 'marketplace') {
      await conn.execute(
        `INSERT INTO listing_marketplace (
          listing_id, is_condition_new, warranty_info, brand, sku
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          listingId,
          true, // Strictly new product
          warrantyInfo || null,
          brand || null,
          sku || null,
        ]
      );
    } else if (module === 'krishi_products' || module === 'krishi_equipment') {
      const isEquip = module === 'krishi_equipment' || krishiType === 'equipment';
      await conn.execute(
        `INSERT INTO listing_krishi (
          listing_id, krishi_type, crop_name, quantity, unit,
          equipment_name, equipment_type, listing_mode, rental_rate_unit,
          rental_terms, security_deposit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          listingId,
          isEquip ? 'equipment' : 'product',
          isEquip ? null : (cropName || title),
          isEquip ? null : (quantity ? Number(quantity) : null),
          isEquip ? null : (unit || 'Quintal'),
          isEquip ? (equipmentName || title) : null,
          isEquip ? (equipmentType || category) : null,
          isEquip ? (listingMode || 'rental') : null,
          isEquip ? (rentalRateUnit || 'per_hour') : null,
          isEquip ? (rentalTerms || null) : null,
          isEquip ? (securityDeposit ? Number(securityDeposit) : null) : null,
        ]
      );
    } else if (module === 'services') {
      await conn.execute(
        `INSERT INTO listing_services (
          listing_id, service_mode, pricing_type, service_hours, experience_years
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          listingId,
          serviceMode || 'both',
          pricingType || 'quote_on_inspection',
          serviceHours || null,
          experienceYears ? parseInt(experienceYears, 10) : null,
        ]
      );
    }

    await conn.commit();

    // Audit log
    await logAuditEvent({
      actorId: req.user.id,
      action: 'listing.created',
      entityType: 'listing',
      entityId: listingId,
      details: {
        module,
        status: initialStatus,
        businessProfileId,
        providerType,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      message: 'Listing created successfully.',
      listingId,
      status: initialStatus,
      isPublished: initialStatus === 'published',
      publicationNotice,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[CREATE_LISTING_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create listing: ' + err.message },
    });
  } finally {
    conn.release();
  }
}

/**
 * Update an existing listing.
 * IDOR guard: verifies owner / listings.manage permission.
 */
export async function updateListing(req, res) {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const { id } = req.params;

    const [existingRows] = await executeQuery(
      'SELECT * FROM listings WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.' },
      });
    }

    const listing = existingRows[0];

    // Check authorization
    if (listing.provider_type === 'business') {
      const authCheck = await verifyBusinessListingPermission(
        listing.business_profile_id,
        req.user.id,
        'listings.manage'
      );
      if (!authCheck.allowed) {
        return res.status(403).json({
          error: { code: authCheck.code, message: authCheck.message },
        });
      }
    } else {
      if (listing.user_id !== req.user.id) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You are not authorized to edit this listing.' },
        });
      }
    }

    const {
      title,
      category,
      description,
      price,
      pricePeriod,
      isPriceNegotiable,
      availabilityStatus,
      contactPhone,
      contactEmail,
      contactWhatsapp,
      isContactHidden,
      photos,
      talukaAreaId,
      // Module details
      jobType,
      qualifications,
      experienceRequired,
      salaryMin,
      salaryMax,
      propertyType,
      depositAmount,
      furnishingStatus,
      amenities,
      warrantyInfo,
      cropName,
      quantity,
      unit,
      equipmentName,
      equipmentType,
      listingMode,
      serviceMode,
      pricingType,
    } = req.body;

    await conn.beginTransaction();

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description.trim());
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price ? Number(price) : null);
    }
    if (pricePeriod !== undefined) {
      updates.push('price_period = ?');
      params.push(pricePeriod);
    }
    if (isPriceNegotiable !== undefined) {
      updates.push('is_price_negotiable = ?');
      params.push(Boolean(isPriceNegotiable));
    }
    if (availabilityStatus !== undefined) {
      updates.push('availability_status = ?');
      params.push(availabilityStatus);
    }
    if (contactPhone !== undefined) {
      updates.push('contact_phone = ?');
      params.push(contactPhone);
    }
    if (contactEmail !== undefined) {
      updates.push('contact_email = ?');
      params.push(contactEmail);
    }
    if (contactWhatsapp !== undefined) {
      updates.push('contact_whatsapp = ?');
      params.push(contactWhatsapp);
    }
    if (isContactHidden !== undefined) {
      updates.push('is_contact_hidden = ?');
      params.push(Boolean(isContactHidden));
    }
    if (photos !== undefined) {
      updates.push('photos = ?');
      params.push(JSON.stringify(Array.isArray(photos) ? photos : []));
    }
    if (talukaAreaId !== undefined) {
      updates.push('taluka_area_id = ?');
      params.push(talukaAreaId || null);
    }

    if (updates.length > 0) {
      params.push(id);
      await conn.execute(
        `UPDATE listings SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    // Update module-specific detail table
    if (listing.module === 'jobs') {
      const jobUpdates = [];
      const jobParams = [];
      if (jobType !== undefined) { jobUpdates.push('job_type = ?'); jobParams.push(jobType); }
      if (qualifications !== undefined) { jobUpdates.push('qualifications = ?'); jobParams.push(qualifications); }
      if (experienceRequired !== undefined) { jobUpdates.push('experience_required = ?'); jobParams.push(experienceRequired); }
      if (salaryMin !== undefined) { jobUpdates.push('salary_min = ?'); jobParams.push(salaryMin ? Number(salaryMin) : null); }
      if (salaryMax !== undefined) { jobUpdates.push('salary_max = ?'); jobParams.push(salaryMax ? Number(salaryMax) : null); }
      if (jobUpdates.length > 0) {
        jobParams.push(id);
        await conn.execute(`UPDATE listing_jobs SET ${jobUpdates.join(', ')} WHERE listing_id = ?`, jobParams);
      }
    } else if (listing.module === 'rentals') {
      const rentUpdates = [];
      const rentParams = [];
      if (propertyType !== undefined) { rentUpdates.push('property_type = ?'); rentParams.push(propertyType); }
      if (depositAmount !== undefined) { rentUpdates.push('deposit_amount = ?'); rentParams.push(Number(depositAmount)); }
      if (furnishingStatus !== undefined) { rentUpdates.push('furnishing_status = ?'); rentParams.push(furnishingStatus); }
      if (amenities !== undefined) { rentUpdates.push('amenities = ?'); rentParams.push(JSON.stringify(amenities)); }
      if (rentUpdates.length > 0) {
        rentParams.push(id);
        await conn.execute(`UPDATE listing_rentals SET ${rentUpdates.join(', ')} WHERE listing_id = ?`, rentParams);
      }
    } else if (listing.module === 'marketplace') {
      if (warrantyInfo !== undefined) {
        await conn.execute('UPDATE listing_marketplace SET warranty_info = ? WHERE listing_id = ?', [warrantyInfo, id]);
      }
    } else if (listing.module === 'krishi_products' || listing.module === 'krishi_equipment') {
      const kUpdates = [];
      const kParams = [];
      if (cropName !== undefined) { kUpdates.push('crop_name = ?'); kParams.push(cropName); }
      if (quantity !== undefined) { kUpdates.push('quantity = ?'); kParams.push(quantity ? Number(quantity) : null); }
      if (unit !== undefined) { kUpdates.push('unit = ?'); kParams.push(unit); }
      if (equipmentName !== undefined) { kUpdates.push('equipment_name = ?'); kParams.push(equipmentName); }
      if (equipmentType !== undefined) { kUpdates.push('equipment_type = ?'); kParams.push(equipmentType); }
      if (listingMode !== undefined) { kUpdates.push('listing_mode = ?'); kParams.push(listingMode); }
      if (kUpdates.length > 0) {
        kParams.push(id);
        await conn.execute(`UPDATE listing_krishi SET ${kUpdates.join(', ')} WHERE listing_id = ?`, kParams);
      }
    } else if (listing.module === 'services') {
      const sUpdates = [];
      const sParams = [];
      if (serviceMode !== undefined) { sUpdates.push('service_mode = ?'); sParams.push(serviceMode); }
      if (pricingType !== undefined) { sUpdates.push('pricing_type = ?'); sParams.push(pricingType); }
      if (sUpdates.length > 0) {
        sParams.push(id);
        await conn.execute(`UPDATE listing_services SET ${sUpdates.join(', ')} WHERE listing_id = ?`, sParams);
      }
    }

    await conn.commit();

    await logAuditEvent({
      actorId: req.user.id,
      action: 'listing.updated',
      entityType: 'listing',
      entityId: id,
      details: { updates: updates.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ message: 'Listing updated successfully.' });
  } catch (err) {
    await conn.rollback();
    console.error('[UPDATE_LISTING_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update listing: ' + err.message },
    });
  } finally {
    conn.release();
  }
}

/**
 * Fast availability update (e.g. available <-> rented, in_stock <-> out_of_stock)
 */
export async function updateAvailability(req, res) {
  try {
    const { id } = req.params;
    const { availabilityStatus } = req.body;

    if (!availabilityStatus) {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Availability status is required.' },
      });
    }

    const [rows] = await executeQuery('SELECT * FROM listings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.' },
      });
    }

    const listing = rows[0];

    // Auth check
    if (listing.provider_type === 'business') {
      const auth = await verifyBusinessListingPermission(listing.business_profile_id, req.user.id, 'listings.manage');
      if (!auth.allowed) {
        return res.status(403).json({ error: { code: auth.code, message: auth.message } });
      }
    } else if (listing.user_id !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized.' } });
    }

    await executeQuery(
      'UPDATE listings SET availability_status = ? WHERE id = ?',
      [availabilityStatus, id]
    );

    return res.json({
      message: 'Availability updated successfully.',
      listingId: id,
      availabilityStatus,
    });
  } catch (err) {
    console.error('[UPDATE_AVAILABILITY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update availability.' },
    });
  }
}

/**
 * Toggle listing lifecycle status (published, paused, closed, archived)
 * Safeguard: Unverified businesses cannot unilaterally publish listings.
 */
export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['published', 'paused', 'closed', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Invalid listing status transition.' },
      });
    }

    const [rows] = await executeQuery('SELECT * FROM listings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.' },
      });
    }

    const listing = rows[0];

    if (listing.provider_type === 'business') {
      const auth = await verifyBusinessListingPermission(listing.business_profile_id, req.user.id, 'listings.manage');
      if (!auth.allowed) {
        return res.status(403).json({ error: { code: auth.code, message: auth.message } });
      }

      // Check verification if trying to publish
      if (status === 'published' && auth.business.verification_status !== 'verified') {
        return res.status(403).json({
          error: {
            code: 'MODERATION_REVIEW_REQUIRED',
            message: 'Unverified businesses cannot publish listings directly. Listing must be approved by admin review.',
          },
        });
      }
    } else if (listing.user_id !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized.' } });
    }

    await executeQuery('UPDATE listings SET status = ? WHERE id = ?', [status, id]);

    return res.json({
      message: `Listing status updated to ${status}.`,
      listingId: id,
      status,
    });
  } catch (err) {
    console.error('[UPDATE_STATUS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update listing status.' },
    });
  }
}

/**
 * Archive / Delete Listing
 */
export async function deleteListing(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await executeQuery('SELECT * FROM listings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.' },
      });
    }

    const listing = rows[0];

    if (listing.provider_type === 'business') {
      const auth = await verifyBusinessListingPermission(listing.business_profile_id, req.user.id, 'listings.manage');
      if (!auth.allowed) {
        return res.status(403).json({ error: { code: auth.code, message: auth.message } });
      }
    } else if (listing.user_id !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized.' } });
    }

    // Set to archived status rather than hard deleting to preserve audit history
    await executeQuery("UPDATE listings SET status = 'archived' WHERE id = ?", [id]);

    await logAuditEvent({
      actorId: req.user.id,
      action: 'listing.archived',
      entityType: 'listing',
      entityId: id,
      details: { module: listing.module },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ message: 'Listing archived successfully.' });
  } catch (err) {
    console.error('[DELETE_LISTING_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to archive listing.' },
    });
  }
}
