import { Router } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';
import {
  submitJobApplication,
  getJobApplication,
  withdrawJobApplication,
  updateJobApplicationStatus,
} from '../controllers/jobApplications.controller.js';

const router = Router();

router.post('/', requireAuth, csrfProtection, submitJobApplication);
router.get('/:id', requireAuth, getJobApplication);
router.patch('/:id/withdraw', requireAuth, csrfProtection, withdrawJobApplication);
router.patch('/:id/status', requireAuth, csrfProtection, updateJobApplicationStatus);

export default router;
