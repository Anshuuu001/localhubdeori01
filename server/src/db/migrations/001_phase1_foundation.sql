-- ====================================================================
-- LocalHub X - Phase 1 Foundation Schema Migration
-- Taluka: Deori Taluka, District Gondia, Maharashtra
-- DO NOT RUN DESTRUCTIVE OPERATIONS WITHOUT EXPLICIT APPROVAL
-- ====================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System configurations and metadata
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configurable Taluka administrative areas (Deori Taluka & neighboring areas)
-- NOTE: Locality is explicitly user-selected, not GPS-derived.
CREATE TABLE IF NOT EXISTS taluka_areas (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  marathi_name VARCHAR(100),
  taluka VARCHAR(100) NOT NULL DEFAULT 'Deori',
  district VARCHAR(100) NOT NULL DEFAULT 'Gondia',
  is_headquarters BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Foundational Audit Logs (to support immutable auditing across all future phases)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id VARCHAR(64) NULL,
  actor_role VARCHAR(50) DEFAULT 'system',
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- SKELETON REFERENCE FOR SUBSEQUENT PHASES (NOT EXECUTED IN PHASE 1):
-- Phase 2: users, user_identities, business_profiles, business_team_members
-- Phase 3: listings, listing_categories, business_branches
-- Phase 4: applications, enquiries, service_requests, ride_requests, activity_logs
-- Phase 5: events, news_articles, govt_notices, verified_emergency_contacts
-- Phase 6: moderation_queue, reports, appeals, admin_permissions
-- Phase 7: universal_search_index, saved_items, notifications
-- ====================================================================
