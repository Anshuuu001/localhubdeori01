import crypto from 'crypto';
import { executeQuery } from '../config/database.js';

export const TALUKA_ADJACENCY = {
  'deori-hq': ['borgaon', 'shiwnikalan', 'mando-devi', 'chichgarh', 'soundad'],
  'chichgarh': ['deori-hq', 'shiwnikalan'],
  'soundad': ['kohmara', 'deori-hq', 'shiwnikalan'],
  'borgaon': ['deori-hq', 'salekasa-border', 'mando-devi'],
  'salekasa-border': ['borgaon', 'deori-hq'],
  'shiwnikalan': ['deori-hq', 'chichgarh', 'soundad'],
  'mando-devi': ['deori-hq', 'borgaon'],
  'kohmara': ['soundad', 'deori-hq'],
};

const VALID_MODULE_FILTERS = new Set([
  'all',
  'jobs',
  'rentals',
  'marketplace',
  'krishi',
  'krishi_products',
  'krishi_equipment',
  'services',
  'directory',
  'events',
  'news',
  'notices',
  'emergency',
]);

/**
 * Universal Search across all 10 LocalHub X verticals.
 * Enforces strict public visibility:
 * - Only published listings, events, news, notices.
 * - Only active businesses and emergency contacts.
 * - Respects contact masking.
 * - Supports structured nearby circle expansion.
 */
