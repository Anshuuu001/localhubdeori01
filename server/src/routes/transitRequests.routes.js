import { Router } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';
import {
  submitTransitRequest,
  getTransitRequest,
  cancelTransitRequest,
  updateTransitRequestStatus,
} from '../controllers/transitRequests.controller.js';

const router = Router();

router.post('/', requireAuth, csrfProtection, submitTransitRequest);
router.get('/:id', requireAuth, getTransitRequest);
router.patch('/:id/cancel', requireAuth, csrfProtection, cancelTransitRequest);
router.patch('/:id/status', requireAuth, csrfProtection, updateTransitRequestStatus);

export default router;
