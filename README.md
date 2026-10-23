# LocalHub X — Deori Taluka Local Super-App

> Production-oriented local super-app for Deori Taluka and nearby areas of Gondia District, Maharashtra, India.

---

## Architecture & Implementation Overview

LocalHub X is engineered as a resilient, localized super-app for rural and semi-urban Deori Taluka. The platform operates on a dark obsidian/slate design system with electric-blue accents, high contrast typography, and verified safeguards against predatory job fees, second-hand trade abuse, and unverified helplines.

### Technology Stack
- **Frontend**: React 19, Vite, Vanilla CSS Design System, Lucide React icons.
- **Backend**: Node.js v24+, Express 4.x, RESTful JSON APIs with parameterized queries.
- **Database Engine**: MySQL 8.0 with `mysql2` connection pooling and sequential schema migrations.continue 
- **Security**: HttpOnly cookie-based sessions, bcrypt password hashing, constant-time comparisons, CSRF token verification on mutating requests, strict IDOR authorization barriers.

---

## Implemented Phases

### Phase 1: Foundation, Civic Locality & Responsive Shell
- **Civic Locality**: Non-GPS manual village circle selection across Deori Taluka (Deori HQ, Chichgarh, Soundad, Borgaon, Salekasa Border, Shiwnikalan, Mando Devi, Kohmara).
- **Verified Emergency Access**: Prominent 112 / 108 helpline integration with safeguards against fabricated phone numbers.
- **Homepage Structure**: 6-tier hierarchy (Search Hero → Emergency Banner → 10 Core Modules → Local Feed → Recent Activity → Saved Items).

### Phase 2: Authentication, Security & Business Workspaces
- **Citizen Authentication**: Email/Password and simulated Phone OTP registration/login with single-use challenges and attempt limits.
- **Session & Device Management**: Active session tracking with client IP, user agent, and remote device revocation.
- **Account Protection**: Anti-enumeration password recovery, 30-day grace period account deletion, loss-of-identifiers review queue.
- **Business Workspaces**: Multi-branch business profiles, role-based access control (`owner`, `manager`, `listings_staff`, `service_operator`), controlled ownership transfer workflow.

### Phase 3: Core Marketplace Listings & Moderation
- **Jobs Hub**: Employer job postings with mandatory zero-fee applicant safeguards and salary transparency.
- **Rentals & PG**: Long-term housing, shops, and PG accommodations with live availability toggling (`available`, `rented`, `under_maintenance`).
- **Marketplace**: Brand-new goods catalog with strict rejection of second-hand listings (`SECOND_HAND_PROHIBITED`).
- **Krishi Bazaar**: Agricultural produce and heavy farm machinery rentals.
- **Local Services**: Verified service trade profiles (plumbers, electricians, mechanics, repair specialists).
- **Public Directory & Moderation**: Catalog search, contact masking for privacy, community reporting, and moderation approval queues.

### Phase 4: User Activity & Request Tracking
- **Job Applications**: End-to-end applicant lifecycle (`submitted` → `shortlisted` → `hired`, `rejected`, `withdrawn`) with duplicate submission prevention and complete contact privacy.
- **Property & Listing Enquiries**: In-platform enquiries (`sent` → `viewed` → `responded` → `closed`, `cancelled`) with contact masking and seller response notes.
- **Local Service Bookings**: On-demand service requests (`pending` → `accepted` → `in_progress` → `completed`, `rejected`, `cancelled`) with preferred dates, time slots, and mandatory rejection/cancellation reasons.
- **Ride & Delivery Requests**: Distinct passenger ride and parcel delivery dispatch with configurable 24-hour auto-expiry and stand-based pickup.
- **Status Audit Trail**: Append-only transition history (`request_status_history`) logged inside database transactions for every status update.
- **In-App Notifications**: Transactional alert dispatch (`notifications`) on status changes with unread count badge and one-click mark-all-read.
- **My Activity Dashboard**: Citizen central hub (`GET /api/activity/my-activity`) aggregating all request types with type tabs, status filters, search, pagination, and modal audit timelines.
- **Business Request Desk**: Team queue (`GET /api/business/:id/requests`) enabling business operators to review incoming customer requests and advance lifecycles.

