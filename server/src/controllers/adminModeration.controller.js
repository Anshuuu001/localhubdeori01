import crypto from 'crypto';
import { executeQuery, withTransaction } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';

// Map module to permission ID
const MODULE_PERMISSION_MAP = {
  jobs: 'moderation.listings.review',
  rentals: 'moderation.listings.review',
  marketplace: 'moderation.listings.review',
  krishi_products: 'moderation.listings.review',
  krishi_equipment: 'moderation.listings.review',
  services: 'moderation.listings.review',
  business_directory: 'moderation.listings.review',
  events: 'moderation.events.review',
  news: 'moderation.news.review',
  govt_notices: 'moderation.notices.review',
  emergency_contacts: 'moderation.emergency.review',
};

async function hasModulePermission(user, moduleKey) {
  if (!user) return false;
  const role = user.role || 'citizen';
  if (role === 'super_admin') return true;

  const permId = MODULE_PERMISSION_MAP[moduleKey];
  if (!permId) return false;

  // Check explicit grant
  const [userPerms] = await executeQuery(
    'SELECT permission_id FROM admin_user_permissions WHERE user_id = ? AND permission_id = ?',
    [user.id, permId]
  );
  if (userPerms.length > 0) return true;

  // Check role template
  const [rolePerms] = await executeQuery(
    'SELECT permission_id FROM role_permissions WHERE role_id = ? AND permission_id = ?',
    [role, permId]
  );
  return rolePerms.length > 0;
}

/**
 * Get unified moderation queue with multi-criteria filters and pagination.
 */
