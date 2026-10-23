import { executeQuery, getPool } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * List all pending invitations for the authenticated user based on their verified contact identifiers.
 */
export async function getMyInvitations(req, res) {
  const identifiers = [];
  if (req.user.email) identifiers.push(req.user.email.toLowerCase());
  if (req.user.phone) identifiers.push(req.user.phone.toLowerCase());

  if (identifiers.length === 0) {
    return res.json({ invitations: [] });
  }

  const placeholders = identifiers.map(() => '?').join(',');
  const [invitations] = await executeQuery(
    `SELECT 
      i.id,
      i.business_profile_id,
      i.role_id,
      i.status,
      i.expires_at,
      i.created_at,
      b.name AS business_name,
      b.business_type,
      b.category,
      r.name AS role_name,
      r.description AS role_description,
      u.full_name AS inviter_name
     FROM business_invitations i
     JOIN business_profiles b ON i.business_profile_id = b.id
     JOIN roles r ON i.role_id = r.id
     JOIN users u ON i.inviter_user_id = u.id
     WHERE i.invitee_identifier IN (${placeholders}) AND i.status = 'pending' AND i.expires_at > NOW()
     ORDER BY i.created_at DESC`,
    identifiers
  );

  return res.json({ invitations });
}

/**
 * Accept or decline a business invitation.
 */
export async function respondToInvitation(req, res) {
  const { invitationId } = req.params;
  const { action } = req.body; // 'accept' | 'decline'

  if (action !== 'accept' && action !== 'decline') {
    return res.status(400).json({
      error: { code: 'INVALID_ACTION', message: "Action must be 'accept' or 'decline'." },
    });
  }

  // Get invitation
  const [invRows] = await executeQuery(
    `SELECT i.*, b.name AS business_name 
     FROM business_invitations i
     JOIN business_profiles b ON i.business_profile_id = b.id
     WHERE i.id = ? AND i.status = 'pending'`,
    [invitationId]
  );

  if (invRows.length === 0) {
    return res.status(404).json({
      error: { code: 'INVITATION_NOT_FOUND', message: 'Invitation not found, expired, or already responded to.' },
    });
  }

  const inv = invRows[0];
  const inviteeIdentifier = inv.invitee_identifier.toLowerCase();

  // Verify that the current user owns this identifier
  const userIdentifiers = [req.user.email?.toLowerCase(), req.user.phone?.toLowerCase()].filter(Boolean);
  if (!userIdentifiers.includes(inviteeIdentifier)) {
    return res.status(403).json({
      error: {
        code: 'IDENTIFIER_MISMATCH',
        message: 'This invitation was sent to a contact address not linked to your account.',
      },
    });
  }

  if (action === 'decline') {
    await executeQuery(
      `UPDATE business_invitations SET status = 'declined', responded_at = NOW() WHERE id = ?`,
      [invitationId]
    );

    await logAuditEvent({
      actorId: req.user.id,
      action: 'team.invitation_declined',
      entityType: 'business_invitation',
      entityId: invitationId,
      details: { businessId: inv.business_profile_id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ message: `Declined invitation for ${inv.business_name}.` });
  }

  // Action is accept: add user to business_memberships
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Check if membership already exists
    const [existingMember] = await conn.execute(
      'SELECT id FROM business_memberships WHERE business_profile_id = ? AND user_id = ?',
      [inv.business_profile_id, req.user.id]
    );

    if (existingMember.length > 0) {
      await conn.execute(
        'UPDATE business_memberships SET role_id = ?, status = "active" WHERE id = ?',
        [inv.role_id, existingMember[0].id]
      );
    } else {
      const membershipId = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO business_memberships (id, business_profile_id, user_id, role_id, status)
         VALUES (?, ?, ?, ?, 'active')`,
        [membershipId, inv.business_profile_id, req.user.id, inv.role_id]
      );
    }

    // Mark invitation accepted
    await conn.execute(
      `UPDATE business_invitations SET status = 'accepted', responded_at = NOW() WHERE id = ?`,
      [invitationId]
    );

    await conn.commit();

    await logAuditEvent({
      actorId: req.user.id,
      action: 'team.invitation_accepted',
      entityType: 'business_membership',
      entityId: inv.business_profile_id,
      details: { businessId: inv.business_profile_id, roleId: inv.role_id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: `You have successfully joined ${inv.business_name}!`,
      businessProfileId: inv.business_profile_id,
      roleId: inv.role_id,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[RESPOND_INVITATION_ERROR]', err.message);
    return res.status(500).json({
      error: { code: 'DATABASE_ERROR', message: 'Failed to accept invitation.' },
    });
  } finally {
    conn.release();
  }
}
