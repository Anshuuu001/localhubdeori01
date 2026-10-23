import { executeQuery } from '../config/database.js';

/**
 * Returns real counts and overview metrics directly from MySQL tables.
 * No hardcoded counts or simulated data.
 */
export async function getDashboardSummary(req, res) {
  try {
    // 1. Pending reviews across listing and civic modules
    const [listingsPending] = await executeQuery(
      `SELECT module, COUNT(*) as count FROM listings WHERE status = 'pending_review' GROUP BY module`
    );

    const [eventsPending] = await executeQuery(
      `SELECT COUNT(*) as count FROM events WHERE status = 'pending_review'`
    );

    const [newsPending] = await executeQuery(
      `SELECT COUNT(*) as count FROM news_articles WHERE status = 'pending_review'`
    );

    const [noticesPending] = await executeQuery(
      `SELECT COUNT(*) as count FROM govt_notices WHERE status = 'pending_review'`
    );

    const [emergencyPending] = await executeQuery(
      `SELECT COUNT(*) as count FROM emergency_contacts WHERE status = 'under_review' OR is_verified = FALSE`
    );

    // Calculate module-level pending counts
    const moduleMap = {
      jobs: 0,
      rentals: 0,
      marketplace: 0,
      krishi_products: 0,
      krishi_equipment: 0,
      services: 0,
      business_directory: 0,
      events: eventsPending[0]?.count || 0,
      news: newsPending[0]?.count || 0,
      govt_notices: noticesPending[0]?.count || 0,
      emergency_contacts: emergencyPending[0]?.count || 0,
    };

    let totalListingsPending = 0;
    listingsPending.forEach(row => {
      if (moduleMap[row.module] !== undefined) {
        moduleMap[row.module] = row.count;
      }
      totalListingsPending += row.count;
    });

    const [bizPending] = await executeQuery(
      `SELECT COUNT(*) as count FROM business_profiles WHERE verification_status = 'pending'`
    );
    moduleMap.business_directory = bizPending[0]?.count || 0;

    const totalPendingReviews =
      totalListingsPending +
      moduleMap.events +
      moduleMap.news +
      moduleMap.govt_notices +
      moduleMap.emergency_contacts +
      moduleMap.business_directory;

    // 2. Verification requests summary
    const [verifCounts] = await executeQuery(
      `SELECT 
        status, 
        COUNT(*) as count 
       FROM verification_requests 
       GROUP BY status`
    );

    const verificationStats = {
      pending: 0,
      action_needed: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    };

    verifCounts.forEach(r => {
      if (verificationStats[r.status] !== undefined) {
        verificationStats[r.status] = r.count;
      }
      verificationStats.total += r.count;
    });

    // 3. Reports & Inaccuracies
    const [listingReportsCount] = await executeQuery(
      `SELECT COUNT(*) as count FROM listing_reports WHERE status IN ('submitted', 'received', 'under_review')`
    );
    const [urgentListingReports] = await executeQuery(
      `SELECT COUNT(*) as count FROM listing_reports WHERE status IN ('submitted', 'received', 'under_review') AND priority = 'urgent'`
    );
    const [newsCorrCount] = await executeQuery(
      `SELECT COUNT(*) as count FROM news_corrections WHERE status IN ('pending', 'under_review')`
    );
    const [emergencyReportsCount] = await executeQuery(
      `SELECT COUNT(*) as count FROM emergency_contact_reports WHERE status IN ('pending', 'under_investigation')`
    );

    const totalActiveReports =
      (listingReportsCount[0]?.count || 0) +
      (newsCorrCount[0]?.count || 0) +
      (emergencyReportsCount[0]?.count || 0);

    const urgentReportsCount =
      (urgentListingReports[0]?.count || 0) +
      (emergencyReportsCount[0]?.count || 0); // All emergency contact inaccuracies are prioritized

    // 4. Restrictions and Appeals
    const [restrictionsCount] = await executeQuery(
      `SELECT COUNT(*) as count FROM account_restrictions WHERE status = 'active'`
    );

    const [appealsCount] = await executeQuery(
      `SELECT COUNT(*) as count FROM restriction_appeals WHERE status IN ('submitted', 'under_review')`
    );

    // 5. Total system volume
    const [usersCount] = await executeQuery(`SELECT COUNT(*) as count FROM users`);
    const [businessesCount] = await executeQuery(`SELECT COUNT(*) as count FROM business_profiles WHERE status = 'active'`);
    const [publishedListingsCount] = await executeQuery(`SELECT COUNT(*) as count FROM listings WHERE status = 'published'`);

    // 6. Recent administrative audit activity
    const [recentLogs] = await executeQuery(
      `SELECT 
        al.id,
        al.actor_id,
        al.actor_role,
        al.action,
        al.entity_type,
        al.entity_id,
        al.details,
        al.created_at,
        u.full_name AS actor_name,
        u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 10`
    );

    return res.json({
      counts: {
        pendingReviews: totalPendingReviews,
        verificationRequests: verificationStats.pending,
        actionNeededVerifications: verificationStats.action_needed,
        activeReports: totalActiveReports,
        urgentCorrections: urgentReportsCount,
        activeRestrictions: restrictionsCount[0]?.count || 0,
        pendingAppeals: appealsCount[0]?.count || 0,
        totalUsers: usersCount[0]?.count || 0,
        activeBusinesses: businessesCount[0]?.count || 0,
        publishedListings: publishedListingsCount[0]?.count || 0,
      },
      moduleBreakdown: moduleMap,
      verificationStats,
      recentActivity: recentLogs.map(log => ({
        id: log.id,
        actorId: log.actor_id,
        actorRole: log.actor_role,
        actorName: log.actor_name || 'System / Automated',
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        details: log.details,
        createdAt: log.created_at,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[GET_ADMIN_DASHBOARD_SUMMARY_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve administrative summary statistics.' },
    });
  }
}
