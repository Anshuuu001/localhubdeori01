import { Router } from 'express';
import {
  universalSearch,
  getSearchSuggestions,
  getSearchHistory,
  clearSearchHistory,
} from '../controllers/search.controller.js';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';

const router = Router();

// Universal Search (authenticate middleware runs globally, so req.user is populated if logged in)
router.get('/', universalSearch);

// Search suggestions matching real public database records
router.get('/suggestions', getSearchSuggestions);

// User-private search history endpoints
router.get('/history', requireAuth, getSearchHistory);
router.delete('/history', requireAuth, csrfProtection, clearSearchHistory);

export default router;
