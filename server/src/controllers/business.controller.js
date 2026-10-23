import crypto from 'crypto';
import { executeQuery, getPool } from '../config/database.js';
import { generateToken, hashToken } from '../services/crypto.service.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * List all business profiles the authenticated user owns or is an active team member of.
 */
export async function listUserBusinesses(req, res) {
  // 1. Businesses owned directly
  const [owned] = await executeQuery(
    `SELECT 
      b.id,
      b.name,
      b.business_type,
      b.category,
      b.description,
      b.email,
      b.phone,
      b.address_line1,
      b.taluka_area_id,
      b.owner_user_id,
      b.status,
      b.verification_status,
      b.verification_notes,
      b.created_at,
      b.updated_at,
      ta.name AS area_name,
      'owner' AS user_role,
      TRUE AS is_owner
     FROM business_profiles b
     LEFT JOIN taluka_areas ta ON b.taluka_area_id = ta.id
     WHERE b.owner_user_id = ?
     ORDER BY b.created_at DESC`,
    [req.user.id]
  );

  // 2. Businesses where user is a team member
  const [memberships] = await executeQuery(
    `SELECT 
      b.id,
      b.name,
      b.business_type,
      b.category,
      b.description,
      b.email,
      b.phone,
      b.address_line1,
      b.taluka_area_id,
      b.owner_user_id,
      b.status,
      b.verification_status,
      b.verification_notes,
      b.created_at,
      b.updated_at,
      ta.name AS area_name,
      m.role_id AS user_role,
      FALSE AS is_owner
     FROM business_memberships m
     JOIN business_profiles b ON m.business_profile_id = b.id
     LEFT JOIN taluka_areas ta ON b.taluka_area_id = ta.id
     WHERE m.user_id = ? AND m.status = 'active' AND b.owner_user_id != ?
     ORDER BY b.created_at DESC`,
    [req.user.id, req.user.id]
  );

  return res.json({
    businesses: [...owned, ...memberships],
    count: owned.length + memberships.length,
  });
}

/**
 * Get detailed profile of a single business including permissions.
 */
export async function getBusinessById(req, res) {
  const { businessId } = req.params;

  const [bizRows] = await executeQuery(
    `SELECT 
      b.*,
      ta.name AS area_name,
      u.full_name AS owner_name,
      u.email AS owner_email
     FROM business_profiles b
     LEFT JOIN taluka_areas ta ON b.taluka_area_id = ta.id
     LEFT JOIN users u ON b.owner_user_id = u.id
     WHERE b.id = ?`,
    [businessId]
  );

  if (bizRows.length === 0) {
    return res.status(404).json({
      error: { code: 'BUSINESS_NOT_FOUND', message: 'Business profile not found.' },
    });
  }

  const business = bizRows[0];
  const isOwner = business.owner_user_id === req.user.id;

  let roleId = isOwner ? 'owner' : null;
  if (!isOwner) {
    const [membership] = await executeQuery(
      `SELECT role_id FROM business_memberships WHERE business_profile_id = ? AND user_id = ? AND status = 'active'`,
      [businessId, req.user.id]
    );
    if (membership.length === 0) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have access to this business profile.' },
      });
    }
    roleId = membership[0].role_id;
  }

  // Get effective permissions
  const [permRows] = await executeQuery(
    `SELECT p.id, p.name, p.module, p.description
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = ?`,
    [roleId]
  );

  return res.json({
    business: {
      ...business,
      isOwner,
      userRole: roleId,
      permissions: permRows.map(p => p.id),
      permissionDetails: permRows,
    },
  });
}

/**
 * Create a new Business Profile under the user's account.
 * Verification is unverified by default. Non-GPS locality.
 */
