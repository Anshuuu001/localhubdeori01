-- ====================================================================
-- LocalHub X - Phase 6 Admin Panel, Moderation & Verification Schema
-- Deori Taluka & Nearby Areas, Gondia District, Maharashtra
-- Modules: Admin RBAC, Moderation Queues, Verification Reviews,
--          Reports Management, Restrictions & Appeals, Audit Explorer
-- Additive & Non-Destructive Migration
-- ====================================================================

-- 1. Extend users.role to support specialized administrative roles
ALTER TABLE users MODIFY COLUMN role ENUM('citizen', 'editor', 'moderator', 'verifier', 'admin', 'super_admin') NOT NULL DEFAULT 'citizen';

-- 2. Extend listings.status with moderation hold and removal states
ALTER TABLE listings MODIFY COLUMN status ENUM('published', 'pending_review', 'under_review', 'action_needed', 'paused', 'closed', 'archived', 'rejected', 'removed') NOT NULL DEFAULT 'pending_review';

-- 3. Extend business_profiles.verification_status with lifecycle states
ALTER TABLE business_profiles MODIFY COLUMN verification_status ENUM('unverified', 'pending', 'action_needed', 'verified', 'rejected', 'expired', 'suspended') NOT NULL DEFAULT 'unverified';

-- 4. Extend listing_reports with status, priority, and reviewer fields
ALTER TABLE listing_reports 
  MODIFY COLUMN status ENUM('submitted', 'received', 'under_review', 'action_taken', 'resolved', 'dismissed', 'closed') NOT NULL DEFAULT 'submitted',
  ADD COLUMN priority ENUM('urgent', 'high', 'normal', 'low') NOT NULL DEFAULT 'normal',
  ADD COLUMN assigned_reviewer_id VARCHAR(36) NULL,
  ADD COLUMN resolution_notes TEXT NULL,
  ADD COLUMN resolved_at TIMESTAMP NULL,
  ADD CONSTRAINT fk_reports_reviewer FOREIGN KEY (assigned_reviewer_id) REFERENCES users(id) ON DELETE SET NULL;

