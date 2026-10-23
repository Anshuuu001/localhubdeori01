-- ====================================================================
-- LocalHub X - Phase 3 Core Marketplace Modules Schema
-- Deori Taluka & Nearby Areas, Gondia District, Maharashtra
-- Modules: Jobs Hub, Rentals & PG, Marketplace (New Only),
--          Krishi Bazaar, Local Services, Business Directory
-- Additive & Non-Destructive Migration
-- ====================================================================

-- 1. Extend business_profiles for Business Directory & Public Presentation
ALTER TABLE business_profiles
  ADD COLUMN operating_hours VARCHAR(255) NULL,
  ADD COLUMN logo_url VARCHAR(255) NULL,
  ADD COLUMN banner_url VARCHAR(255) NULL,
  ADD COLUMN photos JSON NULL,
  ADD COLUMN is_phone_public BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN is_email_public BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN whatsapp_number VARCHAR(30) NULL,
  ADD COLUMN website VARCHAR(255) NULL;

-- 2. Extend business_branches with branch-specific contact & hours
ALTER TABLE business_branches
  ADD COLUMN operating_hours VARCHAR(255) NULL,
  ADD COLUMN email VARCHAR(191) NULL,
  ADD COLUMN whatsapp_number VARCHAR(30) NULL;

-- 3. Core Listings Table (Shared baseline for all 5 listing modules)
CREATE TABLE IF NOT EXISTS listings (
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
  status ENUM('published', 'pending_review', 'paused', 'closed', 'archived', 'rejected') NOT NULL DEFAULT 'pending_review',
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

-- 4. Module 1: Jobs Hub Details
CREATE TABLE IF NOT EXISTS listing_jobs (
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

-- 5. Module 2: Rentals & PG Details
CREATE TABLE IF NOT EXISTS listing_rentals (
  listing_id VARCHAR(36) PRIMARY KEY,
  property_type ENUM('room', 'pg', 'flat', 'house', 'shop', 'commercial_space') NOT NULL,
  deposit_amount DECIMAL(12, 2) NULL DEFAULT 0,
  furnishing_status VARCHAR(50) NULL,
  amenities JSON NULL,
  address_details VARCHAR(255) NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Module 3: Marketplace (New Products Only)
CREATE TABLE IF NOT EXISTS listing_marketplace (
  listing_id VARCHAR(36) PRIMARY KEY,
  is_condition_new BOOLEAN NOT NULL DEFAULT TRUE,
  warranty_info VARCHAR(200) NULL,
  brand VARCHAR(100) NULL,
  sku VARCHAR(100) NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Module 4: Krishi Bazaar (Agri Products & Equipment)
CREATE TABLE IF NOT EXISTS listing_krishi (
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

-- 8. Module 5: Local Services Details
CREATE TABLE IF NOT EXISTS listing_services (
  listing_id VARCHAR(36) PRIMARY KEY,
  service_mode ENUM('at_provider_location', 'at_customer_location', 'both') NOT NULL DEFAULT 'both',
  pricing_type ENUM('fixed', 'starting_at', 'quote_on_inspection', 'hourly') NOT NULL DEFAULT 'quote_on_inspection',
  service_hours VARCHAR(100) NULL,
  experience_years INT NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Listing & Profile Reports / Corrections Queue
CREATE TABLE IF NOT EXISTS listing_reports (
  id VARCHAR(36) PRIMARY KEY,
  target_type ENUM('listing', 'business_profile') NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  reporter_user_id VARCHAR(36) NULL,
  reporter_name VARCHAR(100) NULL,
  reporter_contact VARCHAR(100) NULL,
  reason VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  status ENUM('submitted', 'under_review', 'resolved', 'dismissed') NOT NULL DEFAULT 'submitted',
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports_target (target_type, target_id),
  INDEX idx_reports_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