export async function getModerationQueue(req, res) {
  try {
    const {
      module = 'all',
      status = 'pending_review',
      search = '',
      dateFrom = null,
      dateTo = null,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const items = [];

    // Helper for date filtering
    const buildDateFilter = (colName) => {
      let clause = '';
      const params = [];
      if (dateFrom) {
        clause += ` AND ${colName} >= ?`;
        params.push(dateFrom);
      }
      if (dateTo) {
        clause += ` AND ${colName} <= ?`;
        params.push(dateTo);
      }
      return { clause, params };
    };

    // 1. Listings (Jobs, Rentals, Marketplace, Krishi, Services)
    const listingModules = ['jobs', 'rentals', 'marketplace', 'krishi_products', 'krishi_equipment', 'services'];
    if (module === 'all' || listingModules.includes(module)) {
      let lSql = `
        SELECT 
          l.id,
          l.module,
          l.title,
          l.category,
          l.description,
          l.price,
          l.price_period,
          l.status,
          l.moderation_notes,
          l.created_at,
          bp.name AS business_name,
          u.full_name AS submitter_name,
          u.email AS submitter_email,
          u.phone AS submitter_phone
        FROM listings l
        LEFT JOIN business_profiles bp ON l.business_profile_id = bp.id
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 1=1
      `;
      const lParams = [];

      if (module !== 'all') {
        lSql += ' AND l.module = ?';
        lParams.push(module);
      }

      if (status !== 'all') {
        lSql += ' AND l.status = ?';
        lParams.push(status);
      }

      if (search.trim()) {
        lSql += ' AND (l.title LIKE ? OR l.description LIKE ? OR bp.name LIKE ?)';
        const s = `%${search.trim()}%`;
        lParams.push(s, s, s);
      }

      const { clause: dClause, params: dParams } = buildDateFilter('l.created_at');
      lSql += dClause;
      lParams.push(...dParams);

      lSql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
      lParams.push(limitNum, offset);

      const [lRows] = await executeQuery(lSql, lParams);
      lRows.forEach(row => {
        items.push({
          id: row.id,
          module: row.module,
          title: row.title,
          category: row.category,
          summary: row.description ? row.description.slice(0, 150) : '',
          status: row.status,
          moderationNotes: row.moderation_notes,
          submitterName: row.submitter_name,
          submitterContact: row.submitter_phone || row.submitter_email,
          businessName: row.business_name,
          createdAt: row.created_at,
          targetType: 'listing',
        });
      });
    }

    // 2. Events Desk
    if (module === 'all' || module === 'events') {
      let eSql = `
        SELECT 
          e.id,
          e.title,
          e.category,
          e.description,
          e.start_date,
          e.venue,
          e.status,
          e.moderation_notes,
          e.created_at,
          e.organizer_name,
          u.full_name AS submitter_name
        FROM events e
        LEFT JOIN users u ON e.created_by_user_id = u.id
        WHERE 1=1
      `;
      const eParams = [];

      if (status !== 'all') {
        eSql += ' AND e.status = ?';
        eParams.push(status);
      }

      if (search.trim()) {
        eSql += ' AND (e.title LIKE ? OR e.description LIKE ? OR e.organizer_name LIKE ?)';
        const s = `%${search.trim()}%`;
        eParams.push(s, s, s);
      }

      const { clause: dClause, params: dParams } = buildDateFilter('e.created_at');
      eSql += dClause;
      eParams.push(...dParams);

      eSql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
      eParams.push(limitNum, offset);

      const [eRows] = await executeQuery(eSql, eParams);
      eRows.forEach(row => {
        items.push({
          id: row.id,
          module: 'events',
          title: row.title,
          category: row.category,
          summary: `${row.venue} | ${row.start_date}`,
          status: row.status,
          moderationNotes: row.moderation_notes,
          submitterName: row.submitter_name || row.organizer_name,
          createdAt: row.created_at,
          targetType: 'event',
        });
      });
    }

    // 3. News Feed
    if (module === 'all' || module === 'news') {
      let nSql = `
        SELECT 
          n.id,
          n.headline,
          n.category,
          n.summary,
          n.source_name,
          n.status,
          n.moderation_notes,
          n.created_at,
          u.full_name AS submitter_name
        FROM news_articles n
        LEFT JOIN users u ON n.submitted_by_user_id = u.id
        WHERE 1=1
      `;
      const nParams = [];

      if (status !== 'all') {
        nSql += ' AND n.status = ?';
        nParams.push(status);
      }

      if (search.trim()) {
        nSql += ' AND (n.headline LIKE ? OR n.summary LIKE ? OR n.source_name LIKE ?)';
        const s = `%${search.trim()}%`;
        nParams.push(s, s, s);
      }

      const { clause: dClause, params: dParams } = buildDateFilter('n.created_at');
      nSql += dClause;
      nParams.push(...dParams);

      nSql += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
      nParams.push(limitNum, offset);

      const [nRows] = await executeQuery(nSql, nParams);
      nRows.forEach(row => {
        items.push({
          id: row.id,
          module: 'news',
          title: row.headline,
          category: row.category,
          summary: row.summary,
          status: row.status,
          moderationNotes: row.moderation_notes,
          submitterName: row.submitter_name,
          sourceName: row.source_name,
          createdAt: row.created_at,
          targetType: 'news_article',
        });
      });
    }

    // 4. Govt Notices
    if (module === 'all' || module === 'govt_notices') {
      let gSql = `
        SELECT 
          g.id,
          g.notice_title,
          g.issuing_authority,
          g.summary,
          g.issue_date,
          g.deadline_date,
          g.is_official_verified,
          g.status,
          g.moderation_notes,
          g.created_at,
          u.full_name AS submitter_name
        FROM govt_notices g
        LEFT JOIN users u ON g.created_by_user_id = u.id
        WHERE 1=1
      `;
      const gParams = [];

      if (status !== 'all') {
        gSql += ' AND g.status = ?';
        gParams.push(status);
      }

      if (search.trim()) {
        gSql += ' AND (g.notice_title LIKE ? OR g.issuing_authority LIKE ?)';
        const s = `%${search.trim()}%`;
        gParams.push(s, s, s);
      }

      const { clause: dClause, params: dParams } = buildDateFilter('g.created_at');
      gSql += dClause;
      gParams.push(...dParams);

      gSql += ' ORDER BY g.created_at DESC LIMIT ? OFFSET ?';
      gParams.push(limitNum, offset);

      const [gRows] = await executeQuery(gSql, gParams);
      gRows.forEach(row => {
        items.push({
          id: row.id,
          module: 'govt_notices',
          title: row.notice_title,
          category: row.issuing_authority,
          summary: row.summary,
          status: row.status,
          moderationNotes: row.moderation_notes,
          submitterName: row.submitter_name,
          createdAt: row.created_at,
          targetType: 'govt_notice',
        });
      });
    }

    // 5. Emergency Contacts
    if (module === 'all' || module === 'emergency_contacts') {
      let emSql = `
        SELECT 
          id,
          name,
          department,
          category,
          primary_phone,
          authoritative_source,
          is_verified,
          status,
          created_at
        FROM emergency_contacts
        WHERE 1=1
      `;
      const emParams = [];

      if (status === 'pending_review' || status === 'under_review') {
        emSql += ' AND (status = ? OR is_verified = FALSE)';
        emParams.push(status);
      } else if (status !== 'all') {
        emSql += ' AND status = ?';
        emParams.push(status);
      }

      if (search.trim()) {
        emSql += ' AND (name LIKE ? OR department LIKE ? OR primary_phone LIKE ?)';
        const s = `%${search.trim()}%`;
        emParams.push(s, s, s);
      }

      emSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      emParams.push(limitNum, offset);

      const [emRows] = await executeQuery(emSql, emParams);
      emRows.forEach(row => {
        items.push({
          id: row.id,
          module: 'emergency_contacts',
          title: `${row.name} (${row.department})`,
          category: row.category,
          summary: `Helpline: ${row.primary_phone} | Source: ${row.authoritative_source}`,
          status: row.status,
          isVerified: Boolean(row.is_verified),
          createdAt: row.created_at,
          targetType: 'emergency_contact',
        });
      });
    }

    // Sort combined results by createdAt descending
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      items: items.slice(0, limitNum),
      count: items.length,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('[GET_MODERATION_QUEUE_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve moderation queue.' },
    });
  }
}

