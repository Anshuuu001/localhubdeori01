-- ====================================================================
-- LocalHub X - Phase 5 Civic Engagement, News, Events & Emergency Schema
-- Deori Taluka & Nearby Areas, Gondia District, Maharashtra
-- Modules: Events Desk, Taluka News Feed, Government Notices,
--          Verified Emergency Contacts & Correction Reports
-- Additive & Non-Destructive Migration
-- ====================================================================

-- 1. Extend users table with system role ('citizen', 'editor', 'admin')
ALTER TABLE users ADD COLUMN role ENUM('citizen', 'editor', 'admin') NOT NULL DEFAULT 'citizen';

-- 2. Seed Initial Phase 5 Permissions Catalog
INSERT IGNORE INTO permissions (id, name, module, description) VALUES
  ('events.submit', 'Submit Events', 'events', 'Submit public cultural, civic, or business events for review'),
  ('events.review', 'Review Events', 'events', 'Approve, reject, or request changes on submitted events'),
  ('news.submit', 'Submit News', 'news', 'Submit community news reports for editorial review'),
  ('news.publish', 'Publish News', 'news', 'Review, edit, and publish verified news articles'),
  ('notices.publish', 'Publish Notices', 'notices', 'Verify against authoritative sources and publish official government notices'),
  ('emergency.manage', 'Manage Emergency Contacts', 'emergency', 'Add and edit official taluka emergency and helpline listings'),
  ('emergency.verify', 'Verify Emergency Contacts', 'emergency', 'Review authoritative evidence and verify emergency directory entries');

-- 3. Events Table
CREATE TABLE IF NOT EXISTS events (
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

-- 4. Event Responses (Interested / Going)
CREATE TABLE IF NOT EXISTS event_responses (
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

-- 5. Taluka News Articles
CREATE TABLE IF NOT EXISTS news_articles (
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

-- 6. News Corrections & Reporting Requests
CREATE TABLE IF NOT EXISTS news_corrections (
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

-- 7. Government Notices (Official Civic & Administrative Notices)
CREATE TABLE IF NOT EXISTS govt_notices (
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

-- 8. Verified Emergency & Critical Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
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

-- 9. Emergency Contact Correction & Inaccuracy Reports
CREATE TABLE IF NOT EXISTS emergency_contact_reports (
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

-- 10. Seed Authentic National & State Emergency Lines Only
INSERT IGNORE INTO emergency_contacts (
  id, name, department, category, primary_phone, opening_hours, authoritative_source, is_verified, last_verified_at, status, is_national_standard, sort_order
) VALUES
  ('emer-national-112', 'Emergency Response Support System (ERSS)', 'Police, Fire, Medical Unified Line', 'police', '112', '24x7 All Days', 'Ministry of Home Affairs, Government of India (pan-India ERSS 112)', TRUE, NOW(), 'active', TRUE, 1),
  ('emer-state-108', 'Maharashtra Emergency Medical Services (MEMS)', 'Public Health Department, Govt of Maharashtra', 'medical', '108', '24x7 All Days', 'Public Health Department, Govt of Maharashtra (Toll-Free 108 Ambulance Network)', TRUE, NOW(), 'active', TRUE, 2);
