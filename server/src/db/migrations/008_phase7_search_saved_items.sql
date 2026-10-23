-- ====================================================================
-- LocalHub X - Phase 7 Home Dashboard, Universal Search & Discovery
-- Taluka: Deori Taluka, District Gondia, Maharashtra
-- Additive Schema Migration (Strictly Non-Destructive)
-- ====================================================================

-- 1. Saved Items / Bookmarks
CREATE TABLE IF NOT EXISTS saved_items (
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

-- 2. User Search History (Private to authenticated user)
CREATE TABLE IF NOT EXISTS user_search_history (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  query_text VARCHAR(150) NOT NULL,
  module_filter VARCHAR(50) DEFAULT 'all',
  area_id VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_search_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_search_history_user (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. User Preferences (Pinned modules, discovery interests)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(64) PRIMARY KEY,
  pinned_modules JSON NULL COMMENT 'Array of module slugs or IDs',
  preferred_area_id VARCHAR(50) NULL,
  interest_tags JSON NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

