import { Router } from 'express';
import {
  submitReport,
  listPendingModeration,
  reviewListing,
} from '../controllers/reports.controller.js';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';

const router = Router();

// Public / Citizen reporting entrypoint
router.post('/', submitReport);

// Development / Moderation review workflow
router.get('/moderation/pending', requireAuth, listPendingModeration);
router.post('/moderation/review/:listingId', requireAuth, csrfProtection, reviewListing);

export default router;