/**
 * Get detailed inspection data for an item in moderation.
 */
export async function getModerationItemDetail(req, res) {
  try {
    const { module: itemModule, id } = req.params;

    let itemData = null;
    let submitter = null;
    let priorHistory = [];

    // Query decisions history
    const [historyRows] = await executeQuery(
      `SELECT 
        mdh.*, 
        u.full_name AS reviewer_name,
        u.role AS reviewer_role
       FROM moderation_decisions_history mdh
       JOIN users u ON mdh.reviewer_user_id = u.id
       WHERE mdh.module = ? AND mdh.target_id = ?
       ORDER BY mdh.created_at DESC`,
      [itemModule, id]
    );
    priorHistory = historyRows;

    const listingModules = ['jobs', 'rentals', 'marketplace', 'krishi_products', 'krishi_equipment', 'services'];
    if (listingModules.includes(itemModule)) {
      const [rows] = await executeQuery(
        `SELECT l.*, bp.name AS business_name, bp.phone AS business_phone, bp.verification_status AS business_verif_status,
                u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone
         FROM listings l
         LEFT JOIN business_profiles bp ON l.business_profile_id = bp.id
         LEFT JOIN users u ON l.user_id = u.id
         WHERE l.id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Listing not found.' } });
      }
      itemData = rows[0];

      // Fetch module subtable
      if (itemModule === 'jobs') {
        const [sub] = await executeQuery('SELECT * FROM listing_jobs WHERE listing_id = ?', [id]);
        itemData.jobDetails = sub[0] || null;
      } else if (itemModule === 'rentals') {
        const [sub] = await executeQuery('SELECT * FROM listing_rentals WHERE listing_id = ?', [id]);
        itemData.rentalDetails = sub[0] || null;
      } else if (itemModule === 'marketplace') {
        const [sub] = await executeQuery('SELECT * FROM listing_marketplace WHERE listing_id = ?', [id]);
        itemData.marketplaceDetails = sub[0] || null;
      } else if (itemModule.startsWith('krishi')) {
        const [sub] = await executeQuery('SELECT * FROM listing_krishi WHERE listing_id = ?', [id]);
        itemData.krishiDetails = sub[0] || null;
      } else if (itemModule === 'services') {
        const [sub] = await executeQuery('SELECT * FROM listing_services WHERE listing_id = ?', [id]);
        itemData.serviceDetails = sub[0] || null;
      }
    } else if (itemModule === 'events') {
      const [rows] = await executeQuery(
        `SELECT e.*, u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone
         FROM events e
         LEFT JOIN users u ON e.created_by_user_id = u.id
         WHERE e.id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Event not found.' } });
      }
      itemData = rows[0];
    } else if (itemModule === 'news') {
      const [rows] = await executeQuery(
        `SELECT n.*, u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone
         FROM news_articles n
         LEFT JOIN users u ON n.submitted_by_user_id = u.id
         WHERE n.id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'News article not found.' } });
      }
      itemData = rows[0];
    } else if (itemModule === 'govt_notices') {
      const [rows] = await executeQuery(
        `SELECT g.*, u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone
         FROM govt_notices g
         LEFT JOIN users u ON g.created_by_user_id = u.id
         WHERE g.id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notice not found.' } });
      }
      itemData = rows[0];
    } else if (itemModule === 'emergency_contacts') {
      const [rows] = await executeQuery('SELECT * FROM emergency_contacts WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Emergency contact not found.' } });
      }
      itemData = rows[0];
    } else {
      return res.status(400).json({ error: { code: 'INVALID_MODULE', message: 'Unknown module.' } });
    }

    return res.json({
      item: itemData,
      history: priorHistory,
    });
  } catch (err) {
    console.error('[GET_MODERATION_ITEM_DETAIL_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve moderation details.' },
    });
  }
}