export async function universalSearch(req, res) {
  try {
    const {
      q,
      module = 'all',
      areaId = 'all',
      expandNearby = 'false',
      sort = 'relevance', // 'relevance' | 'newest'
      page = 1,
      limit = 20,
    } = req.query;

    const queryText = (q || '').trim();
    if (!queryText || queryText.length < 1) {
      return res.status(400).json({
        error: {
          code: 'QUERY_TOO_SHORT',
          message: 'Search query must be at least 1 character long.',
        },
      });
    }

    if (queryText.length > 100) {
      return res.status(400).json({
        error: {
          code: 'QUERY_TOO_LONG',
          message: 'Search query cannot exceed 100 characters.',
        },
      });
    }

    const selectedModule = VALID_MODULE_FILTERS.has(module) ? module : 'all';
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Resolve eligible area IDs
    let targetAreaIds = null;
    const shouldExpand = expandNearby === 'true' || expandNearby === true;
    if (areaId && areaId !== 'all') {
      targetAreaIds = [areaId];
      if (shouldExpand && TALUKA_ADJACENCY[areaId]) {
        targetAreaIds = Array.from(new Set([areaId, ...TALUKA_ADJACENCY[areaId]]));
      }
    }

    // Record user search in history if authenticated
    if (req.user && req.user.id) {
      try {
        const histId = crypto.randomUUID();
        await executeQuery(
          `INSERT INTO user_search_history (id, user_id, query_text, module_filter, area_id) 
           VALUES (?, ?, ?, ?, ?)`,
          [histId, req.user.id, queryText.slice(0, 150), selectedModule, areaId === 'all' ? null : areaId]
        );
      } catch (e) {
        // Non-blocking history record failure
      }
    }

    const searchPattern = `%${queryText.toLowerCase()}%`;
    const results = [];

    // 1. Search Listings (Jobs, Rentals, Marketplace, Krishi, Services)
    const searchListings =
      selectedModule === 'all' ||
      ['jobs', 'rentals', 'marketplace', 'krishi', 'krishi_products', 'krishi_equipment', 'services'].includes(selectedModule);

    if (searchListings) {
      const listingConditions = [
        "l.status = 'published'",
        "(LOWER(l.title) LIKE ? OR LOWER(l.description) LIKE ? OR LOWER(l.category) LIKE ? OR LOWER(COALESCE(lk.crop_name, '')) LIKE ? OR LOWER(COALESCE(lk.equipment_name, '')) LIKE ?)",
      ];
      const listingParams = [
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
      ];

      if (selectedModule === 'jobs') {
        listingConditions.push("l.module = 'jobs'");
      } else if (selectedModule === 'rentals') {
        listingConditions.push("l.module = 'rentals'");
      } else if (selectedModule === 'marketplace') {
        listingConditions.push("l.module = 'marketplace'");
      } else if (selectedModule === 'krishi') {
        listingConditions.push("l.module IN ('krishi_products', 'krishi_equipment')");
      } else if (selectedModule === 'krishi_products') {
        listingConditions.push("l.module = 'krishi_products'");
      } else if (selectedModule === 'krishi_equipment') {
        listingConditions.push("l.module = 'krishi_equipment'");
      } else if (selectedModule === 'services') {
        listingConditions.push("l.module = 'services'");
      }

      if (targetAreaIds && targetAreaIds.length > 0) {
        const areaPlaceholders = targetAreaIds.map(() => '?').join(',');
        listingConditions.push(`l.taluka_area_id IN (${areaPlaceholders})`);
        listingParams.push(...targetAreaIds);
      }

      const listingSql = `
        SELECT 
          l.id,
          l.module,
          l.title,
          l.category,
          l.description,
          l.price,
          l.price_period,
          l.availability_status,
          l.status,
          l.taluka_area_id,
          l.is_contact_hidden,
          l.contact_phone,
          l.contact_whatsapp,
          l.photos,
          l.created_at,
          l.updated_at,
          ta.name AS area_name,
          ta.marathi_name AS area_marathi_name,
          bp.name AS business_name,
          bp.verification_status AS business_verification_status,
          lj.job_type,
          lr.property_type,
          lk.crop_name,
          lk.equipment_name
        FROM listings l
        LEFT JOIN taluka_areas ta ON l.taluka_area_id = ta.id
        LEFT JOIN business_profiles bp ON l.business_profile_id = bp.id
        LEFT JOIN listing_jobs lj ON l.id = lj.listing_id
        LEFT JOIN listing_rentals lr ON l.id = lr.listing_id
        LEFT JOIN listing_krishi lk ON l.id = lk.listing_id
        WHERE ${listingConditions.join(' AND ')}
        ORDER BY l.created_at DESC
        LIMIT 60
      `;

      const [listingRows] = await executeQuery(listingSql, listingParams);

      for (const item of listingRows) {
        const isHidden = Boolean(item.is_contact_hidden);
        let photos = [];
        try {
          photos = typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos || [];
        } catch {
          photos = [];
        }

        const actions = ['view_details', 'save'];
        if (item.module === 'jobs') actions.push('apply');
        if (item.module === 'rentals' || item.module === 'marketplace' || item.module === 'krishi_products' || item.module === 'krishi_equipment') {
          actions.push('enquire');
        }
        if (item.module === 'services') actions.push('book');
        if (!isHidden && item.contact_phone) actions.push('call');
        if (!isHidden && item.contact_whatsapp) actions.push('whatsapp');

        let displayModule = item.module;
        if (item.module === 'krishi_products' || item.module === 'krishi_equipment') {
          displayModule = 'krishi';
        }

        results.push({
          id: item.id,
          entityType: 'listing',
          module: displayModule,
          title: item.title,
          summary: item.description ? item.description.slice(0, 180) : '',
          category: item.category,
          areaId: item.taluka_area_id,
          areaName: item.area_name || 'Deori Taluka',
          areaMarathiName: item.area_marathi_name,
          publishedAt: item.created_at,
          status: item.status,
          price: item.price !== null ? Number(item.price) : null,
          pricePeriod: item.price_period,
          availabilityStatus: item.availability_status,
          badge: item.business_verification_status === 'verified'
            ? { type: 'business_verified', label: 'Verified Local Business', verified: true }
            : null,
          contactPhone: isHidden ? null : item.contact_phone,
          contactWhatsapp: isHidden ? null : item.contact_whatsapp,
          supportedActions: actions,
          rawDetail: {
            photos,
            businessName: item.business_name,
            jobType: item.job_type,
            propertyType: item.property_type,
            cropName: item.crop_name,
            equipmentName: item.equipment_name,
          },
        });
      }
    }

    // 2. Search Business Directory
    const searchDirectory = selectedModule === 'all' || selectedModule === 'directory';
    if (searchDirectory) {
      const bizConditions = [
        "bp.status = 'active'",
        '(LOWER(bp.name) LIKE ? OR LOWER(bp.description) LIKE ? OR LOWER(bp.category) LIKE ?)',
      ];
      const bizParams = [searchPattern, searchPattern, searchPattern];

      if (targetAreaIds && targetAreaIds.length > 0) {
        const areaPlaceholders = targetAreaIds.map(() => '?').join(',');
        bizConditions.push(`bp.taluka_area_id IN (${areaPlaceholders})`);
        bizParams.push(...targetAreaIds);
      }

      const bizSql = `
        SELECT 
          bp.id,
          bp.name,
          bp.category,
          bp.description,
          bp.verification_status,
          bp.phone,
          bp.whatsapp_number AS whatsapp,
          bp.email,
          bp.logo_url,
          bp.taluka_area_id,
          bp.created_at,
          ta.name AS area_name,
          ta.marathi_name AS area_marathi_name
        FROM business_profiles bp
        LEFT JOIN taluka_areas ta ON bp.taluka_area_id = ta.id
        WHERE ${bizConditions.join(' AND ')}
        ORDER BY bp.created_at DESC
        LIMIT 30
      `;

      const [bizRows] = await executeQuery(bizSql, bizParams);

      for (const item of bizRows) {
        const actions = ['view_details', 'save'];
        if (item.phone) actions.push('call');
        if (item.whatsapp) actions.push('whatsapp');

        results.push({
          id: item.id,
          entityType: 'business',
          module: 'directory',
          title: item.name,
          summary: item.description ? item.description.slice(0, 180) : '',
          category: item.category,
          areaId: item.taluka_area_id,
          areaName: item.area_name || 'Deori Taluka',
          areaMarathiName: item.area_marathi_name,
          publishedAt: item.created_at,
          status: 'active',
          price: null,
          pricePeriod: null,
          availabilityStatus: 'active',
          badge: item.verification_status === 'verified'
            ? { type: 'business_verified', label: 'Verified Trade Directory', verified: true }
            : null,
          contactPhone: item.phone,
          contactWhatsapp: item.whatsapp,
          supportedActions: actions,
          rawDetail: {
            logoUrl: item.logo_url,
            email: item.email,
          },
        });
      }
    }

    // 3. Search Events Desk
    const searchEvents = selectedModule === 'all' || selectedModule === 'events';
    if (searchEvents) {
      const eventConditions = [
        "e.status = 'published'",
        '(LOWER(e.title) LIKE ? OR LOWER(e.description) LIKE ? OR LOWER(e.venue) LIKE ? OR LOWER(e.organizer_name) LIKE ? OR LOWER(e.category) LIKE ?)',
      ];
      const eventParams = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];

      if (targetAreaIds && targetAreaIds.length > 0) {
        const areaPlaceholders = targetAreaIds.map(() => '?').join(',');
        eventConditions.push(`e.area_id IN (${areaPlaceholders})`);
        eventParams.push(...targetAreaIds);
      }

      const eventSql = `
        SELECT 
          e.id,
          e.title,
          e.category,
          e.description,
          e.venue,
          e.organizer_name,
          e.start_date,
          e.end_date,
          e.area_id,
          e.organizer_contact_phone AS contact_phone,
          e.status,
          e.created_at,
          ta.name AS area_name,
          ta.marathi_name AS area_marathi_name
        FROM events e
        LEFT JOIN taluka_areas ta ON e.area_id = ta.id
        WHERE ${eventConditions.join(' AND ')}
        ORDER BY e.created_at DESC
        LIMIT 25
      `;

      const [eventRows] = await executeQuery(eventSql, eventParams);

      for (const item of eventRows) {
        const actions = ['view_details', 'interested', 'save'];
        if (item.contact_phone) actions.push('call');

        results.push({
          id: item.id,
          entityType: 'event',
          module: 'events',
          title: item.title,
          summary: `${item.venue ? `Venue: ${item.venue} • ` : ''}${item.description ? item.description.slice(0, 160) : ''}`,
          category: item.category,
          areaId: item.area_id,
          areaName: item.area_name || 'Deori Taluka',
          areaMarathiName: item.area_marathi_name,
          publishedAt: item.created_at,
          status: item.status,
          price: null,
          pricePeriod: null,
          availabilityStatus: 'upcoming',
          badge: { type: 'civic_event', label: 'Civic Event', verified: true },
          contactPhone: item.contact_phone,
          contactWhatsapp: null,
          supportedActions: actions,
          rawDetail: {
            venue: item.venue,
            organizerName: item.organizer_name,
            startDate: item.start_date,
            endDate: item.end_date,
          },
        });
      }
    }

    // 4. Search Taluka News
    const searchNews = selectedModule === 'all' || selectedModule === 'news';
    if (searchNews) {
      const newsConditions = [
        "n.status = 'published'",
        '(LOWER(n.headline) LIKE ? OR LOWER(n.summary) LIKE ? OR LOWER(n.content) LIKE ? OR LOWER(n.source_name) LIKE ? OR LOWER(n.category) LIKE ?)',
      ];
      const newsParams = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];

      if (targetAreaIds && targetAreaIds.length > 0) {
        const areaPlaceholders = targetAreaIds.map(() => '?').join(',');
        newsConditions.push(`n.area_id IN (${areaPlaceholders})`);
        newsParams.push(...targetAreaIds);
      }

      const newsSql = `
        SELECT 
          n.id,
          n.headline,
          n.summary,
          n.category,
          n.source_name,
          (n.evidence_url IS NOT NULL) AS fact_checked,
          n.area_id,
          n.status,
          n.published_at,
          n.created_at,
          ta.name AS area_name,
          ta.marathi_name AS area_marathi_name
        FROM news_articles n
        LEFT JOIN taluka_areas ta ON n.area_id = ta.id
        WHERE ${newsConditions.join(' AND ')}
        ORDER BY n.published_at DESC
        LIMIT 25
      `;

      const [newsRows] = await executeQuery(newsSql, newsParams);

      for (const item of newsRows) {
        results.push({
          id: item.id,
          entityType: 'news',
          module: 'news',
          title: item.headline,
          summary: item.summary ? item.summary.slice(0, 180) : '',
          category: item.category,
          areaId: item.area_id,
          areaName: item.area_name || 'Deori Taluka',
          areaMarathiName: item.area_marathi_name,
          publishedAt: item.published_at || item.created_at,
          status: item.status,
          price: null,
          pricePeriod: null,
          availabilityStatus: 'published',
          badge: item.fact_checked
            ? { type: 'fact_checked', label: 'Fact-Checked Report', verified: true }
            : { type: 'local_news', label: 'Taluka Journalism', verified: false },
          contactPhone: null,
          contactWhatsapp: null,
          supportedActions: ['view_details', 'save'],
          rawDetail: {
            sourceName: item.source_name,
            factChecked: Boolean(item.fact_checked),
          },
        });
      }
    }

    // 5. Search Government Notices
    const searchNotices = selectedModule === 'all' || selectedModule === 'notices';
    if (searchNotices) {
      const noticeConditions = [
        "gn.status = 'published'",
        '(LOWER(gn.notice_title) LIKE ? OR LOWER(gn.summary) LIKE ? OR LOWER(COALESCE(gn.official_source_url, "")) LIKE ? OR LOWER(gn.issuing_authority) LIKE ?)',
      ];
      const noticeParams = [searchPattern, searchPattern, searchPattern, searchPattern];

      if (targetAreaIds && targetAreaIds.length > 0) {
        const areaPlaceholders = targetAreaIds.map(() => '?').join(',');
        noticeConditions.push(`gn.area_id IN (${areaPlaceholders})`);
        noticeParams.push(...targetAreaIds);
      }

      const noticeSql = `
        SELECT 
          gn.id,
          gn.notice_title,
          gn.issuing_authority,
          gn.official_source_url,
          gn.summary,
          gn.deadline_date,
          gn.issue_date,
          gn.area_id,
          gn.status,
          gn.created_at,
          ta.name AS area_name,
          ta.marathi_name AS area_marathi_name
        FROM govt_notices gn
        LEFT JOIN taluka_areas ta ON gn.area_id = ta.id
        WHERE ${noticeConditions.join(' AND ')}
        ORDER BY gn.created_at DESC
        LIMIT 25
      `;

      const [noticeRows] = await executeQuery(noticeSql, noticeParams);

      for (const item of noticeRows) {
        results.push({
          id: item.id,
          entityType: 'notice',
          module: 'notices',
          title: item.notice_title,
          summary: `${item.issuing_authority ? `[${item.issuing_authority}] ` : ''}${item.summary ? item.summary.slice(0, 180) : ''}`,
          category: 'Government Notice',
          areaId: item.area_id,
          areaName: item.area_name || 'Deori Taluka',
          areaMarathiName: item.area_marathi_name,
          publishedAt: item.issue_date || item.created_at,
          status: item.status,
          price: null,
          pricePeriod: null,
          availabilityStatus: 'active',
          badge: { type: 'official_notice', label: 'Official Civic Source', verified: true },
          contactPhone: null,
          contactWhatsapp: null,
          supportedActions: ['view_details', 'save'],
          rawDetail: {
            issuingAuthority: item.issuing_authority,
            sourceUrl: item.official_source_url,
            deadlineDate: item.deadline_date,
          },
        });
      }
    }

    // 6. Search Emergency Contacts
    const searchEmergency = selectedModule === 'all' || selectedModule === 'emergency';
    if (searchEmergency) {
      const emergConditions = [
        "ec.status = 'active'",
        '(LOWER(ec.name) LIKE ? OR LOWER(ec.department) LIKE ? OR LOWER(ec.category) LIKE ? OR ec.primary_phone LIKE ?)',
      ];
      const emergParams = [searchPattern, searchPattern, searchPattern, `%${queryText}%`];

      if (targetAreaIds && targetAreaIds.length > 0) {
        const areaPlaceholders = targetAreaIds.map(() => '?').join(',');
        emergConditions.push(`(ec.area_id IN (${areaPlaceholders}) OR ec.area_id IS NULL)`);
        emergParams.push(...targetAreaIds);
      }

      const emergSql = `
        SELECT 
          ec.id,
          ec.name,
          ec.department,
          ec.category,
          ec.primary_phone,
          ec.secondary_phone,
          ec.area_id,
          ec.is_verified,
          ec.is_national_standard,
          ec.created_at,
          ta.name AS area_name,
          ta.marathi_name AS area_marathi_name
        FROM emergency_contacts ec
        LEFT JOIN taluka_areas ta ON ec.area_id = ta.id
        WHERE ${emergConditions.join(' AND ')}
        ORDER BY ec.sort_order ASC, ec.created_at DESC
        LIMIT 20
      `;

      const [emergRows] = await executeQuery(emergSql, emergParams);

      for (const item of emergRows) {
        results.push({
          id: item.id,
          entityType: 'emergency',
          module: 'emergency',
          title: item.name,
          summary: `${item.department || ''} • Emergency Phone: ${item.primary_phone}${item.secondary_phone ? ` / ${item.secondary_phone}` : ''}`,
          category: item.category,
          areaId: item.area_id,
          areaName: item.area_name || 'All Taluka / Maharashtra',
          areaMarathiName: item.area_marathi_name,
          publishedAt: item.created_at,
          status: 'active',
          price: null,
          pricePeriod: null,
          availabilityStatus: 'active',
          badge: {
            type: 'verified_emergency',
            label: item.is_national_standard ? 'National Standard Lifeline' : 'Verified Administrative Helpline',
            verified: Boolean(item.is_verified),
          },
          contactPhone: item.primary_phone,
          contactWhatsapp: null,
          supportedActions: ['call', 'view_details', 'save'],
          rawDetail: {
            department: item.department,
            secondaryPhone: item.secondary_phone,
            isNationalStandard: Boolean(item.is_national_standard),
          },
        });
      }
    }

    // Relevance scoring
    const normalizedQuery = queryText.toLowerCase();
    for (const item of results) {
      let score = 0;
      const titleLower = (item.title || '').toLowerCase();
      const summaryLower = (item.summary || '').toLowerCase();
      const catLower = (item.category || '').toLowerCase();

      // Exact title match
      if (titleLower === normalizedQuery) {
        score += 100;
      } else if (titleLower.startsWith(normalizedQuery)) {
        score += 65;
      } else if (titleLower.includes(normalizedQuery)) {
        score += 40;
      }

      if (catLower.includes(normalizedQuery)) {
        score += 25;
      }
      if (summaryLower.includes(normalizedQuery)) {
        score += 15;
      }

      // Proximity boost if item is strictly in user's selected area
      if (areaId && areaId !== 'all' && item.areaId === areaId) {
        score += 15;
      }

      // National emergency standard or verified badge boost
      if (item.badge && item.badge.verified) {
        score += 5;
      }

      item.relevanceScore = score;
    }

    // Sort results
    if (sort === 'newest') {
      results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    } else {
      // Relevance sort with recency tiebreaker
      results.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.publishedAt) - new Date(a.publishedAt);
      });
    }

    const totalCount = results.length;
    const paginatedResults = results.slice(offset, offset + limitNum);

    // Module breakdown counts
    const moduleCounts = {
      all: totalCount,
      jobs: 0,
      rentals: 0,
      marketplace: 0,
      krishi: 0,
      services: 0,
      directory: 0,
      events: 0,
      news: 0,
      notices: 0,
      emergency: 0,
    };

    for (const item of results) {
      if (moduleCounts[item.module] !== undefined) {
        moduleCounts[item.module] += 1;
      }
    }

    return res.json({
      success: true,
      query: queryText,
      appliedFilters: {
        module: selectedModule,
        areaId,
        expandNearby: shouldExpand,
        sort,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: offset + limitNum < totalCount,
      },
      moduleBreakdown: moduleCounts,
      results: paginatedResults,
    });
  } catch (err) {
    console.error('[UNIVERSAL_SEARCH_ERROR]', err);
    return res.status(500).json({
      error: { code: 'SEARCH_FAILED', message: 'Failed to execute search.' },
    });
  }
}

