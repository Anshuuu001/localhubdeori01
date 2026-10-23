import { Router } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';
import {
  getNotifications,
  markAsRead,
  markAllRead,
} from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', requireAuth, getNotifications);
router.patch('/:id/read', requireAuth, csrfProtection, markAsRead);
router.post('/mark-all-read', requireAuth, csrfProtection, markAllRead);

export default router;
