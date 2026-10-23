import { Router } from 'express';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';
import {
  requireStaff,
  requireAdmin,
  requireSuperAdmin,
  requireAdminPermission,
  requirePrivilegedReauth,
} from '../middleware/admin.middleware.js';

import { getDashboardSummary } from '../controllers/adminDashboard.controller.js';
import {
  getModerationQueue,
  getModerationItemDetail,
  recordModerationDecision,
} from '../controllers/adminModeration.controller.js';
import {
  getVerificationQueue,
  getVerificationDetail,
  accessVerificationDocument,
  recordVerificationDecision,
} from '../controllers/adminVerification.controller.js';
import {
  getReportsQueue,
  reviewReport,
} from '../controllers/adminReports.controller.js';
import {
  getRestrictions,
  createRestriction,
  reassessRestriction,
  getAppeals,
  reviewAppeal,
} from '../controllers/adminRestrictions.controller.js';
import { getAuditLogs } from '../controllers/adminAudit.controller.js';
import {
  listUsers,
  updateUserRole,
  listPermissionsCatalog,
  getUserPermissions,
  updateUserPermissions,
} from '../controllers/adminUsers.controller.js';

const router = Router();

// All admin routes strictly require authentication and staff status
router.use(requireAuth);
router.use(requireStaff);

// 1. Dashboard Overview
router.get('/summary', requireAdminPermission('admin.dashboard.view'), getDashboardSummary);

// 2. Central Moderation Queue
router.get('/moderation/queue', getModerationQueue);
router.get('/moderation/item/:module/:id', getModerationItemDetail);
router.post('/moderation/decision', csrfProtection, recordModerationDecision);

// 3. Verification Queue
router.get('/verifications/queue', getVerificationQueue);
router.get('/verifications/:id', getVerificationDetail);
router.get('/verifications/:id/document', accessVerificationDocument);
router.post('/verifications/:id/decision', csrfProtection, recordVerificationDecision);

// 4. Reports & Corrections
router.get('/reports/queue', requireAdminPermission('reports.manage'), getReportsQueue);
router.post('/reports/:id/review', csrfProtection, requireAdminPermission('reports.manage'), reviewReport);

// 5. Restrictions & Appeals
router.get('/restrictions', requireAdminPermission('restrictions.manage'), getRestrictions);
router.post('/restrictions', csrfProtection, requireAdminPermission('restrictions.manage'), createRestriction);
router.patch('/restrictions/:id/reassess', csrfProtection, requireAdminPermission('restrictions.manage'), reassessRestriction);

router.get('/appeals', requireAdminPermission('appeals.review'), getAppeals);
router.post('/appeals/:id/review', csrfProtection, requireAdminPermission('appeals.review'), reviewAppeal);

// 6. Security Audit Logs
router.get('/audit-logs', requireAdminPermission('audit.view'), getAuditLogs);

// 7. Users, Staff Roles & Granular Permissions
router.get('/users', requireAdmin, listUsers);
router.patch('/users/:id/role', csrfProtection, requireAdmin, requirePrivilegedReauth, updateUserRole);
router.get('/permissions', requireAdmin, listPermissionsCatalog);
router.get('/users/:id/permissions', requireAdmin, getUserPermissions);
router.post('/users/:id/permissions', csrfProtection, requireAdmin, requirePrivilegedReauth, updateUserPermissions);

export default router;