export async function createBusiness(req, res) {
  const { name, businessType, category, description, email, phone, addressLine1, talukaAreaId } = req.body;

  if (!name || !businessType || !category) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Business name, type, and category are required.' },
    });
  }

  const businessId = crypto.randomUUID();
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Insert business profile (Status: active, Verification: unverified)
    await conn.execute(
      `INSERT INTO business_profiles 
        (id, name, business_type, category, description, email, phone, address_line1, taluka_area_id, owner_user_id, status, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'unverified')`,
      [
        businessId,
        name.trim(),
        businessType.trim(),
        category.trim(),
        description ? description.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone ? phone.trim() : null,
        addressLine1 ? addressLine1.trim() : null,
        talukaAreaId || null,
        req.user.id,
      ]
    );

    // 2. Automatically create default Head Office branch
    const branchId = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO business_branches 
        (id, business_profile_id, branch_name, taluka_area_id, address, phone, is_headquarters, is_active)
       VALUES (?, ?, 'Main Office (HQ)', ?, ?, ?, TRUE, TRUE)`,
      [
        branchId,
        businessId,
        talukaAreaId || null,
        addressLine1 ? addressLine1.trim() : null,
        phone ? phone.trim() : null,
      ]
    );

    // 3. Create owner membership record for uniform membership querying
    const membershipId = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO business_memberships (id, business_profile_id, user_id, role_id, status)
       VALUES (?, ?, ?, 'owner', 'active')`,
      [membershipId, businessId, req.user.id]
    );

    await conn.commit();

    await logAuditEvent({
      actorId: req.user.id,
      action: 'business.created',
      entityType: 'business_profile',
      entityId: businessId,
      details: { name: name.trim(), businessType: businessType.trim() },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      message: 'Business profile registered successfully. Verification status is Unverified.',
      business: {
        id: businessId,
        name: name.trim(),
        businessType: businessType.trim(),
        category: category.trim(),
        verificationStatus: 'unverified',
        isOwner: true,
        userRole: 'owner',
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('[CREATE_BUSINESS_ERROR]', err.message);
    return res.status(500).json({
      error: { code: 'DATABASE_ERROR', message: 'Failed to create business profile.' },
    });
  } finally {
    conn.release();
  }
}

/**
 * Update Business Profile details (whitelisted fields only; mass-assignment safe).
 */
export async function updateBusiness(req, res) {
  const { businessId } = req.params;
  const { name, businessType, category, description, email, phone, addressLine1, talukaAreaId } = req.body;

  if (!name || !businessType || !category) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Business name, type, and category cannot be empty.' },
    });
  }

  await executeQuery(
    `UPDATE business_profiles 
     SET name = ?, business_type = ?, category = ?, description = ?, email = ?, phone = ?, address_line1 = ?, taluka_area_id = ?
     WHERE id = ?`,
    [
      name.trim(),
      businessType.trim(),
      category.trim(),
      description ? description.trim() : null,
      email ? email.trim().toLowerCase() : null,
      phone ? phone.trim() : null,
      addressLine1 ? addressLine1.trim() : null,
      talukaAreaId || null,
      businessId,
    ]
  );

  await logAuditEvent({
    actorId: req.user.id,
    action: 'business.updated',
    entityType: 'business_profile',
    entityId: businessId,
    details: { name: name.trim(), businessType: businessType.trim() },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: 'Business details updated successfully.',
  });
}

/**
 * List branches for a business.
 */
export async function listBranches(req, res) {
  const { businessId } = req.params;

  const [branches] = await executeQuery(
    `SELECT b.*, ta.name AS area_name 
     FROM business_branches b
     LEFT JOIN taluka_areas ta ON b.taluka_area_id = ta.id
     WHERE b.business_profile_id = ?
     ORDER BY b.is_headquarters DESC, b.created_at ASC`,
    [businessId]
  );

  return res.json({ branches });
}

/**
 * Create a new branch location for a business profile.
 */
