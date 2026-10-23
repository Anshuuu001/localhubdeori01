import { Router } from 'express';
import { getMyInvitations, respondToInvitation } from '../controllers/invitations.controller.js';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/my-invitations', getMyInvitations);
router.post('/:invitationId/respond', csrfProtection, respondToInvitation);

export default router;
