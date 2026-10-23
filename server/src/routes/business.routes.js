import { Router } from 'express';
import {
  listUserBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  listTeamMembers,
  listAvailableRoles,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
  listBusinessInvitations,
  revokeInvitation,
  initiateOwnershipTransfer,
  cancelOwnershipTransfer,
  acceptOwnershipTransfer,
} from '../controllers/business.controller.js';
import { getBusinessRequests } from '../controllers/businessRequests.controller.js';
import {
  requireAuth,
  csrfProtection,
  requireBusinessPermission,
  requireReauth,
} from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

// Business list & creation
router.get('/', listUserBusinesses);
router.post('/', csrfProtection, createBusiness);

// Single business details & updates
router.get('/:businessId', getBusinessById);
router.patch(
  '/:businessId',
  csrfProtection,
  requireBusinessPermission('business.edit'),
  updateBusiness
);

// Branches
router.get('/:businessId/branches', listBranches);
router.post(
  '/:businessId/branches',
  csrfProtection,
  requireBusinessPermission('branches.manage'),
  createBranch
);
router.patch(
  '/:businessId/branches/:branchId',
  csrfProtection,
  requireBusinessPermission('branches.manage'),
  updateBranch
);
router.delete(
  '/:businessId/branches/:branchId',
  csrfProtection,
  requireBusinessPermission('branches.manage'),
  deleteBranch
);

// Team & Roles
router.get('/:businessId/team', requireBusinessPermission('business.view'), listTeamMembers);
router.get('/:businessId/roles', requireBusinessPermission('business.view'), listAvailableRoles);
router.post(
  '/:businessId/team/invite',
  csrfProtection,
  requireBusinessPermission('team.invite'),
  inviteTeamMember
);
router.patch(
  '/:businessId/team/:memberId',
  csrfProtection,
  requireBusinessPermission('team.manage_roles'),
  updateMemberRole
);
router.delete(
  '/:businessId/team/:memberId',
  csrfProtection,
  requireBusinessPermission('team.manage_roles'),
  removeTeamMember
);

// Invitations
router.get(
  '/:businessId/invitations',
  requireBusinessPermission('team.invite'),
  listBusinessInvitations
);
router.delete(
  '/:businessId/invitations/:invitationId',
  csrfProtection,
  requireBusinessPermission('team.invite'),
  revokeInvitation
);

// Controlled Ownership Transfer
router.post(
  '/:businessId/transfer/initiate',
  csrfProtection,
  requireReauth,
  requireBusinessPermission('ownership.transfer'),
  initiateOwnershipTransfer
);
router.post(
  '/:businessId/transfer/:transferId/cancel',
  csrfProtection,
  cancelOwnershipTransfer
);
router.post(
  '/:businessId/transfer/:transferId/accept',
  csrfProtection,
  acceptOwnershipTransfer
);

// Incoming Customer Requests & Applications Queue
router.get(
  '/:businessId/requests',
  requireBusinessPermission('enquiries.view'),
  getBusinessRequests
);

export default router;
