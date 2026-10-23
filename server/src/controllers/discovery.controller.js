import { executeQuery } from '../config/database.js';

/**
 * GET /api/discovery/feed
 * Unified Taluka local discovery feed aggregating currently eligible published records:
 * - Official Government Circulars (Tahsildar / Panchayat / District)
 * - Ground-Level Taluka News & APMC Agricultural Reports
 * - Upcoming Community Events & Haat Bazaars
 * - Key Local Marketplace Listings & Krishi Equipment
 */
export async function getDiscoveryFeed(req, res) {
  try {
    const { areaId = 'all', category = 'all', limit = 10 } = req.query;
    const limitNum = Math.min(25, Math.max(1, parseInt(limit, 10) || 10));

    const feedItems = [];

    // 1. Fetch latest Government Notices
    const noticeConditions = ["gn.status = 'published'"];
    const noticeParams = [];

    if (areaId && areaId !== 'all') {
      noticeConditions.push('(gn.area_id = ? OR gn.area_id IS NULL)');
      noticeParams.push(areaId);
    }

    const [noticeRows] = await executeQuery(
      `SELECT 
        gn.id, gn.notice_title, gn.summary, gn.issuing_authority, 
        gn.deadline_date, gn.issue_date, gn.created_at,
        ta.name AS area_name, ta.marathi_name AS area_marathi_name
       FROM govt_notices gn
       LEFT JOIN taluka_areas ta ON gn.area_id = ta.id
       WHERE ${noticeConditions.join(' AND ')}
       ORDER BY gn.created_at DESC
       LIMIT 4`,
      noticeParams
    );

    for (const n of noticeRows) {
      feedItems.push({
        id: `notice-${n.id}`,
        originalId: n.id,
        feedType: 'notice',
        title: n.notice_title,
        excerpt: n.summary,
        category: 'Official Notice',
        sourceName: n.issuing_authority,
        areaName: n.area_name || 'Deori Taluka',
        date: n.issue_date || n.created_at,
        deadlineDate: n.deadline_date,
        isOfficialSource: true,
        verifiedBadge: {
          label: 'Official Government Circular',
          verified: true,
        },
        action: {
          type: 'view_notice',
          label: 'Read Circular',
          targetModule: 'taluka-news-feed',
        },
      });
    }

    // 2. Fetch latest News Articles
    const newsConditions = ["n.status = 'published'"];
    const newsParams = [];

    if (areaId && areaId !== 'all') {
      newsConditions.push('n.area_id = ?');
      newsParams.push(areaId);
    }

    const [newsRows] = await executeQuery(
      `SELECT 
        n.id, n.headline, n.summary, n.category, n.source_name, 
        (n.evidence_url IS NOT NULL) AS fact_checked, n.published_at, n.created_at,
        ta.name AS area_name, ta.marathi_name AS area_marathi_name
       FROM news_articles n
       LEFT JOIN taluka_areas ta ON n.area_id = ta.id
       WHERE ${newsConditions.join(' AND ')}
       ORDER BY n.published_at DESC
       LIMIT 4`,
      newsParams
    );

    for (const nw of newsRows) {
      feedItems.push({
        id: `news-${nw.id}`,
        originalId: nw.id,
        feedType: 'news',
        title: nw.headline,
        excerpt: nw.summary,
        category: nw.category,
        sourceName: nw.source_name,
        areaName: nw.area_name || 'Deori Taluka',
        date: nw.published_at || nw.created_at,
        isOfficialSource: false,
        verifiedBadge: nw.fact_checked
          ? { label: 'Fact-Checked Report', verified: true }
          : { label: 'Grassroots Journalism', verified: false },
        action: {
          type: 'view_news',
          label: 'Read Full Report',
          targetModule: 'taluka-news-feed',
        },
      });
    }

    // 3. Fetch upcoming Community Events
    const eventConditions = ["e.status = 'published'", 'e.end_date >= CURRENT_DATE()'];
    const eventParams = [];

    if (areaId && areaId !== 'all') {
      eventConditions.push('e.area_id = ?');
      eventParams.push(areaId);
    }

    const [eventRows] = await executeQuery(
      `SELECT 
        e.id, e.title, e.description, e.category, e.venue, e.organizer_name,
        e.start_date, e.end_date, e.created_at,
        ta.name AS area_name, ta.marathi_name AS area_marathi_name
       FROM events e
       LEFT JOIN taluka_areas ta ON e.area_id = ta.id
       WHERE ${eventConditions.join(' AND ')}
       ORDER BY e.start_date ASC
       LIMIT 3`,
      eventParams
    );

    for (const ev of eventRows) {
      feedItems.push({
        id: `event-${ev.id}`,
        originalId: ev.id,
        feedType: 'event',
        title: ev.title,
        excerpt: `Venue: ${ev.venue} • Starts: ${new Date(ev.start_date).toLocaleDateString()}`,
        category: ev.category,
        sourceName: ev.organizer_name,
        areaName: ev.area_name || 'Deori Taluka',
        date: ev.start_date,
        isOfficialSource: false,
        verifiedBadge: { label: 'Civic Gathering', verified: true },
        action: {
          type: 'view_event',
          label: 'Event Details',
          targetModule: 'events-desk',
        },
      });
    }

    // 4. Fetch latest featured / published listings
    const listingConditions = ["l.status = 'published'"];
    const listingParams = [];

    if (areaId && areaId !== 'all') {
      listingConditions.push('l.taluka_area_id = ?');
      listingParams.push(areaId);
    }

    const [listingRows] = await executeQuery(
      `SELECT 
        l.id, l.module, l.title, l.category, l.price, l.price_period, 
        l.description, l.photos, l.created_at,
        ta.name AS area_name,
        bp.name AS business_name, bp.verification_status
       FROM listings l
       LEFT JOIN taluka_areas ta ON l.taluka_area_id = ta.id
       LEFT JOIN business_profiles bp ON l.business_profile_id = bp.id
       WHERE ${listingConditions.join(' AND ')}
       ORDER BY l.created_at DESC
       LIMIT 3`,
      listingParams
    );

    for (const l of listingRows) {
      let slug = 'jobs-hub';
      if (l.module === 'rentals') slug = 'rentals-pg';
      else if (l.module === 'marketplace') slug = 'marketplace';
      else if (l.module === 'krishi_products' || l.module === 'krishi_equipment') slug = 'krishi-bazaar';
      else if (l.module === 'services') slug = 'local-services';

      feedItems.push({
        id: `listing-${l.id}`,
        originalId: l.id,
        feedType: 'listing',
        title: l.title,
        excerpt: l.description ? l.description.slice(0, 150) : '',
        category: l.category,
        sourceName: l.business_name || 'Local Citizen Provider',
        areaName: l.area_name || 'Deori Taluka',
        date: l.created_at,
        isOfficialSource: false,
        verifiedBadge: l.verification_status === 'verified'
          ? { label: 'Verified Trade Provider', verified: true }
          : null,
        action: {
          type: 'view_listing',
          label: 'View Listing',
          targetModule: slug,
        },
      });
    }

    // Sort feed items: prioritize official government circulars, then newest first
    feedItems.sort((a, b) => {
      if (a.isOfficialSource && !b.isOfficialSource) return -1;
      if (!a.isOfficialSource && b.isOfficialSource) return 1;
      return new Date(b.date) - new Date(a.date);
    });

    const paginated = feedItems.slice(0, limitNum);

    return res.json({
      success: true,
      areaId,
      totalCount: feedItems.length,
      items: paginated,
    });
  } catch (err) {
    console.error('[GET_DISCOVERY_FEED_ERROR]', err);
    return res.status(500).json({
      error: { code: 'FEED_FAILED', message: 'Failed to retrieve local discovery feed.' },
    });
  }
}
