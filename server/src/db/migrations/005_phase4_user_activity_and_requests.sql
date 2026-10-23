-- ====================================================================
-- LocalHub X - Phase 4 User Activity & Request Tracking Schema
-- Deori Taluka & Nearby Areas, Gondia District, Maharashtra
-- Modules: Job Applications, Listing Enquiries, Service Requests,
--          Transit Requests (Rides & Deliveries), Status History & Notifications
-- Additive & Non-Destructive Migration
-- ====================================================================

-- 1. Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
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

-- 2. Rental & General Listing Enquiries
CREATE TABLE IF NOT EXISTS listing_enquiries (
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

-- 3. Local Service Requests
CREATE TABLE IF NOT EXISTS service_requests (
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

-- 4. Ride and Delivery Requests (Transit & Logistics)
CREATE TABLE IF NOT EXISTS transit_requests (
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

-- 5. Append-Only Status History & Audit Log
CREATE TABLE IF NOT EXISTS request_status_history (
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

-- 6. In-App Notifications Integration
CREATE TABLE IF NOT EXISTS notifications (
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