/**
 * Record a consequential moderation decision (Approve, Reject, Request Changes, Hold, Remove).
 * Enforces least privilege module permission check and mandatory reasons.
 */
export async function recordModerationDecision(req, res) {
  try {
    const {
      module: itemModule,
      id,
      decision,
      reason,
      notes,
    } = req.body;

    const validDecisions = ['approve_publish', 'reject', 'request_changes', 'hold_review', 'remove_unpublish'];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DECISION',
          message: `Decision must be one of: ${validDecisions.join(', ')}.`,
        },
      });
    }

    if (!itemModule || !id) {
      return res.status(400).json({
        error: { code: 'MISSING_TARGET', message: 'Both module and target identifier are required.' },
      });
    }

    // Server-side module permission verification
    const allowed = await hasModulePermission(req.user, itemModule);
    if (!allowed) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `You lack administrative permission to moderate the '${itemModule}' module.`,
        },
      });
    }

    // Mandatory reason for non-approval decisions
    if (decision !== 'approve_publish' && (!reason || reason.trim().length < 5)) {
      return res.status(400).json({
        error: {
          code: 'REASON_REQUIRED',
          message: 'A clear, meaningful reason (minimum 5 characters) is required for rejections, holds, or removals.',
        },
      });
    }

    const reviewerId = req.user.id;
    let newStatus = 'pending_review';
    let previousStatus = null;
    let notifyUserId = null;
    let notifyTitle = '';
    let notifyMessage = '';

    await withTransaction(async (conn) => {
      const listingModules = ['jobs', 'rentals', 'marketplace', 'krishi_products', 'krishi_equipment', 'services'];

      if (listingModules.includes(itemModule)) {
        const [rows] = await conn.execute('SELECT status, user_id, title FROM listings WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) throw new Error('NOT_FOUND: Listing not found.');
        previousStatus = rows[0].status;
        notifyUserId = rows[0].user_id;

        if (decision === 'approve_publish') newStatus = 'published';
        else if (decision === 'reject') newStatus = 'rejected';
        else if (decision === 'request_changes') newStatus = 'action_needed';
        else if (decision === 'hold_review') newStatus = 'under_review';
        else if (decision === 'remove_unpublish') newStatus = 'removed';

        await conn.execute(
          'UPDATE listings SET status = ?, moderation_notes = ? WHERE id = ?',
          [newStatus, notes || reason || null, id]
        );

        notifyTitle = `Listing ${decision === 'approve_publish' ? 'Approved' : 'Status Update'}: ${rows[0].title}`;
        notifyMessage = decision === 'approve_publish'
          ? 'Your listing has been approved and published to the public directory.'
          : `Moderation notice: ${reason}. Notes: ${notes || 'None'}`;
      } else if (itemModule === 'events') {
        const [rows] = await conn.execute('SELECT status, created_by_user_id, title FROM events WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) throw new Error('NOT_FOUND: Event not found.');
        previousStatus = rows[0].status;
        notifyUserId = rows[0].created_by_user_id;

        if (decision === 'approve_publish') newStatus = 'published';
        else if (decision === 'reject') newStatus = 'rejected';
        else if (decision === 'hold_review') newStatus = 'pending_review';
        else if (decision === 'remove_unpublish') newStatus = 'cancelled';

        await conn.execute(
          'UPDATE events SET status = ?, moderation_notes = ?, rejection_reason = ?, reviewed_by_user_id = ?, reviewed_at = NOW() WHERE id = ?',
          [newStatus, notes || null, reason || null, reviewerId, id]
        );

        notifyTitle = `Event ${decision === 'approve_publish' ? 'Approved' : 'Moderation Notice'}: ${rows[0].title}`;
        notifyMessage = decision === 'approve_publish'
          ? 'Your event has been approved and is now visible on the Taluka Events Desk.'
          : `Event review decision: ${reason}`;
      } else if (itemModule === 'news') {
        const [rows] = await conn.execute('SELECT status, submitted_by_user_id, headline FROM news_articles WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) throw new Error('NOT_FOUND: News article not found.');
        previousStatus = rows[0].status;
        notifyUserId = rows[0].submitted_by_user_id;

        if (decision === 'approve_publish') newStatus = 'published';
        else if (decision === 'reject') newStatus = 'rejected';
        else if (decision === 'hold_review') newStatus = 'pending_review';
        else if (decision === 'remove_unpublish') newStatus = 'archived';

        await conn.execute(
          `UPDATE news_articles 
           SET status = ?, 
               moderation_notes = ?, 
               rejection_reason = ?, 
               reviewed_by_user_id = ?, 
               reviewed_at = NOW(), 
               published_at = ${decision === 'approve_publish' ? 'COALESCE(published_at, NOW())' : 'published_at'}
           WHERE id = ?`,
          [newStatus, notes || null, reason || null, reviewerId, id]
        );

        notifyTitle = `News Article ${decision === 'approve_publish' ? 'Published' : 'Moderated'}: ${rows[0].headline}`;
        notifyMessage = decision === 'approve_publish'
          ? 'Your local news report has been verified and published to the feed.'
          : `News report review note: ${reason}`;
      } else if (itemModule === 'govt_notices') {
        const [rows] = await conn.execute('SELECT status, created_by_user_id, notice_title FROM govt_notices WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) throw new Error('NOT_FOUND: Notice not found.');
        previousStatus = rows[0].status;
        notifyUserId = rows[0].created_by_user_id;

        if (decision === 'approve_publish') newStatus = 'published';
        else if (decision === 'reject') newStatus = 'pending_review';
        else if (decision === 'remove_unpublish') newStatus = 'archived';

        await conn.execute(
          `UPDATE govt_notices 
           SET status = ?, 
               moderation_notes = ?, 
               is_official_verified = ${decision === 'approve_publish' ? 'TRUE' : 'FALSE'}, 
               verified_by_user_id = ?, 
               verified_at = ${decision === 'approve_publish' ? 'NOW()' : 'NULL'}
           WHERE id = ?`,
          [newStatus, notes || reason || null, reviewerId, id]
        );

        notifyTitle = `Government Notice ${decision === 'approve_publish' ? 'Verified' : 'Updated'}: ${rows[0].notice_title}`;
        notifyMessage = decision === 'approve_publish'
          ? 'Notice verified against authoritative records and published.'
          : `Notice status updated: ${reason}`;
      } else if (itemModule === 'emergency_contacts') {
        const [rows] = await conn.execute('SELECT status, name, primary_phone FROM emergency_contacts WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) throw new Error('NOT_FOUND: Emergency contact not found.');
        previousStatus = rows[0].status;

        if (decision === 'approve_publish') {
          newStatus = 'active';
          await conn.execute(
            'UPDATE emergency_contacts SET status = ?, is_verified = TRUE, last_verified_at = NOW(), verified_by_user_id = ? WHERE id = ?',
            [newStatus, reviewerId, id]
          );
        } else if (decision === 'remove_unpublish') {
          newStatus = 'inactive';
          await conn.execute(
            'UPDATE emergency_contacts SET status = ? WHERE id = ?',
            [newStatus, id]
          );
        } else {
          newStatus = 'under_review';
          await conn.execute(
            'UPDATE emergency_contacts SET status = ? WHERE id = ?',
            [newStatus, id]
          );
        }
      }

      // Record in moderation decision history
      const historyId = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO moderation_decisions_history 
          (id, module, target_id, decision, previous_status, new_status, reason, reviewer_user_id, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyId,
          itemModule,
          id,
          decision,
          previousStatus,
          newStatus,
          reason || notes || null,
          reviewerId,
          JSON.stringify({ notes }),
        ]
      );
    });

    // Write audit log
    await logAuditEvent({
      actorId: reviewerId,
      actorRole: req.user.role,
      action: `moderation.${decision}`,
      entityType: itemModule,
      entityId: id,
      details: { decision, previousStatus, newStatus, reason, notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Send in-app notification if user is identified
    if (notifyUserId) {
      createNotification({
        userId: notifyUserId,
        actorUserId: reviewerId,
        notificationType: 'moderation_decision',
        title: notifyTitle,
        message: notifyMessage,
        targetType: itemModule,
        targetId: id,
      }).catch(() => {});
    }

    return res.json({
      message: `Moderation decision successfully recorded: ${decision}.`,
      module: itemModule,
      id,
      previousStatus,
      newStatus,
      decision,
    });
  } catch (err) {
    console.error('[RECORD_MODERATION_DECISION_ERROR]', err);
    if (err.message && err.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record moderation decision.' },
    });
  }
}
