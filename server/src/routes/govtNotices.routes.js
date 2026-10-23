import { Router } from 'express';
import {
  listGovtNotices,
  getGovtNoticeById,
  submitGovtNotice,
  listPendingGovtNotices,
  verifyAndPublishNotice,
} from '../controllers/govtNotices.controller.js';
import { requireAuth, csrfProtection, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/', listGovtNotices);
router.get('/moderation/pending', requireAuth, requireRole('editor', 'admin'), listPendingGovtNotices);
router.get('/:id', getGovtNoticeById);

// Submit notice for verification
router.post('/', requireAuth, csrfProtection, submitGovtNotice);

// Official verification and publish action
router.post('/moderation/verify/:id', requireAuth, csrfProtection, requireRole('editor', 'admin'), verifyAndPublishNotice);

export default router;
