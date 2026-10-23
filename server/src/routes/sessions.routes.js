import { Router } from 'express';
import {
  listActiveSessions,
  revokeSession,
  revokeOtherSessions,
} from '../controllers/sessions.controller.js';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', listActiveSessions);
router.delete('/others', csrfProtection, revokeOtherSessions);
router.delete('/:sessionId', csrfProtection, revokeSession);

export default router;
