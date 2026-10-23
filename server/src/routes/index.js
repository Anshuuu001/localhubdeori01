import { Router } from 'express';
import healthRoutes from './health.routes.js';
import modulesRoutes from './modules.routes.js';
import areasRoutes from './areas.routes.js';
import emergencyRoutes from './emergency.routes.js';
import authRoutes from './auth.routes.js';
import sessionsRoutes from './sessions.routes.js';
import accountRoutes from './account.routes.js';
import businessRoutes from './business.routes.js';
import invitationsRoutes from './invitations.routes.js';
import listingsRoutes from './listings.routes.js';
import directoryRoutes from './directory.routes.js';
import reportsRoutes from './reports.routes.js';
import uploadRoutes from './upload.routes.js';

// Phase 4 Routes: Requests, Activity & Notifications
import jobApplicationsRoutes from './jobApplications.routes.js';
import enquiriesRoutes from './enquiries.routes.js';
import serviceRequestsRoutes from './serviceRequests.routes.js';
import transitRequestsRoutes from './transitRequests.routes.js';
import activityRoutes from './activity.routes.js';
import notificationsRoutes from './notifications.routes.js';

// Phase 5 Routes: Events, News & Government Notices
import eventsRoutes from './events.routes.js';
import newsRoutes from './news.routes.js';
import govtNoticesRoutes from './govtNotices.routes.js';

// Phase 6 Routes: Admin Panel, Moderation, Verification & Restrictions
import adminRoutes from './admin.routes.js';
import verificationsRoutes from './verifications.routes.js';
import restrictionsRoutes from './restrictions.routes.js';

// Phase 7 Routes: Universal Search, Saved Items & Local Discovery Feed
import searchRoutes from './search.routes.js';
import savedItemsRoutes from './savedItems.routes.js';
import discoveryRoutes from './discovery.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/modules', modulesRoutes);
apiRouter.use('/areas', areasRoutes);
apiRouter.use('/emergency', emergencyRoutes);

// Phase 2 Routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/sessions', sessionsRoutes);
apiRouter.use('/account', accountRoutes);
apiRouter.use('/business', businessRoutes);
apiRouter.use('/invitations', invitationsRoutes);

// Phase 3 Core Marketplace Routes
apiRouter.use('/listings', listingsRoutes);
apiRouter.use('/directory', directoryRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/uploads', uploadRoutes);

// Phase 4 User Activity & Request Lifecycles
apiRouter.use('/requests/jobs', jobApplicationsRoutes);
apiRouter.use('/requests/enquiries', enquiriesRoutes);
apiRouter.use('/requests/services', serviceRequestsRoutes);
apiRouter.use('/requests/transit', transitRequestsRoutes);
apiRouter.use('/activity', activityRoutes);
apiRouter.use('/notifications', notificationsRoutes);

// Phase 5 Civic Engagement, News & Government Notices
apiRouter.use('/events', eventsRoutes);
apiRouter.use('/news', newsRoutes);
apiRouter.use('/notices', govtNoticesRoutes);

// Phase 6 Admin Panel, Moderation, Verification & Restrictions
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/verifications', verificationsRoutes);
apiRouter.use('/restrictions', restrictionsRoutes);

// Phase 7 Universal Search, Saved Bookmarks & Discovery Feed
apiRouter.use('/search', searchRoutes);
apiRouter.use('/saved-items', savedItemsRoutes);
apiRouter.use('/discovery', discoveryRoutes);

export default apiRouter;



