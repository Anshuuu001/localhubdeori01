import { Router } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';
import { submitAppeal } from '../controllers/adminRestrictions.controller.js';

const router = Router();

// Authenticated citizen: Submit appeal against a restriction
router.post('/:restrictionId/appeal', requireAuth, csrfProtection, submitAppeal);

export default router;
