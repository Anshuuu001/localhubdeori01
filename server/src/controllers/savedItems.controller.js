import crypto from 'crypto';
import { executeQuery } from '../config/database.js';

const VALID_ITEM_TYPES = new Set(['listing', 'business', 'event', 'news', 'notice', 'emergency']);

/**
 * List saved items for the authenticated user with real-time live availability status
 */
export async function listSavedItems(req, res) {
  try {
    const userId = req.user.id;
    const { module, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['s.user_id = ?'];
    const params = [userId];

    if (module && module !== 'all') {
      conditions.push('s.module = ?');
      params.push(module);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count
    const [countRows] = await executeQuery(
      `SELECT COUNT(*) AS total FROM saved_items s ${whereClause}`,
      params
    );
    const totalCount = countRows[0]?.total || 0;

    // Fetch saved entries
    const [savedRows] = await executeQuery(
      `SELECT 
        s.id AS saved_id,
        s.item_type,
        s.item_id,
        s.module,
        s.notes,
        s.created_at AS saved_at
       FROM saved_items s
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // Resolve live status and details for each saved entity
    const resolvedItems = [];

    for (const saved of savedRows) {
      let resolved = {
        savedId: saved.saved_id,
        itemType: saved.item_type,
        itemId: saved.item_id,
        module: saved.module,
        savedAt: saved.saved_at,
        notes: saved.notes,
        title: 'Unknown or Removed Item',
        summary: '',
        category: '',
        areaName: 'Deori Taluka',
        price: null,
        pricePeriod: null,
        liveStatus: 'unavailable', // 'available' | 'unavailable' | 'removed' | 'expired' | 'under_review'
        isAvailable: false,
        badge: null,
        detailUrl: '',
      };

      if (saved.item_type === 'listing') {
        const [rows] = await executeQuery(
          `SELECT 
            l.id, l.title, l.description, l.category, l.price, l.price_period, 
            l.status, l.availability_status, l.photos, l.taluka_area_id,
            ta.name AS area_name,
            bp.name AS business_name, bp.verification_status
           FROM listings l
           LEFT JOIN taluka_areas ta ON l.taluka_area_id = ta.id
           LEFT JOIN business_profiles bp ON l.business_profile_id = bp.id
           WHERE l.id = ?`,
          [saved.item_id]
        );

        if (rows.length > 0) {
          const l = rows[0];
          let photos = [];
          try {
            photos = typeof l.photos === 'string' ? JSON.parse(l.photos) : l.photos || [];
          } catch {
            photos = [];
          }

          let liveStatus = 'available';
          let isAvailable = true;

          if (l.status === 'under_review' || l.status === 'action_needed') {
            liveStatus = 'under_review';
            isAvailable = false;
          } else if (l.status === 'rejected' || l.status === 'removed') {
            liveStatus = 'removed';
            isAvailable = false;
          } else if (l.availability_status === 'rented' || l.availability_status === 'sold') {
            liveStatus = 'unavailable';
            isAvailable = false;
          }

          resolved = {
            ...resolved,
            title: l.title,
            summary: l.description ? l.description.slice(0, 160) : '',
            category: l.category,
            areaName: l.area_name || 'Deori Taluka',
            price: l.price !== null ? Number(l.price) : null,
            pricePeriod: l.price_period,
            liveStatus,
            isAvailable,
            badge: l.verification_status === 'verified' ? { label: 'Verified Provider' } : null,
            photos,
            businessName: l.business_name,
          };
        } else {
          resolved.liveStatus = 'removed';
          resolved.isAvailable = false;
        }
      } else if (saved.item_type === 'business') {
        const [rows] = await executeQuery(
          `SELECT bp.id, bp.name, bp.description, bp.category, bp.status, bp.verification_status, ta.name AS area_name
           FROM business_profiles bp
           LEFT JOIN taluka_areas ta ON bp.taluka_area_id = ta.id
           WHERE bp.id = ?`,
          [saved.item_id]
        );

        if (rows.length > 0) {
          const b = rows[0];
          const isAvail = b.status === 'active';
          resolved = {
            ...resolved,
            title: b.name,
            summary: b.description ? b.description.slice(0, 160) : '',
            category: b.category,
            areaName: b.area_name || 'Deori Taluka',
            liveStatus: isAvail ? 'available' : 'unavailable',
            isAvailable: isAvail,
            badge: b.verification_status === 'verified' ? { label: 'Verified Business' } : null,
          };
        }
      } else if (saved.item_type === 'event') {
        const [rows] = await executeQuery(
          `SELECT e.id, e.title, e.description, e.category, e.venue, e.start_date, e.end_date, e.status, ta.name AS area_name
           FROM events e
           LEFT JOIN taluka_areas ta ON e.area_id = ta.id
           WHERE e.id = ?`,
          [saved.item_id]
        );

        if (rows.length > 0) {
          const ev = rows[0];
          const isPast = new Date(ev.end_date) < new Date();
          const isAvail = ev.status === 'published' && !isPast;
          resolved = {
            ...resolved,
            title: ev.title,
            summary: `Venue: ${ev.venue} • ${ev.description ? ev.description.slice(0, 120) : ''}`,
            category: ev.category,
            areaName: ev.area_name || 'Deori Taluka',
            liveStatus: isPast ? 'expired' : isAvail ? 'available' : 'unavailable',
            isAvailable: isAvail,
            badge: { label: 'Civic Event' },
          };
        }
      } else if (saved.item_type === 'news') {
        const [rows] = await executeQuery(
          `SELECT n.id, n.headline, n.summary, n.category, n.source_name, (n.evidence_url IS NOT NULL) AS fact_checked, n.status, ta.name AS area_name
           FROM news_articles n
           LEFT JOIN taluka_areas ta ON n.area_id = ta.id
           WHERE n.id = ?`,
          [saved.item_id]
        );

        if (rows.length > 0) {
          const nw = rows[0];
          resolved = {
            ...resolved,
            title: nw.headline,
            summary: nw.summary || '',
            category: nw.category,
            areaName: nw.area_name || 'Deori Taluka',
            liveStatus: nw.status === 'published' ? 'available' : 'unavailable',
            isAvailable: nw.status === 'published',
            badge: nw.fact_checked ? { label: 'Fact-Checked' } : null,
          };
        }
      } else if (saved.item_type === 'notice') {
        const [rows] = await executeQuery(
          `SELECT gn.id, gn.notice_title, gn.summary, gn.issuing_authority, gn.deadline_date, gn.status, ta.name AS area_name
           FROM govt_notices gn
           LEFT JOIN taluka_areas ta ON gn.area_id = ta.id
           WHERE gn.id = ?`,
          [saved.item_id]
        );

        if (rows.length > 0) {
          const nt = rows[0];
          const isPast = nt.deadline_date && new Date(nt.deadline_date) < new Date();
          resolved = {
            ...resolved,
            title: nt.notice_title,
            summary: `[${nt.issuing_authority}] ${nt.summary || ''}`,
            category: 'Government Notice',
            areaName: nt.area_name || 'Deori Taluka',
            liveStatus: isPast ? 'expired' : nt.status === 'published' ? 'available' : 'unavailable',
            isAvailable: nt.status === 'published' && !isPast,
            badge: { label: 'Official Authority' },
          };
        }
      } else if (saved.item_type === 'emergency') {
        const [rows] = await executeQuery(
          `SELECT ec.id, ec.name, ec.department, ec.category, ec.primary_phone, ec.status, ec.is_verified, ta.name AS area_name
           FROM emergency_contacts ec
           LEFT JOIN taluka_areas ta ON ec.area_id = ta.id
           WHERE ec.id = ?`,
          [saved.item_id]
        );

        if (rows.length > 0) {
          const em = rows[0];
          resolved = {
            ...resolved,
            title: em.name,
            summary: `${em.department} • Phone: ${em.primary_phone}`,
            category: em.category,
            areaName: em.area_name || 'Deori Taluka',
            liveStatus: em.status === 'active' ? 'available' : 'unavailable',
            isAvailable: em.status === 'active',
            badge: em.is_verified ? { label: 'Verified Helpline' } : null,
          };
        }
      }

      resolvedItems.push(resolved);
    }

    return res.json({
      success: true,
      items: resolvedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    console.error('[LIST_SAVED_ITEMS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'SAVED_ITEMS_ERROR', message: 'Failed to retrieve saved items.' },
    });
  }
}

/**
 * Save an item for the authenticated user (prevents duplicate saves)
 */
export async function saveItem(req, res) {
  try {
    const userId = req.user.id;
    const { itemType, itemId, module, notes } = req.body;

    if (!itemType || !VALID_ITEM_TYPES.has(itemType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ITEM_TYPE',
          message: `itemType must be one of: ${Array.from(VALID_ITEM_TYPES).join(', ')}`,
        },
      });
    }

    if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_ITEM_ID', message: 'itemId is required.' },
      });
    }

    const assignedModule = module || itemType;

    // Verify entity exists in database
    let entityExists = false;
    if (itemType === 'listing') {
      const [rows] = await executeQuery('SELECT id FROM listings WHERE id = ?', [itemId]);
      entityExists = rows.length > 0;
    } else if (itemType === 'business') {
      const [rows] = await executeQuery('SELECT id FROM business_profiles WHERE id = ?', [itemId]);
      entityExists = rows.length > 0;
    } else if (itemType === 'event') {
      const [rows] = await executeQuery('SELECT id FROM events WHERE id = ?', [itemId]);
      entityExists = rows.length > 0;
    } else if (itemType === 'news') {
      const [rows] = await executeQuery('SELECT id FROM news_articles WHERE id = ?', [itemId]);
      entityExists = rows.length > 0;
    } else if (itemType === 'notice') {
      const [rows] = await executeQuery('SELECT id FROM govt_notices WHERE id = ?', [itemId]);
      entityExists = rows.length > 0;
    } else if (itemType === 'emergency') {
      const [rows] = await executeQuery('SELECT id FROM emergency_contacts WHERE id = ?', [itemId]);
      entityExists = rows.length > 0;
    }

    if (!entityExists) {
      return res.status(404).json({
        error: { code: 'TARGET_NOT_FOUND', message: 'The item you are attempting to save does not exist.' },
      });
    }

    // Check duplicate
    const [existing] = await executeQuery(
      'SELECT id FROM saved_items WHERE user_id = ? AND item_type = ? AND item_id = ?',
      [userId, itemType, itemId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: { code: 'ALREADY_SAVED', message: 'This item is already bookmarked in your saved desk.' },
        savedId: existing[0].id,
      });
    }

    const savedId = crypto.randomUUID();
    await executeQuery(
      `INSERT INTO saved_items (id, user_id, item_type, item_id, module, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [savedId, userId, itemType, itemId, assignedModule, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Item saved successfully to your offline-accessible bookmarks.',
      savedId,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: { code: 'ALREADY_SAVED', message: 'Item already saved.' },
      });
    }
    console.error('[SAVE_ITEM_ERROR]', err);
    return res.status(500).json({
      error: { code: 'SAVE_FAILED', message: 'Failed to save item.' },
    });
  }
}

/**
 * Unsave an item by saved_id (Strict user isolation enforced)
 */
export async function unsaveItem(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await executeQuery(
      'DELETE FROM saved_items WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Saved item not found or belongs to another user.' },
      });
    }

    return res.json({
      success: true,
      message: 'Item removed from saved desk.',
    });
  } catch (err) {
    console.error('[UNSAVE_ITEM_ERROR]', err);
    return res.status(500).json({
      error: { code: 'UNSAVE_FAILED', message: 'Failed to unsave item.' },
    });
  }
}

