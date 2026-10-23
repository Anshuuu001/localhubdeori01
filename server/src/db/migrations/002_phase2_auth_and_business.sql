-- ====================================================================
-- LocalHub X - Phase 2 Authentication, Account & Business Schema
-- Taluka: Deori Taluka, District Gondia, Maharashtra
-- Additive & Non-Destructive Migration
-- ====================================================================

-- 1. Core Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NULL UNIQUE,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(30) NULL UNIQUE,
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash VARCHAR(255) NULL,
  status ENUM('active', 'suspended', 'deletion_pending') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Server-Managed Authentication Sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  csrf_secret VARCHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  device_label VARCHAR(100) NULL,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_reauth_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. OTP & Identity Verification Challenges (Never store plaintext OTP)
CREATE TABLE IF NOT EXISTS otp_challenges (
  id VARCHAR(36) PRIMARY KEY,
  identifier VARCHAR(191) NOT NULL,
  channel ENUM('phone_sms', 'email') NOT NULL,
  purpose ENUM('login', 'register', 'verify_phone', 'verify_email', 'password_reset', 'account_link', 'reauth') NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempts_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_identifier_purpose (identifier, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Business Profiles
CREATE TABLE IF NOT EXISTS business_profiles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  business_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NULL,
  email VARCHAR(191) NULL,
  phone VARCHAR(30) NULL,
  address_line1 VARCHAR(255) NULL,
  taluka_area_id VARCHAR(50) NULL,
  owner_user_id VARCHAR(36) NOT NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  verification_status ENUM('unverified', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'unverified',
  verification_notes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (taluka_area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  INDEX idx_biz_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Business Branches
CREATE TABLE IF NOT EXISTS business_branches (
  id VARCHAR(36) PRIMARY KEY,
  business_profile_id VARCHAR(36) NOT NULL,
  branch_name VARCHAR(100) NOT NULL,
  taluka_area_id VARCHAR(50) NULL,
  address VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (taluka_area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  INDEX idx_branches_biz (business_profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Granular Permissions Catalog
CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Roles (System Templates & Business-specific Custom Roles)
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  business_profile_id VARCHAR(36) NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Role Permissions Mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id VARCHAR(50) NOT NULL,
  permission_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Business Team Memberships
CREATE TABLE IF NOT EXISTS business_memberships (
  id VARCHAR(36) PRIMARY KEY,
  business_profile_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(50) NOT NULL,
  status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_biz_user (business_profile_id, user_id),
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Business Team Invitations
CREATE TABLE IF NOT EXISTS business_invitations (
  id VARCHAR(36) PRIMARY KEY,
  business_profile_id VARCHAR(36) NOT NULL,
  inviter_user_id VARCHAR(36) NOT NULL,
  invitee_identifier VARCHAR(191) NOT NULL,
  role_id VARCHAR(50) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  status ENUM('pending', 'accepted', 'declined', 'revoked', 'expired') NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Controlled Business Ownership Transfer Requests
CREATE TABLE IF NOT EXISTS business_ownership_transfers (
  id VARCHAR(36) PRIMARY KEY,
  business_profile_id VARCHAR(36) NOT NULL,
  current_owner_id VARCHAR(36) NOT NULL,
  proposed_owner_id VARCHAR(36) NOT NULL,
  status ENUM('pending_acceptance', 'completed', 'cancelled', 'rejected') NOT NULL DEFAULT 'pending_acceptance',
  notes TEXT NULL,
  reauth_confirmed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (current_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (proposed_owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Loss-of-Identifiers Account Recovery Requests
CREATE TABLE IF NOT EXISTS account_recovery_requests (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  lost_identifier VARCHAR(191) NOT NULL,
  alternate_contact VARCHAR(191) NOT NULL,
  details TEXT NOT NULL,
  status ENUM('pending_review', 'under_investigation', 'approved', 'rejected') NOT NULL DEFAULT 'pending_review',
  admin_notes TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Account Deletion Requests (with 30-Day Grace Period)
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  reason TEXT NULL,
  grace_period_days INT NOT NULL DEFAULT 30,
  scheduled_deletion_at TIMESTAMP NOT NULL,
  status ENUM('pending_grace_period', 'cancelled', 'completed') NOT NULL DEFAULT 'pending_grace_period',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Seed Initial Permissions and System Role Templates
-- ====================================================================

INSERT IGNORE INTO permissions (id, name, module, description) VALUES
  ('business.view', 'View Business', 'business', 'View business profile and workspace dashboard'),
  ('business.edit', 'Edit Business', 'business', 'Update business profile details, contact info, and address'),
  ('branches.manage', 'Manage Branches', 'branches', 'Add, modify, and remove business branch locations'),
  ('team.invite', 'Invite Team Members', 'team', 'Send invitations to add staff members to this business profile'),
  ('team.manage_roles', 'Manage Team Roles', 'team', 'Assign roles and revoke access for team members'),
  ('listings.create', 'Create Listings', 'listings', 'Publish listings, jobs, rentals, and services under this business'),
  ('listings.manage', 'Manage Listings', 'listings', 'Update, pause, or remove business listings'),
  ('enquiries.view', 'View Enquiries', 'enquiries', 'Read customer inquiries, quote requests, and job applications'),
  ('enquiries.respond', 'Respond to Enquiries', 'enquiries', 'Communicate and send responses to customer inquiries'),
  ('ownership.transfer', 'Transfer Ownership', 'business', 'Initiate or complete controlled transfer of business ownership');

INSERT IGNORE INTO roles (id, business_profile_id, name, description, is_system_template) VALUES
  ('owner', NULL, 'Owner', 'Full control over the business profile, branches, billing, and ownership transfer', TRUE),
  ('manager', NULL, 'Manager', 'Can manage business info, branches, team members, listings, and customer enquiries', TRUE),
  ('listings_staff', NULL, 'Listings Staff', 'Can create, edit, and manage catalog listings and service offerings', TRUE),
  ('enquiry_handler', NULL, 'Enquiry Handler', 'Can view and respond to incoming customer enquiries and requests', TRUE);

-- Map Permissions to System Roles
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  -- Owner has all permissions
  ('owner', 'business.view'),
  ('owner', 'business.edit'),
  ('owner', 'branches.manage'),
  ('owner', 'team.invite'),
  ('owner', 'team.manage_roles'),
  ('owner', 'listings.create'),
  ('owner', 'listings.manage'),
  ('owner', 'enquiries.view'),
  ('owner', 'enquiries.respond'),
  ('owner', 'ownership.transfer'),

  -- Manager
  ('manager', 'business.view'),
  ('manager', 'business.edit'),
  ('manager', 'branches.manage'),
  ('manager', 'team.invite'),
  ('manager', 'listings.create'),
  ('manager', 'listings.manage'),
  ('manager', 'enquiries.view'),
  ('manager', 'enquiries.respond'),

  -- Listings Staff
  ('listings_staff', 'business.view'),
  ('listings_staff', 'listings.create'),
  ('listings_staff', 'listings.manage'),

  -- Enquiry Handler
  ('enquiry_handler', 'business.view'),
  ('enquiry_handler', 'enquiries.view'),
  ('enquiry_handler', 'enquiries.respond');
