import { Router } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';
import {
  submitVerificationRequest,
  getTargetBadges,
} from '../controllers/adminVerification.controller.js';

const router = Router();

// Public: View badges and explanatory limitations
router.get('/badges/:targetType/:targetId', getTargetBadges);

// Authenticated citizen: Submit verification request
router.post('/submit', requireAuth, csrfProtection, submitVerificationRequest);

export default router;
