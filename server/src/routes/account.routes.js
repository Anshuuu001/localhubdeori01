import { Router } from 'express';
import {
  getAccountProfile,
  updateAccountProfile,
  unlinkContactIdentifier,
  requestAccountDeletion,
  cancelAccountDeletion,
} from '../controllers/account.controller.js';
import {
  getPreferences,
  updatePreferences,
} from '../controllers/userPreferences.controller.js';
import { requireAuth, csrfProtection, requireReauth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', getAccountProfile);
router.patch('/profile', csrfProtection, updateAccountProfile);
router.post('/unlink-identifier', csrfProtection, requireReauth, unlinkContactIdentifier);

// Preferences (pinned modules, discovery settings)
router.get('/preferences', getPreferences);
router.put('/preferences', csrfProtection, updatePreferences);

// Deletion grace-period flow
router.post('/deletion/request', csrfProtection, requireReauth, requestAccountDeletion);
router.post('/deletion/cancel', csrfProtection, cancelAccountDeletion);

export default router;
