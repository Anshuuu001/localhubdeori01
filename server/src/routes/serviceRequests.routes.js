import { Router } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';
import {
  submitServiceRequest,
  getServiceRequest,
  cancelServiceRequest,
  updateServiceRequestStatus,
} from '../controllers/serviceRequests.controller.js';

const router = Router();

router.post('/', requireAuth, csrfProtection, submitServiceRequest);
router.get('/:id', requireAuth, getServiceRequest);
router.patch('/:id/cancel', requireAuth, csrfProtection, cancelServiceRequest);
router.patch('/:id/status', requireAuth, csrfProtection, updateServiceRequestStatus);

export default router;
