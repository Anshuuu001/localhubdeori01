import { Router } from 'express';
import {
  getEmergencyStatus,
  listEmergencyContacts,
  getEmergencyContactById,
  createEmergencyContact,
  updateEmergencyContact,
  submitEmergencyContactReport,
  listEmergencyContactReports,
  reviewEmergencyContactReport,
} from '../controllers/emergency.controller.js';
import { requireAuth, csrfProtection, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/status', getEmergencyStatus);
router.get('/contacts', listEmergencyContacts);
router.get('/contacts/:id', getEmergencyContactById);
router.get('/', listEmergencyContacts);

// Citizen report submission
router.post('/contacts/:id/report', csrfProtection, submitEmergencyContactReport);

// Staff management & verification
router.post('/contacts', requireAuth, csrfProtection, requireRole('editor', 'admin'), createEmergencyContact);
router.patch('/contacts/:id', requireAuth, csrfProtection, requireRole('editor', 'admin'), updateEmergencyContact);

// Reports moderation queue
router.get('/reports/queue', requireAuth, requireRole('editor', 'admin'), listEmergencyContactReports);
router.post('/reports/:id/review', requireAuth, csrfProtection, requireRole('editor', 'admin'), reviewEmergencyContactReport);

export default router;
