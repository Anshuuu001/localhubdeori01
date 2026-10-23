import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getMyActivity } from '../controllers/activity.controller.js';

const router = Router();

router.get('/my-activity', requireAuth, getMyActivity);

export default router;
