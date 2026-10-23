import { Router } from 'express';
import {
  listNews,
  getNewsById,
  submitNews,
  submitNewsCorrection,
  listPendingNews,
  reviewNews,
  listNewsCorrections,
  reviewNewsCorrection,
} from '../controllers/news.controller.js';
import { requireAuth, csrfProtection, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/', listNews);
router.get('/moderation/pending', requireAuth, requireRole('editor', 'admin'), listPendingNews);
router.get('/corrections/queue', requireAuth, requireRole('editor', 'admin'), listNewsCorrections);
router.get('/:id', getNewsById);

// Submit news & corrections
router.post('/', requireAuth, csrfProtection, submitNews);
router.post('/:id/corrections', csrfProtection, submitNewsCorrection);

// Editorial review routes
router.post('/moderation/review/:id', requireAuth, csrfProtection, requireRole('editor', 'admin'), reviewNews);
router.post('/corrections/:id/review', requireAuth, csrfProtection, requireRole('editor', 'admin'), reviewNewsCorrection);

export default router;
