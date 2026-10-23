-- ====================================================================
-- LocalHub X - Complete Database Creation & Schema Script
-- Taluka: Deori Taluka & Nearby Circles, Gondia District, Maharashtra
-- Engine: MySQL 8.0+ | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ====================================================================

-- 1. Create Database if not exists
CREATE DATABASE IF NOT EXISTS localhubx
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE localhubx;

-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- ====================================================================
-- Table 1: schema_migrations (Tracks automated migration executions)
-- ====================================================================
DROP TABLE IF EXISTS schema_migrations;
CREATE TABLE schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 2: system_settings (Key-value system metadata and settings)
-- ====================================================================
DROP TABLE IF EXISTS system_settings;
CREATE TABLE system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 3: taluka_areas (Configurable Deori Taluka administrative circles)
-- ====================================================================
DROP TABLE IF EXISTS taluka_areas;
CREATE TABLE taluka_areas (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  marathi_name VARCHAR(100) NULL,
  taluka VARCHAR(100) NOT NULL DEFAULT 'Deori',
  district VARCHAR(100) NOT NULL DEFAULT 'Gondia',
  is_headquarters BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 4: audit_logs (Foundational immutable system audit trail)
-- ====================================================================
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id VARCHAR(64) NULL,
  actor_role VARCHAR(50) DEFAULT 'system',
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_actor (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 5: users (Core users & citizens with granular system roles)
-- ====================================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NULL UNIQUE,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(30) NULL UNIQUE,
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash VARCHAR(255) NULL,
  role ENUM('citizen', 'editor', 'moderator', 'verifier', 'admin', 'super_admin') NOT NULL DEFAULT 'citizen',
  status ENUM('active', 'suspended', 'deletion_pending') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_phone (phone),
  INDEX idx_users_role (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 6: auth_sessions (Server-managed sessions with CSRF tokens)
-- ====================================================================
DROP TABLE IF EXISTS auth_sessions;
CREATE TABLE auth_sessions (
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

-- ====================================================================
-- Table 7: otp_challenges (Secure hashed OTP challenges & verification)
-- ====================================================================
DROP TABLE IF EXISTS otp_challenges;
CREATE TABLE otp_challenges (
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

-- ====================================================================
-- Table 8: business_profiles (Business directory & listing providers)
-- ====================================================================
DROP TABLE IF EXISTS business_profiles;
CREATE TABLE business_profiles (
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
  verification_status ENUM('unverified', 'pending', 'action_needed', 'verified', 'rejected', 'expired', 'suspended') NOT NULL DEFAULT 'unverified',
  verification_notes VARCHAR(255) NULL,
  operating_hours VARCHAR(255) NULL,
  logo_url VARCHAR(255) NULL,
  banner_url VARCHAR(255) NULL,
  photos JSON NULL,
  is_phone_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_email_public BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_number VARCHAR(30) NULL,
  website VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (taluka_area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  INDEX idx_biz_owner (owner_user_id),
  INDEX idx_biz_area (taluka_area_id),
  INDEX idx_biz_status (status, verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 9: business_branches (Multiple branch locations for a business)
-- ====================================================================
DROP TABLE IF EXISTS business_branches;
CREATE TABLE business_branches (
  id VARCHAR(36) PRIMARY KEY,
  business_profile_id VARCHAR(36) NOT NULL,
  branch_name VARCHAR(100) NOT NULL,
  taluka_area_id VARCHAR(50) NULL,
  address VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  operating_hours VARCHAR(255) NULL,
  email VARCHAR(191) NULL,
  whatsapp_number VARCHAR(30) NULL,
  is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (taluka_area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  INDEX idx_branches_biz (business_profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 10: permissions (Catalog of granular platform permissions)
-- ====================================================================
DROP TABLE IF EXISTS permissions;
CREATE TABLE permissions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 11: roles (System templates and custom roles)
-- ====================================================================
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
  id VARCHAR(50) PRIMARY KEY,
  business_profile_id VARCHAR(36) NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 12: role_permissions (Many-to-many role to permission mapping)
-- ====================================================================
DROP TABLE IF EXISTS role_permissions;
CREATE TABLE role_permissions (
  role_id VARCHAR(50) NOT NULL,
  permission_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 13: business_memberships (Business team staff memberships)
-- ====================================================================
DROP TABLE IF EXISTS business_memberships;
CREATE TABLE business_memberships (
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

-- ====================================================================
-- Table 14: business_invitations (Pending staff invitations)
-- ====================================================================
DROP TABLE IF EXISTS business_invitations;
CREATE TABLE business_invitations (
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

-- ====================================================================
-- Table 15: business_ownership_transfers (Controlled ownership handoff)
-- ====================================================================
DROP TABLE IF EXISTS business_ownership_transfers;
CREATE TABLE business_ownership_transfers (
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

-- ====================================================================
-- Table 16: account_recovery_requests (Lost identifier manual recovery)
-- ====================================================================
DROP TABLE IF EXISTS account_recovery_requests;
CREATE TABLE account_recovery_requests (
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

-- ====================================================================
-- Table 17: account_deletion_requests (30-day graceful deletion)
-- ====================================================================
DROP TABLE IF EXISTS account_deletion_requests;
CREATE TABLE account_deletion_requests (
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
-- Table 18: listings (Core multi-module marketplace listings)
-- ====================================================================
DROP TABLE IF EXISTS listings;
CREATE TABLE listings (
  id VARCHAR(36) PRIMARY KEY,
  module ENUM('jobs', 'rentals', 'marketplace', 'krishi_products', 'krishi_equipment', 'services') NOT NULL,
  provider_type ENUM('business', 'individual') NOT NULL DEFAULT 'business',
  business_profile_id VARCHAR(36) NULL,
  business_branch_id VARCHAR(36) NULL,
  user_id VARCHAR(36) NOT NULL,
  taluka_area_id VARCHAR(50) NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12, 2) NULL,
  price_period VARCHAR(30) NULL,
  is_price_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  availability_status VARCHAR(50) NOT NULL DEFAULT 'available',
  status ENUM('published', 'pending_review', 'under_review', 'action_needed', 'paused', 'closed', 'archived', 'rejected', 'removed') NOT NULL DEFAULT 'pending_review',
  moderation_notes TEXT NULL,
  contact_phone VARCHAR(30) NULL,
  contact_email VARCHAR(191) NULL,
  contact_whatsapp VARCHAR(30) NULL,
  is_contact_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  photos JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (business_branch_id) REFERENCES business_branches(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (taluka_area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  INDEX idx_listings_module_status (module, status),
  INDEX idx_listings_business (business_profile_id),
  INDEX idx_listings_user (user_id),
  INDEX idx_listings_area (taluka_area_id),
  INDEX idx_listings_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 19: listing_jobs (Jobs Hub extension details)
-- ====================================================================
DROP TABLE IF EXISTS listing_jobs;
CREATE TABLE listing_jobs (
  listing_id VARCHAR(36) PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,
  qualifications VARCHAR(255) NULL,
  experience_required VARCHAR(100) NULL,
  salary_min DECIMAL(12, 2) NULL,
  salary_max DECIMAL(12, 2) NULL,
  salary_period VARCHAR(30) NOT NULL DEFAULT 'monthly',
  is_salary_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  vacancies_count INT NULL DEFAULT 1,
  application_method VARCHAR(100) NOT NULL DEFAULT 'direct_contact',
  how_to_apply TEXT NULL,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 20: listing_rentals (Rentals & PG property details)
-- ====================================================================
DROP TABLE IF EXISTS listing_rentals;
CREATE TABLE listing_rentals (
  listing_id VARCHAR(36) PRIMARY KEY,
  property_type ENUM('room', 'pg', 'flat', 'house', 'shop', 'commercial_space') NOT NULL,
  deposit_amount DECIMAL(12, 2) NULL DEFAULT 0,
  furnishing_status VARCHAR(50) NULL,
  amenities JSON NULL,
  address_details VARCHAR(255) NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 21: listing_marketplace (New Products marketplace details)
-- ====================================================================
DROP TABLE IF EXISTS listing_marketplace;
CREATE TABLE listing_marketplace (
  listing_id VARCHAR(36) PRIMARY KEY,
  is_condition_new BOOLEAN NOT NULL DEFAULT TRUE,
  warranty_info VARCHAR(200) NULL,
  brand VARCHAR(100) NULL,
  sku VARCHAR(100) NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 22: listing_krishi (Krishi Bazaar: Seeds, Crops, Machinery)
-- ====================================================================
DROP TABLE IF EXISTS listing_krishi;
CREATE TABLE listing_krishi (
  listing_id VARCHAR(36) PRIMARY KEY,
  krishi_type ENUM('product', 'equipment') NOT NULL,
  crop_name VARCHAR(100) NULL,
  quantity DECIMAL(10, 2) NULL,
  unit VARCHAR(50) NULL,
  equipment_name VARCHAR(100) NULL,
  equipment_type VARCHAR(100) NULL,
  listing_mode ENUM('sale', 'rental') NULL,
  rental_rate_unit VARCHAR(50) NULL,
  rental_terms TEXT NULL,
  security_deposit DECIMAL(12, 2) NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 23: listing_services (Local artisan, repair & home services)
-- ====================================================================
DROP TABLE IF EXISTS listing_services;
CREATE TABLE listing_services (
  listing_id VARCHAR(36) PRIMARY KEY,
  service_mode ENUM('at_provider_location', 'at_customer_location', 'both') NOT NULL DEFAULT 'both',
  pricing_type ENUM('fixed', 'starting_at', 'quote_on_inspection', 'hourly') NOT NULL DEFAULT 'quote_on_inspection',
  service_hours VARCHAR(100) NULL,
  experience_years INT NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 24: listing_reports (Community report queue & content flags)
-- ====================================================================
DROP TABLE IF EXISTS listing_reports;
CREATE TABLE listing_reports (
  id VARCHAR(36) PRIMARY KEY,
  target_type ENUM('listing', 'business_profile') NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  reporter_user_id VARCHAR(36) NULL,
  reporter_name VARCHAR(100) NULL,
  reporter_contact VARCHAR(100) NULL,
  reason VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  status ENUM('submitted', 'received', 'under_review', 'action_taken', 'resolved', 'dismissed', 'closed') NOT NULL DEFAULT 'submitted',
  priority ENUM('urgent', 'high', 'normal', 'low') NOT NULL DEFAULT 'normal',
  assigned_reviewer_id VARCHAR(36) NULL,
  resolution_notes TEXT NULL,
  resolved_at TIMESTAMP NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reports_target (target_type, target_id),
  INDEX idx_reports_status (status),
  INDEX idx_reports_priority (priority, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 25: job_applications (Citizen job applications & track status)
-- ====================================================================
DROP TABLE IF EXISTS job_applications;
CREATE TABLE job_applications (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NULL,
  listing_title_cached VARCHAR(200) NOT NULL,
  applicant_user_id VARCHAR(36) NOT NULL,
  business_profile_id VARCHAR(36) NOT NULL,
  applicant_name VARCHAR(100) NOT NULL,
  applicant_phone VARCHAR(30) NULL,
  applicant_email VARCHAR(191) NULL,
  cover_note TEXT NULL,
  experience_summary TEXT NULL,
  qualifications VARCHAR(255) NULL,
  resume_url VARCHAR(255) NULL,
  status ENUM('submitted', 'shortlisted', 'rejected', 'hired', 'withdrawn') NOT NULL DEFAULT 'submitted',
  employer_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
  FOREIGN KEY (applicant_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
  INDEX idx_job_app_applicant (applicant_user_id, status),
  INDEX idx_job_app_business (business_profile_id, status),
  INDEX idx_job_app_listing (listing_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 26: listing_enquiries (In-platform inquiries for listings)
-- ====================================================================
DROP TABLE IF EXISTS listing_enquiries;
CREATE TABLE listing_enquiries (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NULL,
  listing_title_cached VARCHAR(200) NOT NULL,
  module VARCHAR(50) NOT NULL,
  requester_user_id VARCHAR(36) NOT NULL,
  business_profile_id VARCHAR(36) NULL,
  message TEXT NOT NULL,
  preferred_contact_method ENUM('phone', 'email', 'in_app', 'whatsapp') NOT NULL DEFAULT 'phone',
  contact_phone VARCHAR(30) NULL,
  contact_email VARCHAR(191) NULL,
  status ENUM('sent', 'viewed', 'responded', 'closed', 'cancelled') NOT NULL DEFAULT 'sent',
  response_message TEXT NULL,
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
  FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE SET NULL,
  INDEX idx_enquiry_requester (requester_user_id, status),
  INDEX idx_enquiry_business (business_profile_id, status),
  INDEX idx_enquiry_listing (listing_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 27: service_requests (Bookings for electricians, plumbers, etc.)
-- ====================================================================
DROP TABLE IF EXISTS service_requests;
CREATE TABLE service_requests (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NULL,
  listing_title_cached VARCHAR(200) NOT NULL,
  requester_user_id VARCHAR(36) NOT NULL,
  business_profile_id VARCHAR(36) NOT NULL,
  service_description TEXT NOT NULL,
  service_area_id VARCHAR(50) NULL,
  address_details VARCHAR(255) NOT NULL,
  preferred_date DATE NULL,
  preferred_time_slot VARCHAR(50) NULL,
  contact_name VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  status ENUM('pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT NULL,
  cancellation_reason TEXT NULL,
  provider_notes TEXT NULL,
  attachments JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
  FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (service_area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  INDEX idx_service_req_requester (requester_user_id, status),
  INDEX idx_service_req_business (business_profile_id, status),
  INDEX idx_service_req_listing (listing_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 28: transit_requests (Ride sharing & local parcel delivery)
-- ====================================================================
DROP TABLE IF EXISTS transit_requests;
CREATE TABLE transit_requests (
  id VARCHAR(36) PRIMARY KEY,
  request_type ENUM('ride', 'delivery') NOT NULL,
  requester_user_id VARCHAR(36) NOT NULL,
  provider_business_id VARCHAR(36) NULL,
  pickup_area_id VARCHAR(50) NULL,
  pickup_address VARCHAR(255) NOT NULL,
  dropoff_area_id VARCHAR(50) NULL,
  dropoff_address VARCHAR(255) NOT NULL,
  scheduled_date DATE NULL,
  scheduled_time VARCHAR(50) NULL,
  passenger_count INT NULL DEFAULT 1,
  parcel_category VARCHAR(100) NULL,
  parcel_weight_kg DECIMAL(6, 2) NULL,
  parcel_description TEXT NULL,
  recipient_name VARCHAR(100) NULL,
  recipient_phone VARCHAR(30) NULL,
  contact_name VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  contact_preference VARCHAR(50) NOT NULL DEFAULT 'phone',
  notes TEXT NULL,
  status ENUM('pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT NULL,
  cancellation_reason TEXT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_business_id) REFERENCES business_profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (pickup_area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (dropoff_area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  INDEX idx_transit_requester (requester_user_id, status),
  INDEX idx_transit_provider (provider_business_id, status),
  INDEX idx_transit_type (request_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 29: request_status_history (Audit timeline for all citizen requests)
-- ====================================================================
DROP TABLE IF EXISTS request_status_history;
CREATE TABLE request_status_history (
  id VARCHAR(36) PRIMARY KEY,
  request_type ENUM('job_application', 'listing_enquiry', 'service_request', 'transit_request') NOT NULL,
  request_id VARCHAR(36) NOT NULL,
  from_status VARCHAR(50) NULL,
  to_status VARCHAR(50) NOT NULL,
  actor_user_id VARCHAR(36) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  reason TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status_history_target (request_type, request_id, created_at),
  INDEX idx_status_history_actor (actor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 30: notifications (In-app notifications for citizens & business)
-- ====================================================================
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  actor_user_id VARCHAR(36) NULL,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_notifications_user (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 31: events (Civic, cultural, haat bazaar & business events)
-- ====================================================================
DROP TABLE IF EXISTS events;
CREATE TABLE events (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_date DATE NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  venue VARCHAR(200) NOT NULL,
  area_id VARCHAR(50) NULL,
  address_details VARCHAR(255) NULL,
  organizer_name VARCHAR(100) NOT NULL,
  organizer_contact_phone VARCHAR(30) NULL,
  organizer_contact_email VARCHAR(191) NULL,
  permit_contact_options VARCHAR(50) NOT NULL DEFAULT 'phone',
  source_url VARCHAR(255) NULL,
  poster_url VARCHAR(255) NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  business_profile_id VARCHAR(36) NULL,
  status ENUM('pending_review', 'published', 'rejected', 'cancelled', 'archived') NOT NULL DEFAULT 'pending_review',
  moderation_notes TEXT NULL,
  rejection_reason TEXT NULL,
  cancellation_reason TEXT NULL,
  reviewed_by_user_id VARCHAR(36) NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_profile_id) REFERENCES business_profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_events_status (status, start_date),
  INDEX idx_events_area (area_id),
  INDEX idx_events_creator (created_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 32: event_responses (Interested / Going RSVPs)
-- ====================================================================
DROP TABLE IF EXISTS event_responses;
CREATE TABLE event_responses (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  response_type ENUM('interested', 'going') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_user (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_event_resp_type (event_id, response_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 33: news_articles (Grassroots taluka journalism & reports)
-- ====================================================================
DROP TABLE IF EXISTS news_articles;
CREATE TABLE news_articles (
  id VARCHAR(36) PRIMARY KEY,
  headline VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  content MEDIUMTEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  relevant_date DATE NOT NULL,
  published_at TIMESTAMP NULL,
  area_id VARCHAR(50) NULL,
  source_name VARCHAR(150) NOT NULL,
  source_url VARCHAR(255) NULL,
  evidence_url VARCHAR(255) NULL,
  submitted_by_user_id VARCHAR(36) NOT NULL,
  status ENUM('pending_review', 'published', 'rejected', 'archived') NOT NULL DEFAULT 'pending_review',
  moderation_notes TEXT NULL,
  rejection_reason TEXT NULL,
  reviewed_by_user_id VARCHAR(36) NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_news_status (status, published_at),
  INDEX idx_news_area (area_id),
  INDEX idx_news_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 34: news_corrections (Public correction requests on news)
-- ====================================================================
DROP TABLE IF EXISTS news_corrections;
CREATE TABLE news_corrections (
  id VARCHAR(36) PRIMARY KEY,
  news_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NULL,
  reason VARCHAR(100) NOT NULL,
  suggested_correction TEXT NOT NULL,
  evidence_url VARCHAR(255) NULL,
  status ENUM('pending', 'under_review', 'applied', 'dismissed') NOT NULL DEFAULT 'pending',
  admin_notes TEXT NULL,
  reviewed_by_user_id VARCHAR(36) NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (news_id) REFERENCES news_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_news_corr_status (news_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 35: govt_notices (Authoritative civic circulars & orders)
-- ====================================================================
DROP TABLE IF EXISTS govt_notices;
CREATE TABLE govt_notices (
  id VARCHAR(36) PRIMARY KEY,
  issuing_authority VARCHAR(200) NOT NULL,
  notice_title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  content MEDIUMTEXT NULL,
  issue_date DATE NOT NULL,
  deadline_date DATE NULL,
  area_id VARCHAR(50) NULL,
  official_source_url VARCHAR(255) NULL,
  document_url VARCHAR(255) NULL,
  is_official_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_source_notes VARCHAR(255) NULL,
  verified_by_user_id VARCHAR(36) NULL,
  verified_at TIMESTAMP NULL,
  status ENUM('pending_review', 'published', 'expired', 'archived') NOT NULL DEFAULT 'pending_review',
  moderation_notes TEXT NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_notices_status (status, issue_date),
  INDEX idx_notices_authority (issuing_authority),
  INDEX idx_notices_deadline (deadline_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 36: emergency_contacts (Verified official emergency numbers)
-- ====================================================================
DROP TABLE IF EXISTS emergency_contacts;
CREATE TABLE emergency_contacts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  department VARCHAR(150) NOT NULL,
  category ENUM('police', 'medical', 'fire', 'disaster', 'electrical', 'wildlife_rescue', 'women_child', 'administrative', 'other') NOT NULL,
  primary_phone VARCHAR(30) NOT NULL,
  secondary_phone VARCHAR(30) NULL,
  area_id VARCHAR(50) NULL,
  address VARCHAR(255) NULL,
  opening_hours VARCHAR(100) NOT NULL DEFAULT '24x7',
  authoritative_source VARCHAR(255) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMP NULL,
  verified_by_user_id VARCHAR(36) NULL,
  status ENUM('active', 'under_review', 'inactive') NOT NULL DEFAULT 'under_review',
  is_national_standard BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (area_id) REFERENCES taluka_areas(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_emer_cat (category, status),
  INDEX idx_emer_area (area_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 37: emergency_contact_reports (Public reports on invalid numbers)
-- ====================================================================
DROP TABLE IF EXISTS emergency_contact_reports;
CREATE TABLE emergency_contact_reports (
  id VARCHAR(36) PRIMARY KEY,
  contact_id VARCHAR(36) NOT NULL,
  reporter_user_id VARCHAR(36) NULL,
  reporter_name VARCHAR(100) NULL,
  reason VARCHAR(100) NOT NULL,
  suggested_number VARCHAR(30) NULL,
  evidence_notes TEXT NOT NULL,
  status ENUM('pending', 'under_investigation', 'verified_updated', 'dismissed') NOT NULL DEFAULT 'pending',
  admin_notes TEXT NULL,
  reviewed_by_user_id VARCHAR(36) NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES emergency_contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_emer_rep_status (contact_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 38: admin_user_permissions (Granular staff permission grants)
-- ====================================================================
DROP TABLE IF EXISTS admin_user_permissions;
CREATE TABLE admin_user_permissions (
  user_id VARCHAR(36) NOT NULL,
  permission_id VARCHAR(50) NOT NULL,
  granted_by_user_id VARCHAR(36) NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 39: verification_requests (Business, phone & identity checks)
-- ====================================================================
DROP TABLE IF EXISTS verification_requests;
CREATE TABLE verification_requests (
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

-- ====================================================================
-- Table 40: verification_badges (Active badges displayed on listings)
-- ====================================================================
DROP TABLE IF EXISTS verification_badges;
CREATE TABLE verification_badges (
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

-- ====================================================================
-- Table 41: document_access_logs (Audit log for viewing citizen KYC)
-- ====================================================================
DROP TABLE IF EXISTS document_access_logs;
CREATE TABLE document_access_logs (
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

-- ====================================================================
-- Table 42: account_restrictions (Warnings, listing holds & suspensions)
-- ====================================================================
DROP TABLE IF EXISTS account_restrictions;
CREATE TABLE account_restrictions (
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

-- ====================================================================
-- Table 43: restriction_appeals (30-day user appeals on restrictions)
-- ====================================================================
DROP TABLE IF EXISTS restriction_appeals;
CREATE TABLE restriction_appeals (
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

-- ====================================================================
-- Table 44: restriction_decisions_history (Auditable restriction changes)
-- ====================================================================
DROP TABLE IF EXISTS restriction_decisions_history;
CREATE TABLE restriction_decisions_history (
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

-- ====================================================================
-- Table 45: moderation_decisions_history (Auditable moderation decisions)
-- ====================================================================
DROP TABLE IF EXISTS moderation_decisions_history;
CREATE TABLE moderation_decisions_history (
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

-- ====================================================================
-- Table 46: saved_items (Citizen bookmarks across all 10 modules)
-- ====================================================================
DROP TABLE IF EXISTS saved_items;
CREATE TABLE saved_items (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  item_type VARCHAR(50) NOT NULL COMMENT 'listing, business, event, news, notice, emergency',
  item_id VARCHAR(64) NOT NULL,
  module VARCHAR(50) NOT NULL COMMENT 'jobs, rentals, marketplace, krishi_products, krishi_equipment, services, directory, events, news, notices, emergency',
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_user_saved_item UNIQUE (user_id, item_type, item_id),
  CONSTRAINT fk_saved_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_saved_items_user (user_id),
  INDEX idx_saved_items_module (user_id, module),
  INDEX idx_saved_items_target (item_type, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 47: user_search_history (Private authenticated search history)
-- ====================================================================
DROP TABLE IF EXISTS user_search_history;
CREATE TABLE user_search_history (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  query_text VARCHAR(150) NOT NULL,
  module_filter VARCHAR(50) DEFAULT 'all',
  area_id VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_search_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_search_history_user (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 48: user_preferences (Pinned dashboard modules & preferences)
-- ====================================================================
DROP TABLE IF EXISTS user_preferences;
CREATE TABLE user_preferences (
  user_id VARCHAR(64) PRIMARY KEY,
  pinned_modules JSON NULL COMMENT 'Array of module slugs or IDs',
  preferred_area_id VARCHAR(50) NULL,
  interest_tags JSON NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- DEFAULT SEED DATA (Deori Circles, Permissions, Roles & Emergency Lines)
-- ====================================================================

-- 1. Administrative Circles for Deori Taluka, Gondia
INSERT IGNORE INTO taluka_areas (id, name, marathi_name, taluka, district, is_headquarters, is_active, sort_order) VALUES
  ('deori-hq', 'Deori Town (HQ)', 'देवरी शहर (मुख्यालय)', 'Deori', 'Gondia', TRUE, TRUE, 1),
  ('chichgarh', 'Chichgarh', 'चिचगड', 'Deori', 'Gondia', FALSE, TRUE, 2),
  ('soundad', 'Soundad', 'सौंदड', 'Deori', 'Gondia', FALSE, TRUE, 3),
  ('borgaon', 'Borgaon', 'बोरगाव', 'Deori', 'Gondia', FALSE, TRUE, 4),
  ('salekasa-border', 'Salekasa Border Belt', 'सालेकसा सीमा क्षेत्र', 'Deori', 'Gondia', FALSE, TRUE, 5),
  ('shiwnikalan', 'Shiwnikalan', 'शिवणीकलां', 'Deori', 'Gondia', FALSE, TRUE, 6),
  ('mando-devi', 'Mando Devi Temple Precinct', 'मांडो देवी परिसर', 'Deori', 'Gondia', FALSE, TRUE, 7),
  ('kohmara', 'Kohmara Junction', 'कोहमारा जंक्शन', 'Deori', 'Gondia', FALSE, TRUE, 8);

-- 2. Comprehensive Permissions Catalog
INSERT IGNORE INTO permissions (id, name, module, description) VALUES
  -- Business & Listings
  ('business.view', 'View Business', 'business', 'View business profile and workspace dashboard'),
  ('business.edit', 'Edit Business', 'business', 'Update business profile details, contact info, and address'),
  ('branches.manage', 'Manage Branches', 'branches', 'Add, modify, and remove business branch locations'),
  ('team.invite', 'Invite Team Members', 'team', 'Send invitations to add staff members to this business profile'),
  ('team.manage_roles', 'Manage Team Roles', 'team', 'Assign roles and revoke access for team members'),
  ('listings.create', 'Create Listings', 'listings', 'Publish listings, jobs, rentals, and services under this business'),
  ('listings.manage', 'Manage Listings', 'listings', 'Update, pause, or remove business listings'),
  ('enquiries.view', 'View Enquiries', 'enquiries', 'Read customer inquiries, quote requests, and job applications'),
  ('enquiries.respond', 'Respond to Enquiries', 'enquiries', 'Communicate and send responses to customer inquiries'),
  ('ownership.transfer', 'Transfer Ownership', 'business', 'Initiate or complete controlled transfer of business ownership'),
  -- Civic & Community
  ('events.submit', 'Submit Events', 'events', 'Submit public cultural, civic, or business events for review'),
  ('events.review', 'Review Events', 'events', 'Approve, reject, or request changes on submitted events'),
  ('news.submit', 'Submit News', 'news', 'Submit community news reports for editorial review'),
  ('news.publish', 'Publish News', 'news', 'Review, edit, and publish verified news articles'),
  ('notices.publish', 'Publish Notices', 'notices', 'Verify against authoritative sources and publish official government notices'),
  ('emergency.manage', 'Manage Emergency Contacts', 'emergency', 'Add and edit official taluka emergency and helpline listings'),
  ('emergency.verify', 'Verify Emergency Contacts', 'emergency', 'Review authoritative evidence and verify emergency directory entries'),
  -- Administration & Moderation
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

-- 3. System Role Templates
INSERT IGNORE INTO roles (id, business_profile_id, name, description, is_system_template) VALUES
  ('owner', NULL, 'Owner', 'Full control over the business profile, branches, billing, and ownership transfer', TRUE),
  ('manager', NULL, 'Manager', 'Can manage business info, branches, team members, listings, and customer enquiries', TRUE),
  ('listings_staff', NULL, 'Listings Staff', 'Can create, edit, and manage catalog listings and service offerings', TRUE),
  ('enquiry_handler', NULL, 'Enquiry Handler', 'Can view and respond to incoming customer enquiries and requests', TRUE),
  ('super_admin', NULL, 'Super Administrator', 'Unrestricted administrative access to all taluka system modules, roles, and audits', TRUE),
  ('admin', NULL, 'Administrator', 'Full administrative authority across moderation, verification, reports, restrictions, and audit viewer', TRUE),
  ('moderator', NULL, 'Moderator', 'Reviews content submissions, listings, and community reports across modules', TRUE),
  ('verifier', NULL, 'Verification Reviewer', 'Reviews official documents and issues verification badges for users, businesses, and professionals', TRUE);

-- 4. Role Permissions Mapping
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  -- Business Roles
  ('owner', 'business.view'), ('owner', 'business.edit'), ('owner', 'branches.manage'), ('owner', 'team.invite'),
  ('owner', 'team.manage_roles'), ('owner', 'listings.create'), ('owner', 'listings.manage'), ('owner', 'enquiries.view'),
  ('owner', 'enquiries.respond'), ('owner', 'ownership.transfer'),
  ('manager', 'business.view'), ('manager', 'business.edit'), ('manager', 'branches.manage'), ('manager', 'team.invite'),
  ('manager', 'listings.create'), ('manager', 'listings.manage'), ('manager', 'enquiries.view'), ('manager', 'enquiries.respond'),
  ('listings_staff', 'business.view'), ('listings_staff', 'listings.create'), ('listings_staff', 'listings.manage'),
  ('enquiry_handler', 'business.view'), ('enquiry_handler', 'enquiries.view'), ('enquiry_handler', 'enquiries.respond'),
  -- Administrative Roles
  ('super_admin', 'admin.dashboard.view'), ('super_admin', 'moderation.listings.review'), ('super_admin', 'moderation.events.review'),
  ('super_admin', 'moderation.news.review'), ('super_admin', 'moderation.notices.review'), ('super_admin', 'moderation.emergency.review'),
  ('super_admin', 'verification.user.review'), ('super_admin', 'verification.business.review'), ('super_admin', 'verification.professional.review'),
  ('super_admin', 'reports.manage'), ('super_admin', 'restrictions.manage'), ('super_admin', 'appeals.review'),
  ('super_admin', 'audit.view'), ('super_admin', 'admin.users.manage_roles'),
  ('admin', 'admin.dashboard.view'), ('admin', 'moderation.listings.review'), ('admin', 'moderation.events.review'),
  ('admin', 'moderation.news.review'), ('admin', 'moderation.notices.review'), ('admin', 'moderation.emergency.review'),
  ('admin', 'verification.user.review'), ('admin', 'verification.business.review'), ('admin', 'verification.professional.review'),
  ('admin', 'reports.manage'), ('admin', 'restrictions.manage'), ('admin', 'appeals.review'), ('admin', 'audit.view'),
  ('moderator', 'admin.dashboard.view'), ('moderator', 'moderation.listings.review'), ('moderator', 'moderation.events.review'),
  ('moderator', 'moderation.news.review'), ('moderator', 'moderation.notices.review'), ('moderator', 'moderation.emergency.review'),
  ('moderator', 'reports.manage'),
  ('verifier', 'admin.dashboard.view'), ('verifier', 'verification.user.review'), ('verifier', 'verification.business.review'),
  ('verifier', 'verification.professional.review');

-- 5. Verified National & State Emergency Lifelines
INSERT IGNORE INTO emergency_contacts (
  id, name, department, category, primary_phone, opening_hours, authoritative_source, is_verified, last_verified_at, status, is_national_standard, sort_order
) VALUES
  ('emer-national-112', 'Emergency Response Support System (ERSS)', 'Police, Fire, Medical Unified Line', 'police', '112', '24x7 All Days', 'Ministry of Home Affairs, Government of India (pan-India ERSS 112)', TRUE, NOW(), 'active', TRUE, 1),
  ('emer-state-108', 'Maharashtra Emergency Medical Services (MEMS)', 'Public Health Department, Govt of Maharashtra', 'medical', '108', '24x7 All Days', 'Public Health Department, Govt of Maharashtra (Toll-Free 108 Ambulance Network)', TRUE, NOW(), 'active', TRUE, 2);

-- 6. Mark All Migrations As Applied
INSERT IGNORE INTO schema_migrations (migration_name) VALUES
  ('001_phase1_foundation.sql'),
  ('002_phase2_auth_and_business.sql'),
  ('003_seed_taluka_areas.sql'),
  ('004_phase3_core_marketplace.sql'),
  ('005_phase4_user_activity_and_requests.sql'),
  ('006_phase5_civic_news_events_emergency.sql'),
  ('007_phase6_admin_moderation_verification.sql'),
  ('008_phase7_search_saved_items.sql');

-- ====================================================================
-- End of LocalHub X Database Script
-- ====================================================================
