import { Router } from 'express';
import {
  listPublicListings,
  getListingById,
  listBusinessListings,
  createListing,
  updateListing,
  updateAvailability,
  updateStatus,
  deleteListing,
} from '../controllers/listings.controller.js';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';

const router = Router();

// Public listing browsing & single view
router.get('/', listPublicListings);
router.get('/:id', getListingById);

// Business-scoped listings for Business Workspace
router.get('/business/:businessId', requireAuth, listBusinessListings);

// Protected management endpoints
router.post('/', requireAuth, csrfProtection, createListing);
router.patch('/:id', requireAuth, csrfProtection, updateListing);
router.patch('/:id/availability', requireAuth, csrfProtection, updateAvailability);
router.patch('/:id/status', requireAuth, csrfProtection, updateStatus);
router.delete('/:id', requireAuth, csrfProtection, deleteListing);

export default router;