/**
 * Unsave an item by target type and target ID
 */
export async function unsaveByTarget(req, res) {
  try {
    const userId = req.user.id;
    const { itemType, itemId } = req.params;

    const [result] = await executeQuery(
      'DELETE FROM saved_items WHERE user_id = ? AND item_type = ? AND item_id = ?',
      [userId, itemType, itemId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Bookmark not found.' },
      });
    }

    return res.json({
      success: true,
      message: 'Bookmark removed.',
    });
  } catch (err) {
    console.error('[UNSAVE_BY_TARGET_ERROR]', err);
    return res.status(500).json({
      error: { code: 'UNSAVE_FAILED', message: 'Failed to unsave item.' },
    });
  }
}

/**
 * Quick check if a specific item is saved by authenticated user
 */
export async function checkItemSaved(req, res) {
  try {
    const userId = req.user.id;
    const { itemType, itemId } = req.params;

    const [rows] = await executeQuery(
      'SELECT id FROM saved_items WHERE user_id = ? AND item_type = ? AND item_id = ?',
      [userId, itemType, itemId]
    );

    return res.json({
      success: true,
      isSaved: rows.length > 0,
      savedId: rows.length > 0 ? rows[0].id : null,
    });
  } catch (err) {
    console.error('[CHECK_ITEM_SAVED_ERROR]', err);
    return res.status(500).json({
      error: { code: 'CHECK_FAILED', message: 'Failed to check saved status.' },
    });
  }
}
