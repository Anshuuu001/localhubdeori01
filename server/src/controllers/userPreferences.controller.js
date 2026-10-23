import { executeQuery } from '../config/database.js';

const VALID_MODULE_SLUGS = new Set([
  'jobs-hub',
  'rentals-pg',
  'ride-delivery',
  'krishi-bazaar',
  'marketplace',
  'local-services',
  'events-desk',
  'taluka-news-feed',
  'business-directory',
  'emergency-contacts',
]);

/**
 * Get user preferences (pinned modules, preferred area)
 */
export async function getPreferences(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await executeQuery(
      `SELECT pinned_modules, preferred_area_id, interest_tags 
       FROM user_preferences 
       WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        preferences: {
          pinnedModules: [],
          preferredAreaId: null,
          interestTags: [],
        },
      });
    }

    const row = rows[0];
    let pinnedModules = [];
    try {
      pinnedModules = typeof row.pinned_modules === 'string' ? JSON.parse(row.pinned_modules) : row.pinned_modules || [];
    } catch {
      pinnedModules = [];
    }

    let interestTags = [];
    try {
      interestTags = typeof row.interest_tags === 'string' ? JSON.parse(row.interest_tags) : row.interest_tags || [];
    } catch {
      interestTags = [];
    }

    return res.json({
      success: true,
      preferences: {
        pinnedModules,
        preferredAreaId: row.preferred_area_id,
        interestTags,
      },
    });
  } catch (err) {
    console.error('[GET_PREFERENCES_ERROR]', err);
    return res.status(500).json({
      error: { code: 'PREFERENCES_FAILED', message: 'Failed to retrieve preferences.' },
    });
  }
}

/**
 * Update user preferences (pinned modules, preferred area, interest tags)
 */
export async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;
    const { pinnedModules, preferredAreaId, interestTags } = req.body;

    let validatedPinned = [];
    if (Array.isArray(pinnedModules)) {
      validatedPinned = pinnedModules.filter(slug => VALID_MODULE_SLUGS.has(slug));
    }

    let validatedTags = [];
    if (Array.isArray(interestTags)) {
      validatedTags = interestTags.slice(0, 10).map(t => String(t).slice(0, 50));
    }

    const pinnedJson = JSON.stringify(validatedPinned);
    const tagsJson = JSON.stringify(validatedTags);

    await executeQuery(
      `INSERT INTO user_preferences (user_id, pinned_modules, preferred_area_id, interest_tags)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         pinned_modules = VALUES(pinned_modules),
         preferred_area_id = VALUES(preferred_area_id),
         interest_tags = VALUES(interest_tags),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, pinnedJson, preferredAreaId || null, tagsJson]
    );

    return res.json({
      success: true,
      message: 'Preferences saved successfully.',
      preferences: {
        pinnedModules: validatedPinned,
        preferredAreaId: preferredAreaId || null,
        interestTags: validatedTags,
      },
    });
  } catch (err) {
    console.error('[UPDATE_PREFERENCES_ERROR]', err);
    return res.status(500).json({
      error: { code: 'UPDATE_FAILED', message: 'Failed to update preferences.' },
    });
  }
}