-- 5. User-level Granular Permissions Mapping (Least Privilege)
CREATE TABLE IF NOT EXISTS admin_user_permissions (
  user_id VARCHAR(36) NOT NULL,
  permission_id VARCHAR(50) NOT NULL,
  granted_by_user_id VARCHAR(36) NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Seed Granular Phase 6 Administrative Permissions
INSERT IGNORE INTO permissions (id, name, module, description) VALUES
  ('admin.dashboard.view', 'View Admin Dashboard', 'admin', 'Access admin overview and system metrics'),
  ('moderation.listings.review', 'Moderate Listings', 'moderation', 'Review, approve, hold, or reject marketplace and directory listings'),
  ('moderation.events.review', 'Moderate Events', 'moderation', 'Review, approve, hold, or reject public taluka events'),
  ('moderation.news.review', 'Moderate News Feed', 'moderation', 'Review, publish, hold, or reject taluka news reports'),
  ('moderation.notices.review', 'Moderate Govt Notices', 'moderation', 'Verify and publish authoritative civic and government notices'),
  ('moderation.emergency.review', 'Moderate Emergency Contacts', 'moderation', 'Verify and manage official emergency lines and corrections'),
  ('verification.user.review', 'Review User Verification', 'verification', 'Inspect evidence and verify individual citizen identity and phone'),
  ('verification.business.review', 'Review Business Verification', 'verification', 'Inspect registrations (Shop Act/Udyam) and verify businesses'),
  ('verification.professional.review', 'Review Professional Credentials', 'verification', 'Verify trade and professional licences (ITI, electrician, technician)'),
  ('reports.manage', 'Manage Reports Queue', 'reports', 'Investigate, triage, and resolve community reports and inaccurate content'),
  ('restrictions.manage', 'Manage Account & Content Restrictions', 'restrictions', 'Issue warnings, holds, feature restrictions, and suspensions'),
  ('appeals.review', 'Review User Appeals', 'appeals', 'Review, uphold, modify, or lift user appeals on restrictions'),
  ('audit.view', 'View Security Audit Logs', 'audit', 'Inspect system and administrative audit trails with sanitization'),
  ('admin.users.manage_roles', 'Manage Admin Staff Roles', 'admin', 'Grant or revoke staff roles and administrative permissions');

-- 7. Seed Administrative System Roles
INSERT IGNORE INTO roles (id, business_profile_id, name, description, is_system_template) VALUES
  ('super_admin', NULL, 'Super Administrator', 'Unrestricted administrative access to all taluka system modules, roles, and audits', TRUE),
  ('admin', NULL, 'Administrator', 'Full administrative authority across moderation, verification, reports, restrictions, and audit viewer', TRUE),
  ('moderator', NULL, 'Moderator', 'Reviews content submissions, listings, and community reports across modules', TRUE),
  ('verifier', NULL, 'Verification Reviewer', 'Reviews official documents and issues verification badges for users, businesses, and professionals', TRUE);

-- 8. Map Granular Permissions to System Administrative Roles
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  -- Super Admin
  ('super_admin', 'admin.dashboard.view'),
  ('super_admin', 'moderation.listings.review'),
  ('super_admin', 'moderation.events.review'),
  ('super_admin', 'moderation.news.review'),
  ('super_admin', 'moderation.notices.review'),
  ('super_admin', 'moderation.emergency.review'),
  ('super_admin', 'verification.user.review'),
  ('super_admin', 'verification.business.review'),
  ('super_admin', 'verification.professional.review'),
  ('super_admin', 'reports.manage'),
  ('super_admin', 'restrictions.manage'),
  ('super_admin', 'appeals.review'),
  ('super_admin', 'audit.view'),
  ('super_admin', 'admin.users.manage_roles'),

  -- Admin
  ('admin', 'admin.dashboard.view'),
  ('admin', 'moderation.listings.review'),
  ('admin', 'moderation.events.review'),
  ('admin', 'moderation.news.review'),
  ('admin', 'moderation.notices.review'),
  ('admin', 'moderation.emergency.review'),
  ('admin', 'verification.user.review'),
  ('admin', 'verification.business.review'),
  ('admin', 'verification.professional.review'),
  ('admin', 'reports.manage'),
  ('admin', 'restrictions.manage'),
  ('admin', 'appeals.review'),
  ('admin', 'audit.view'),

  -- Moderator
  ('moderator', 'admin.dashboard.view'),
  ('moderator', 'moderation.listings.review'),
  ('moderator', 'moderation.events.review'),
  ('moderator', 'moderation.news.review'),
  ('moderator', 'moderation.notices.review'),
  ('moderator', 'moderation.emergency.review'),
  ('moderator', 'reports.manage'),

  -- Verifier
  ('verifier', 'admin.dashboard.view'),
  ('verifier', 'verification.user.review'),
  ('verifier', 'verification.business.review'),
  ('verifier', 'verification.professional.review');

-- 9. Verification Requests & Evidence Records
CREATE TABLE IF NOT EXISTS verification_requests (
  id VARCHAR(36) PRIMARY KEY,
  target_type ENUM('user', 'business', 'professional') NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  requester_user_id VARCHAR(36) NOT NULL,
  badge_type ENUM('phone_verified', 'business_verified', 'professional_verified', 'identity_verified') NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  document_reference_masked VARCHAR(100) NULL,
  document_url VARCHAR(255) NOT NULL,
  status ENUM('not_submitted', 'pending', 'action_needed', 'approved', 'rejected', 'expired', 'suspended') NOT NULL DEFAULT 'pending',
  submitted_data JSON NULL,
  reviewer_user_id VARCHAR(36) NULL,
  reviewed_at TIMESTAMP NULL,
  decision_notes TEXT NULL,
  action_needed_reason TEXT NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_verif_target (target_type, target_id),
  INDEX idx_verif_status (status, created_at),
  INDEX idx_verif_requester (requester_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Issued Verification Badges
CREATE TABLE IF NOT EXISTS verification_badges (
  id VARCHAR(36) PRIMARY KEY,
  target_type ENUM('user', 'business', 'listing') NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  badge_type ENUM('phone_verified', 'business_verified', 'professional_verified', 'identity_verified') NOT NULL,
  status ENUM('active', 'expired', 'revoked') NOT NULL DEFAULT 'active',
  verification_request_id VARCHAR(36) NULL,
  verified_by_user_id VARCHAR(36) NOT NULL,
  scope VARCHAR(150) NOT NULL DEFAULT 'general',
  display_title VARCHAR(150) NOT NULL,
  explanation TEXT NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  revocation_reason TEXT NULL,
  FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verification_request_id) REFERENCES verification_requests(id) ON DELETE SET NULL,
  INDEX idx_badge_target (target_type, target_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Sensitive Verification Document Access Log (Access Governance)
CREATE TABLE IF NOT EXISTS document_access_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  verification_request_id VARCHAR(36) NOT NULL,
  accessed_by_user_id VARCHAR(36) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (verification_request_id) REFERENCES verification_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (accessed_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_doc_access_req (verification_request_id, accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Account & Content Restrictions
CREATE TABLE IF NOT EXISTS account_restrictions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  target_type ENUM('user_account', 'business_profile', 'listing', 'feature_posting', 'feature_booking', 'emergency_protective') NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  restriction_type ENUM('warning', 'listing_hold', 'listing_removal', 'feature_restriction', 'account_suspension', 'emergency_protective_action') NOT NULL,
  reason_category VARCHAR(100) NOT NULL,
  public_reason TEXT NOT NULL,
  internal_notes TEXT NULL,
  affected_scope VARCHAR(150) NOT NULL,
  status ENUM('active', 'expired', 'lifted', 'modified') NOT NULL DEFAULT 'active',
  restricted_by_user_id VARCHAR(36) NOT NULL,
  starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  review_due_at TIMESTAMP NULL,
  lifted_at TIMESTAMP NULL,
  lifted_by_user_id VARCHAR(36) NULL,
  lift_reason TEXT NULL,
  appeal_window_ends_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (restricted_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lifted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_restr_user_status (user_id, status),
  INDEX idx_restr_target (target_type, target_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Restriction Appeals
CREATE TABLE IF NOT EXISTS restriction_appeals (
  id VARCHAR(36) PRIMARY KEY,
  restriction_id VARCHAR(36) NOT NULL,
  appellant_user_id VARCHAR(36) NOT NULL,
  appeal_reason TEXT NOT NULL,
  supporting_evidence TEXT NULL,
  status ENUM('submitted', 'under_review', 'info_requested', 'upheld', 'modified', 'lifted') NOT NULL DEFAULT 'submitted',
  is_late_appeal BOOLEAN NOT NULL DEFAULT FALSE,
  late_justification TEXT NULL,
  reviewer_user_id VARCHAR(36) NULL,
  decision_notes TEXT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (restriction_id) REFERENCES account_restrictions(id) ON DELETE CASCADE,
  FOREIGN KEY (appellant_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_appeal_restr (restriction_id),
  INDEX idx_appeal_appellant (appellant_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Restriction Decision History Trail
CREATE TABLE IF NOT EXISTS restriction_decisions_history (
  id VARCHAR(36) PRIMARY KEY,
  restriction_id VARCHAR(36) NOT NULL,
  action ENUM('created', 'modified', 'appealed', 'appeal_reviewed', 'reassessed', 'lifted', 'expired') NOT NULL,
  actor_user_id VARCHAR(36) NOT NULL,
  notes TEXT NULL,
  previous_state JSON NULL,
  new_state JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restriction_id) REFERENCES account_restrictions(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_restr_hist (restriction_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Moderation Decisions History (Across all 10 Modules)
CREATE TABLE IF NOT EXISTS moderation_decisions_history (
  id VARCHAR(36) PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  decision ENUM('approve_publish', 'reject', 'request_changes', 'hold_review', 'remove_unpublish') NOT NULL,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NOT NULL,
  reason TEXT NULL,
  reviewer_user_id VARCHAR(36) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mod_hist_target (module, target_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
