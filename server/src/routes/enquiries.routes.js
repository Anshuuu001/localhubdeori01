import { Router } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';
import {
  submitEnquiry,
  getEnquiry,
  cancelEnquiry,
  markEnquiryViewed,
  respondToEnquiry,
  closeEnquiry,
} from '../controllers/enquiries.controller.js';

const router = Router();

router.post('/', requireAuth, csrfProtection, submitEnquiry);
router.get('/:id', requireAuth, getEnquiry);
router.patch('/:id/cancel', requireAuth, csrfProtection, cancelEnquiry);
router.patch('/:id/view', requireAuth, csrfProtection, markEnquiryViewed);
router.patch('/:id/respond', requireAuth, csrfProtection, respondToEnquiry);
router.patch('/:id/close', requireAuth, csrfProtection, closeEnquiry);

export default router;