### Phase 5: Civic Engagement, News, Notices & Emergency Verification
- **Civic Events Desk**: Community gathering and festival discovery with multi-tier moderation.
- **Taluka News & Media Feed**: Local journalism desk with verified official source accreditation.
- **Government & Civic Notices**: Taluka and Gram Panchayat bulletins with official source verification.
- **Emergency Helpline Directory**: 112/108 lifelines and verified local emergency contacts with dispute triage queue.

### Phase 6: Admin Panel, Moderation & Verification (NEW)
- **Role-Based Access Control (RBAC)**: Five staff roles (`super_admin`, `admin`, `moderator`, `verifier`, `editor`) with explicit module-level permissions catalog (`admin_user_permissions`) and least-privilege enforcement.
- **Self-Escalation Barrier**: Server-side checks preventing administrators from promoting their own roles or granting unauthorized capabilities.
- **Real Metrics Admin Dashboard**: Dynamic, query-level aggregation showing real database counts for pending reviews, verification requests, community reports, active appeals, restrictions, and urgent helpline disputes.
- **Central Moderation Queue**: Unified reviewer desk spanning all 10 modules (Jobs, Rentals, Marketplace, Krishi Products, Krishi Equipment, Services, Business Directory, Events, News, Notices, Emergency Contacts) with mandatory rejection reasons and server-enforced state machines.
- **Verification Engine & Document Access Governance**: Multi-tier verification requests for users, businesses, and professionals with audited document access logs (`document_access_logs`), badge lifecycles, and prominent limited-scope meaning disclaimers.
- **Reports & Safety Helpline Triage**: Prioritized reporting desk with urgent routing for emergency contact inaccuracies and public safety reports.
- **Proportionate Restrictions & 30-Day Appeals**: Graduated restriction management (`warning`, `listing_hold`, `feature_restriction`, `account_suspension`, `emergency_hold`) with a mandatory 30-day appeal window, justified late appeals, and separate reviewer adjudication.
- **Append-Only Audit Log Explorer**: Searchable, paginated audit trail (`audit_logs`) recording administrative actions, role assignments, document access, and restrictions with sanitized sensitive payloads.

---

## Database Migrations

Database migrations are located in `server/src/db/migrations/` and executed sequentially:

1. `001_phase1_foundation.sql`: Core taluka circles, 10 app modules, emergency contacts table.
2. `002_phase2_auth_and_business.sql`: Users, sessions, business profiles, branches, team memberships, invitations, and audit logs.
3. `003_seed_taluka_areas.sql`: Seed data for Deori Taluka circles and initial emergency lines.
4. `004_phase3_marketplace_listings.sql`: Listings, categories, images, and community reports.
5. `005_phase4_user_activity_and_requests.sql`: Job applications, listing enquiries, service requests, transit requests, status audit history, and in-app notifications.
6. `006_phase5_civic_news_emergency.sql`: Events, news, notices, civic engagement, and emergency corrections.
7. `007_phase6_admin_moderation_verification.sql`: Admin permissions, verification requests, verification badges, document access logs, restrictions, appeals, and moderation history.

Run migrations against your local MySQL instance:
```bash
npm run migrate --prefix server
```

---

## Setup & Running Locally

### 1. Install Dependencies
```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Configure Environment Variables
Ensure `server/.env` contains your MySQL database connection:
```bash
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# MySQL 8.0 Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=localhubx
```

### 3. Run Database Migrations
```bash
npm run migrate --prefix server
```

### 4. Start Development Servers
Run both backend API and frontend client concurrently:
```bash
npm run dev
```
- Backend REST API: `http://localhost:5000`
- Frontend Application: `http://localhost:5173`

---

## Automated Verification & Test Suites

The test suite validates backend security, business workflows, state machines, and data isolation across all phases (256 assertions):

Run all automated test suites:
```bash
npm run test:all
```

Or run individual module suites:
```bash
# Phase 2: Auth, Security, RBAC & Audit Trail (41 assertions)
npm run test:auth --prefix server

# Phase 3: Core Marketplace & Moderation (47 assertions)
npm run test:marketplace --prefix server

# Phase 4: User Activity & Request Tracking (61 assertions)
npm run test:activity --prefix server

# Phase 5: Civic Events, News, Notices & Emergency Lifelines (53 assertions)
npm run test:civic --prefix server

# Phase 6: Admin Panel, Moderation, Verification & Appeals (54 assertions)
npm run test:admin --prefix server
```

### Build Verification
Validate client frontend bundling:
```bash
npm run build
```