/**
 * Real available search suggestions matching titles, business names, categories
 */
export async function getSearchSuggestions(req, res) {
  try {
    const { q, limit = 6 } = req.query;
    const queryText = (q || '').trim();

    if (!queryText || queryText.length < 1) {
      return res.json({ success: true, suggestions: [] });
    }

    const limitNum = Math.min(10, Math.max(1, parseInt(limit, 10) || 6));
    const searchPattern = `%${queryText.toLowerCase()}%`;

    const [listingRows] = await executeQuery(
      `SELECT DISTINCT title, category, module 
       FROM listings 
       WHERE status = 'published' AND (LOWER(title) LIKE ? OR LOWER(category) LIKE ?)
       LIMIT ?`,
      [searchPattern, searchPattern, limitNum]
    );

    const [bizRows] = await executeQuery(
      `SELECT DISTINCT name, category 
       FROM business_profiles 
       WHERE status = 'active' AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)
       LIMIT ?`,
      [searchPattern, searchPattern, limitNum]
    );

    const [emergRows] = await executeQuery(
      `SELECT DISTINCT name, category 
       FROM emergency_contacts 
       WHERE status = 'active' AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)
       LIMIT 4`,
      [searchPattern, searchPattern]
    );

    const suggestions = [];
    for (const item of listingRows) {
      suggestions.push({
        text: item.title,
        category: item.category,
        module: item.module,
        type: 'listing',
      });
    }

    for (const item of bizRows) {
      suggestions.push({
        text: item.name,
        category: item.category,
        module: 'directory',
        type: 'business',
      });
    }

    for (const item of emergRows) {
      suggestions.push({
        text: item.name,
        category: item.category,
        module: 'emergency',
        type: 'emergency',
      });
    }

    // Deduplicate suggestions by text
    const seen = new Set();
    const unique = [];
    for (const s of suggestions) {
      const lower = s.text.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(s);
      }
      if (unique.length >= limitNum) break;
    }

    return res.json({
      success: true,
      suggestions: unique,
    });
  } catch (err) {
    console.error('[SEARCH_SUGGESTIONS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'SUGGESTIONS_FAILED', message: 'Failed to fetch search suggestions.' },
    });
  }
}

/**
 * Get private search history for authenticated user
 */
export async function getSearchHistory(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await executeQuery(
      `SELECT id, query_text, module_filter, area_id, created_at
       FROM user_search_history 
       WHERE user_id = ?
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    return res.json({
      success: true,
      history: rows,
    });
  } catch (err) {
    console.error('[GET_SEARCH_HISTORY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'HISTORY_FAILED', message: 'Failed to retrieve search history.' },
    });
  }
}

/**
 * Clear private search history for authenticated user
 */
export async function clearSearchHistory(req, res) {
  try {
    const userId = req.user.id;
    await executeQuery('DELETE FROM user_search_history WHERE user_id = ?', [userId]);

    return res.json({
      success: true,
      message: 'Search history cleared successfully.',
    });
  } catch (err) {
    console.error('[CLEAR_SEARCH_HISTORY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'CLEAR_HISTORY_FAILED', message: 'Failed to clear search history.' },
    });
  }
}
