import { Router } from 'express';
import {
  listEvents,
  getEventById,
  submitEvent,
  cancelEvent,
  respondToEvent,
  listPendingEvents,
  reviewEvent,
} from '../controllers/events.controller.js';
import { requireAuth, csrfProtection, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/', listEvents);
router.get('/moderation/pending', requireAuth, requireRole('editor', 'admin'), listPendingEvents);
router.get('/:id', getEventById);

// Authenticated user actions
router.post('/', requireAuth, csrfProtection, submitEvent);
router.patch('/:id/cancel', requireAuth, csrfProtection, cancelEvent);
router.post('/:id/respond', requireAuth, csrfProtection, respondToEvent);

// Moderation review actions
router.post('/moderation/review/:id', requireAuth, csrfProtection, requireRole('editor', 'admin'), reviewEvent);

export default router;