export async function createBranch(req, res) {
  const { businessId } = req.params;
  const { branchName, talukaAreaId, address, phone, isHeadquarters } = req.body;

  if (!branchName) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Branch name is required.' },
    });
  }

  const branchId = crypto.randomUUID();

  // If this branch is marked as HQ, unmark previous HQ
  if (isHeadquarters) {
    await executeQuery(
      'UPDATE business_branches SET is_headquarters = FALSE WHERE business_profile_id = ?',
      [businessId]
    );
  }

  await executeQuery(
    `INSERT INTO business_branches 
      (id, business_profile_id, branch_name, taluka_area_id, address, phone, is_headquarters, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      branchId,
      businessId,
      branchName.trim(),
      talukaAreaId || null,
      address ? address.trim() : null,
      phone ? phone.trim() : null,
      Boolean(isHeadquarters),
    ]
  );

  await logAuditEvent({
    actorId: req.user.id,
    action: 'branch.created',
    entityType: 'business_branch',
    entityId: branchId,
    details: { businessId, branchName: branchName.trim() },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.status(201).json({
    message: 'Branch location added successfully.',
    branchId,
  });
}

/**
 * Update an existing branch.
 */
export async function updateBranch(req, res) {
  const { businessId, branchId } = req.params;
  const { branchName, talukaAreaId, address, phone, isHeadquarters, isActive } = req.body;

  if (isHeadquarters) {
    await executeQuery(
      'UPDATE business_branches SET is_headquarters = FALSE WHERE business_profile_id = ? AND id != ?',
      [businessId, branchId]
    );
  }

  await executeQuery(
    `UPDATE business_branches 
     SET branch_name = ?, taluka_area_id = ?, address = ?, phone = ?, is_headquarters = ?, is_active = ?
     WHERE id = ? AND business_profile_id = ?`,
    [
      branchName.trim(),
      talukaAreaId || null,
      address ? address.trim() : null,
      phone ? phone.trim() : null,
      Boolean(isHeadquarters),
      isActive !== undefined ? Boolean(isActive) : true,
      branchId,
      businessId,
    ]
  );

  return res.json({ message: 'Branch updated successfully.' });
}

/**
 * Delete a branch (cannot delete HQ if other branches exist).
 */
export async function deleteBranch(req, res) {
  const { businessId, branchId } = req.params;

  const [branches] = await executeQuery(
    'SELECT is_headquarters FROM business_branches WHERE id = ? AND business_profile_id = ?',
    [branchId, businessId]
  );

  if (branches.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Branch not found.' } });
  }

  if (branches[0].is_headquarters) {
    const [countRows] = await executeQuery(
      'SELECT COUNT(*) as count FROM business_branches WHERE business_profile_id = ?',
      [businessId]
    );
    if (countRows[0].count > 1) {
      return res.status(400).json({
        error: { code: 'CANNOT_DELETE_HQ', message: 'Cannot delete headquarters branch while other branches exist. Designate another branch as HQ first.' },
      });
    }
  }

  await executeQuery('DELETE FROM business_branches WHERE id = ? AND business_profile_id = ?', [
    branchId,
    businessId,
  ]);

  return res.json({ message: 'Branch removed successfully.' });
}

/**
 * List all members of a business team and their assigned roles.
 */
export async function listTeamMembers(req, res) {
  const { businessId } = req.params;

  const [members] = await executeQuery(
    `SELECT 
      m.id AS membership_id,
      m.user_id,
      m.role_id,
      m.status,
      m.joined_at,
      u.full_name,
      u.email,
      u.phone,
      r.name AS role_name,
      r.description AS role_description,
      (b.owner_user_id = u.id) AS is_owner
     FROM business_memberships m
     JOIN users u ON m.user_id = u.id
     JOIN roles r ON m.role_id = r.id
     JOIN business_profiles b ON m.business_profile_id = b.id
     WHERE m.business_profile_id = ?
     ORDER BY is_owner DESC, m.joined_at ASC`,
    [businessId]
  );

  return res.json({ members });
}

/**
 * List roles available for assignment (system templates + business custom roles).
 */
export async function listAvailableRoles(req, res) {
  const { businessId } = req.params;

  const [roles] = await executeQuery(
    `SELECT r.id, r.name, r.description, r.is_system_template,
      GROUP_CONCAT(rp.permission_id) AS permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     WHERE r.business_profile_id IS NULL OR r.business_profile_id = ?
     GROUP BY r.id, r.name, r.description, r.is_system_template`,
    [businessId]
  );

  const formatted = roles.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystemTemplate: Boolean(r.is_system_template),
    permissions: r.permissions ? r.permissions.split(',') : [],
  }));

  return res.json({ roles: formatted });
}

/**
 * Invite a new team member to this business profile.
 * Scoped strictly to this business profile.
 */
export async function inviteTeamMember(req, res) {
  const { businessId } = req.params;
  const { inviteeIdentifier, roleId } = req.body;

  if (!inviteeIdentifier || !roleId) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Invitee email/phone and roleId are required.' },
    });
  }

  // Prevent inviting as 'owner'
  if (roleId === 'owner') {
    return res.status(400).json({
      error: { code: 'CANNOT_INVITE_OWNER', message: 'The Owner role cannot be assigned via invitation. Use the Ownership Transfer workflow.' },
    });
  }

  const cleanIdentifier = inviteeIdentifier.trim().toLowerCase();

  // Check if role exists
  const [roles] = await executeQuery(
    'SELECT id, name FROM roles WHERE id = ? AND (business_profile_id IS NULL OR business_profile_id = ?)',
    [roleId, businessId]
  );

  if (roles.length === 0) {
    return res.status(400).json({
      error: { code: 'ROLE_NOT_FOUND', message: 'Specified role does not exist.' },
    });
  }

  // Check if user is already an active member of this business
  const isEmail = cleanIdentifier.includes('@');
  const [existingUser] = await executeQuery(
    `SELECT id FROM users WHERE ${isEmail ? 'email' : 'phone'} = ?`,
    [cleanIdentifier]
  );

  if (existingUser.length > 0) {
    const [existingMember] = await executeQuery(
      `SELECT id FROM business_memberships WHERE business_profile_id = ? AND user_id = ? AND status = 'active'`,
      [businessId, existingUser[0].id]
    );
    if (existingMember.length > 0) {
      return res.status(409).json({
        error: { code: 'ALREADY_MEMBER', message: 'This person is already an active member of this business profile.' },
      });
    }
  }

  // Invalidate any existing pending invitation for this identifier and business
  await executeQuery(
    `UPDATE business_invitations 
     SET status = 'revoked' 
     WHERE business_profile_id = ? AND invitee_identifier = ? AND status = 'pending'`,
    [businessId, cleanIdentifier]
  );

  const invitationId = crypto.randomUUID();
  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await executeQuery(
    `INSERT INTO business_invitations 
      (id, business_profile_id, inviter_user_id, invitee_identifier, role_id, token_hash, status, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [invitationId, businessId, req.user.id, cleanIdentifier, roleId, tokenHash, expiresAt]
  );

  await logAuditEvent({
    actorId: req.user.id,
    action: 'team.invite_sent',
    entityType: 'business_invitation',
    entityId: invitationId,
    details: { businessId, inviteeIdentifier: cleanIdentifier, roleId },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.status(201).json({
    message: `Invitation sent to ${cleanIdentifier} for role '${roles[0].name}'.`,
    invitationId,
    inviteToken: rawToken,
    expiresAt,
  });
}

/**
 * Update a team member's assigned role.
 */
export async function updateMemberRole(req, res) {
  const { businessId, memberId } = req.params;
  const { roleId } = req.body;

  if (!roleId) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Role ID is required.' },
    });
  }

  if (roleId === 'owner') {
    return res.status(400).json({
      error: { code: 'INVALID_ROLE', message: 'Cannot assign Owner role through role update. Use Ownership Transfer.' },
    });
  }

  // Get member info
  const [memberRows] = await executeQuery(
    `SELECT m.user_id, m.role_id, b.owner_user_id 
     FROM business_memberships m
     JOIN business_profiles b ON m.business_profile_id = b.id
     WHERE m.id = ? AND m.business_profile_id = ?`,
    [memberId, businessId]
  );

  if (memberRows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Team member not found.' } });
  }

  const member = memberRows[0];
  if (member.user_id === member.owner_user_id) {
    return res.status(400).json({
      error: { code: 'CANNOT_MODIFY_OWNER', message: "Cannot change the Business Owner's role." },
    });
  }

  await executeQuery('UPDATE business_memberships SET role_id = ? WHERE id = ?', [roleId, memberId]);

  await logAuditEvent({
    actorId: req.user.id,
    action: 'team.role_changed',
    entityType: 'business_membership',
    entityId: memberId,
    details: { businessId, oldRole: member.role_id, newRole: roleId },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({ message: 'Member role updated successfully.' });
}

/**
 * Remove a team member from this business profile.
 */
export async function removeTeamMember(req, res) {
  const { businessId, memberId } = req.params;

  const [memberRows] = await executeQuery(
    `SELECT m.user_id, b.owner_user_id 
     FROM business_memberships m
     JOIN business_profiles b ON m.business_profile_id = b.id
     WHERE m.id = ? AND m.business_profile_id = ?`,
    [memberId, businessId]
  );

  if (memberRows.length === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found.' } });
  }

  if (memberRows[0].user_id === memberRows[0].owner_user_id) {
    return res.status(400).json({
      error: { code: 'CANNOT_REMOVE_OWNER', message: 'Cannot remove the primary business owner.' },
    });
  }

  await executeQuery('DELETE FROM business_memberships WHERE id = ?', [memberId]);

  await logAuditEvent({
    actorId: req.user.id,
    action: 'team.member_removed',
    entityType: 'business_membership',
    entityId: memberId,
    details: { businessId, removedUserId: memberRows[0].user_id },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({ message: 'Team member removed from business profile.' });
}

/**
 * List invitations for this business profile.
 */
export async function listBusinessInvitations(req, res) {
  const { businessId } = req.params;

  const [invitations] = await executeQuery(
    `SELECT 
      i.id,
      i.invitee_identifier,
      i.role_id,
      r.name AS role_name,
      i.status,
      i.expires_at,
      i.created_at,
      u.full_name AS inviter_name
     FROM business_invitations i
     JOIN roles r ON i.role_id = r.id
     JOIN users u ON i.inviter_user_id = u.id
     WHERE i.business_profile_id = ?
     ORDER BY i.created_at DESC`,
    [businessId]
  );

  return res.json({ invitations });
}

/**
 * Revoke a pending business invitation.
 */
export async function revokeInvitation(req, res) {
  const { businessId, invitationId } = req.params;

  await executeQuery(
    `UPDATE business_invitations 
     SET status = 'revoked' 
     WHERE id = ? AND business_profile_id = ? AND status = 'pending'`,
    [invitationId, businessId]
  );

  return res.json({ message: 'Invitation revoked successfully.' });
}

/**
 * Controlled Ownership Transfer: Initiate ownership transfer request.
 * Strictly requires Owner re-authentication.
 */
export async function initiateOwnershipTransfer(req, res) {
  const { businessId } = req.params;
  const { proposedOwnerId, notes } = req.body;

  if (!proposedOwnerId) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Proposed owner ID is required.' },
    });
  }

  // Verify requester is the owner
  const [bizRows] = await executeQuery(
    'SELECT owner_user_id, name FROM business_profiles WHERE id = ?',
    [businessId]
  );

  if (bizRows.length === 0 || bizRows[0].owner_user_id !== req.user.id) {
    return res.status(403).json({
      error: { code: 'OWNER_ONLY', message: 'Only the current primary owner can initiate ownership transfer.' },
    });
  }

  if (proposedOwnerId === req.user.id) {
    return res.status(400).json({
      error: { code: 'INVALID_TRANSFER', message: 'You are already the owner of this business.' },
    });
  }

  // Verify proposed owner is an active member or valid user
  const [proposedUser] = await executeQuery(
    `SELECT u.id, u.full_name, u.email, u.phone 
     FROM users u
     JOIN business_memberships m ON u.id = m.user_id
     WHERE u.id = ? AND m.business_profile_id = ? AND m.status = 'active'`,
    [proposedOwnerId, businessId]
  );

  if (proposedUser.length === 0) {
    return res.status(400).json({
      error: {
        code: 'NOT_TEAM_MEMBER',
        message: 'The proposed owner must be an active team member of this business profile before transferring ownership.',
      },
    });
  }

  // Cancel any existing pending transfers
  await executeQuery(
    `UPDATE business_ownership_transfers 
     SET status = 'cancelled' 
     WHERE business_profile_id = ? AND status = 'pending_acceptance'`,
    [businessId]
  );

  const transferId = crypto.randomUUID();

  await executeQuery(
    `INSERT INTO business_ownership_transfers 
      (id, business_profile_id, current_owner_id, proposed_owner_id, status, notes, reauth_confirmed_at)
     VALUES (?, ?, ?, ?, 'pending_acceptance', ?, NOW())`,
    [transferId, businessId, req.user.id, proposedOwnerId, notes ? notes.trim() : null]
  );

  await logAuditEvent({
    actorId: req.user.id,
    action: 'business.ownership_transfer_initiated',
    entityType: 'business_ownership_transfer',
    entityId: transferId,
    details: {
      businessId,
      currentOwner: req.user.id,
      proposedOwner: proposedOwnerId,
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.status(201).json({
    message: `Ownership transfer initiated. ${proposedUser[0].full_name} has been notified and must accept the transfer to complete the change.`,
    transferId,
    status: 'pending_acceptance',
  });
}

/**
 * Cancel a pending ownership transfer.
 */
export async function cancelOwnershipTransfer(req, res) {
  const { businessId, transferId } = req.params;

  await executeQuery(
    `UPDATE business_ownership_transfers 
     SET status = 'cancelled' 
     WHERE id = ? AND business_profile_id = ? AND current_owner_id = ? AND status = 'pending_acceptance'`,
    [transferId, businessId, req.user.id]
  );

  await logAuditEvent({
    actorId: req.user.id,
    action: 'business.ownership_transfer_cancelled',
    entityType: 'business_ownership_transfer',
    entityId: transferId,
    details: { businessId },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({ message: 'Ownership transfer request has been cancelled.' });
}

/**
 * Accept a pending ownership transfer (executed by proposed owner).
 */
export async function acceptOwnershipTransfer(req, res) {
  const { businessId, transferId } = req.params;

  const [transfers] = await executeQuery(
    `SELECT id, current_owner_id, proposed_owner_id 
     FROM business_ownership_transfers 
     WHERE id = ? AND business_profile_id = ? AND proposed_owner_id = ? AND status = 'pending_acceptance'`,
    [transferId, businessId, req.user.id]
  );

  if (transfers.length === 0) {
    return res.status(404).json({
      error: { code: 'TRANSFER_NOT_FOUND', message: 'Active ownership transfer invitation not found.' },
    });
  }

  const transfer = transfers[0];
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Update business profile owner
    await conn.execute(
      'UPDATE business_profiles SET owner_user_id = ? WHERE id = ?',
      [req.user.id, businessId]
    );

    // 2. Demote former owner to manager
    await conn.execute(
      `UPDATE business_memberships SET role_id = 'manager' WHERE business_profile_id = ? AND user_id = ?`,
      [businessId, transfer.current_owner_id]
    );

    // 3. Promote new owner to owner role
    await conn.execute(
      `UPDATE business_memberships SET role_id = 'owner' WHERE business_profile_id = ? AND user_id = ?`,
      [businessId, req.user.id]
    );

    // 4. Mark transfer completed
    await conn.execute(
      `UPDATE business_ownership_transfers 
       SET status = 'completed', completed_at = NOW() 
       WHERE id = ?`,
      [transferId]
    );

    await conn.commit();

    await logAuditEvent({
      actorId: req.user.id,
      action: 'business.ownership_transfer_completed',
      entityType: 'business_profile',
      entityId: businessId,
      details: {
        previousOwner: transfer.current_owner_id,
        newOwner: req.user.id,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: 'Ownership transfer completed. You are now the primary owner of this business profile.',
    });
  } catch (err) {
    await conn.rollback();
    console.error('[ACCEPT_TRANSFER_ERROR]', err.message);
    return res.status(500).json({
      error: { code: 'DATABASE_ERROR', message: 'Failed to complete ownership transfer.' },
    });
  } finally {
    conn.release();
  }
}
