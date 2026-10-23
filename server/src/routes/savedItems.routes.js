import { Router } from 'express';
import {
  listSavedItems,
  saveItem,
  unsaveItem,
  unsaveByTarget,
  checkItemSaved,
} from '../controllers/savedItems.controller.js';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';

const router = Router();

// All saved item operations require authentication (private to citizen)
router.use(requireAuth);

router.get('/', listSavedItems);
router.post('/', csrfProtection, saveItem);
router.delete('/:id', csrfProtection, unsaveItem);
router.delete('/target/:itemType/:itemId', csrfProtection, unsaveByTarget);
router.get('/check/:itemType/:itemId', checkItemSaved);

export default router;
