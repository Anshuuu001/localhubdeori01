import http from 'http';
import { env } from '../config/env.js';
import { executeQuery } from '../config/database.js';
import app from '../index.js';

let testPort = env.port;
let BASE_URL = `http://localhost:${env.port}`;
let dedicatedServer = null;

function setupServer() {
  return new Promise((resolve) => {
    dedicatedServer = app.listen(0, () => {
      testPort = dedicatedServer.address().port;
      BASE_URL = `http://localhost:${testPort}`;
      resolve();
    });
  });
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function extractCookie(res, cookieName) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return null;
  const match = setCookie.find(c => c.startsWith(`${cookieName}=`));
  if (!match) return null;
  return match.split(';')[0].split('=')[1];
}

async function runTestSuite() {
  await setupServer();
  console.log('========================================================');
  console.log(' LocalHub X - Phase 3 Core Marketplace Test Suite');
  console.log(' Taluka: Deori Taluka, Maharashtra');
  console.log(' Target:', BASE_URL);
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    const ts = Date.now();

    // 1. Setup Test Users
    // User A: Verified Business Owner
    const userAEmail = `owner_verified_${ts}@deorihub.local`;
    const regA = await request('POST', '/api/auth/register', {
      fullName: 'Ramesh Patil (Verified Shopkeeper)',
      email: userAEmail,
      password: 'SecurePassword@2026',
    });
    assert(regA.status === 201, 'User A registered', `Status: ${regA.status}`);
    const userASession = extractCookie(regA, 'lhx_session');
    const userACsrf = regA.body?.csrfToken;
    const userAHeaders = {
      Cookie: `lhx_session=${userASession}`,
      'X-CSRF-Token': userACsrf,
    };

    // User B: Unverified Business Owner
    const userBEmail = `owner_unverified_${ts}@deorihub.local`;
    const regB = await request('POST', '/api/auth/register', {
      fullName: 'Suresh Bahekar (New Trader)',
      email: userBEmail,
      password: 'SecurePassword@2026',
    });
    assert(regB.status === 201, 'User B registered', `Status: ${regB.status}`);
    const userBSession = extractCookie(regB, 'lhx_session');
    const userBCsrf = regB.body?.csrfToken;
    const userBHeaders = {
      Cookie: `lhx_session=${userBSession}`,
      'X-CSRF-Token': userBCsrf,
    };

    // User C: Unrelated citizen for IDOR tests
    const userCEmail = `citizen_unrelated_${ts}@deorihub.local`;
    const regC = await request('POST', '/api/auth/register', {
      fullName: 'Anita Dongre (Citizen)',
      email: userCEmail,
      password: 'SecurePassword@2026',
    });
    const userCSession = extractCookie(regC, 'lhx_session');
    const userCCsrf = regC.body?.csrfToken;
    const userCHeaders = {
      Cookie: `lhx_session=${userCSession}`,
      'X-CSRF-Token': userCCsrf,
    };

    // 2. Setup Business Profiles
    // Business 1: Owned by User A, explicitly verified in DB
    const bizARes = await request('POST', '/api/business', {
      name: `Deori Agro & Hardware Center ${ts}`,
      businessType: 'Retail & Agriculture',
      category: 'Hardware & Electrical',
      description: 'Authorized retailer for solar pumps, seeds, and hardware on NH-53 Deori.',
      addressLine1: 'NH-53 Main Road, Deori Market',
      talukaAreaId: 'deori-hq',
    }, userAHeaders);
    assert(bizARes.status === 201, 'Business A created', `ID: ${bizARes.body?.business?.id}`);
    const bizAId = bizARes.body?.business?.id;

    // Simulate official administrative verification for Business A
    await executeQuery(
      "UPDATE business_profiles SET verification_status = 'verified' WHERE id = ?",
      [bizAId]
    );

    // Add branch to Business A
    const branchARes = await request('POST', `/api/business/${bizAId}/branches`, {
      branchName: 'Chichgarh Agro Depot',
      talukaAreaId: 'chichgarh',
      address: 'Chichgarh Main Chowk',
      phone: '9822112233',
    }, userAHeaders);
    assert(branchARes.status === 201, 'Branch added to Business A');
    const branchAId = branchARes.body?.branch?.id;

    // Business 2: Owned by User B, strictly unverified
    const bizBRes = await request('POST', '/api/business', {
      name: `Bahekar General Store ${ts}`,
      businessType: 'Retail',
      category: 'Marketplace',
      description: 'General merchant in Soundad circle.',
      addressLine1: 'Soundad Station Road',
      talukaAreaId: 'soundad',
    }, userBHeaders);
    assert(bizBRes.status === 201, 'Business B created');
    const bizBId = bizBRes.body?.business?.id;

    // -------------------------------------------------------------------------
    // MODULE 1: JOBS HUB
    // -------------------------------------------------------------------------
    console.log('\n--- MODULE 1: JOBS HUB ---');

    // Test 1.1: Verified business creates job -> Direct Publication
    const jobVerified = await request('POST', '/api/listings', {
      module: 'jobs',
      providerType: 'business',
      businessProfileId: bizAId,
      talukaAreaId: 'deori-hq',
      title: 'Store Accountant & Inventory Manager',
      category: 'Accounts & Billing',
      description: 'Seeking experienced Tally accountant for Deori hardware store. Good salary with festive bonus.',
      price: 18000,
      pricePeriod: 'monthly',
      isPriceNegotiable: true,
      jobType: 'Full-time',
      qualifications: 'B.Com / Tally Certified',
      experienceRequired: '1-2 years',
      vacanciesCount: 2,
      applicationMethod: 'direct_call',
      contactPhone: '9822000001',
    }, userAHeaders);

    assert(jobVerified.status === 201, 'Create job listing under verified business', `Status: ${jobVerified.status}`);
    assert(jobVerified.body?.status === 'published', 'Verified business job is published immediately');
    const jobAId = jobVerified.body?.listingId;

    // Test 1.2: Unverified business creates job -> Pending Review
    const jobUnverified = await request('POST', '/api/listings', {
      module: 'jobs',
      providerType: 'business',
      businessProfileId: bizBId,
      talukaAreaId: 'soundad',
      title: 'Shop Assistant (Unverified Shop)',
      category: 'Retail & Shop Assistant',
      description: 'Assistant needed for counter sales in Soundad.',
      price: 9000,
      pricePeriod: 'monthly',
      jobType: 'Full-time',
    }, userBHeaders);

    assert(jobUnverified.status === 201, 'Create job listing under unverified business');
    assert(jobUnverified.body?.status === 'pending_review', 'Unverified business job is routed to pending_review');
    const jobBId = jobUnverified.body?.listingId;

    // Test 1.3: Public search returns verified job, NOT pending review job
    const publicJobs = await request('GET', '/api/listings?module=jobs');
    const foundJobA = publicJobs.body?.listings?.some(l => l.id === jobAId);
    const foundJobB = publicJobs.body?.listings?.some(l => l.id === jobBId);
    assert(foundJobA === true, 'Published job visible in public search');
    assert(foundJobB === false, 'Pending review job hidden from public search');

    // -------------------------------------------------------------------------
    // MODULE 2: RENTALS & PG
    // -------------------------------------------------------------------------
    console.log('\n--- MODULE 2: RENTALS & PG ---');

    const rentalRes = await request('POST', '/api/listings', {
      module: 'rentals',
      providerType: 'business',
      businessProfileId: bizAId,
      talukaAreaId: 'deori-hq',
      title: 'Commercial Retail Shop on NH-53 Deori',
      category: 'Commercial Shop',
      description: 'Shutter shop with main road frontage, 24x7 water and three-phase meter.',
      price: 8000,
      pricePeriod: 'monthly',
      propertyType: 'shop',
      depositAmount: 25000,
      furnishingStatus: 'unfurnished',
      amenities: ['24x7 Water Supply', 'Commercial Shutter', 'Separate Electricity Meter'],
      contactPhone: '9822000001',
    }, userAHeaders);

    assert(rentalRes.status === 201, 'Create rental listing');
    const rentalId = rentalRes.body?.listingId;

    // Test 2.1: Fast availability toggle (available -> rented)
    const toggleRented = await request('PATCH', `/api/listings/${rentalId}/availability`, {
      availabilityStatus: 'rented',
    }, userAHeaders);
    assert(toggleRented.status === 200, 'Update availability to rented');

    const detailRental = await request('GET', `/api/listings/${rentalId}`);
    assert(detailRental.body?.listing?.availability_status === 'rented', 'Rental availability persisted as rented in MySQL');

    // -------------------------------------------------------------------------
    // MODULE 3: MARKETPLACE (STRICTLY NEW PRODUCTS)
    // -------------------------------------------------------------------------
    console.log('\n--- MODULE 3: MARKETPLACE ---');

    // Test 3.1: Valid brand-new product listing
    const productRes = await request('POST', '/api/listings', {
      module: 'marketplace',
      providerType: 'business',
      businessProfileId: bizAId,
      talukaAreaId: 'deori-hq',
      title: 'Kirloskar 5HP Solar Water Submersible Pump',
      category: 'Solar & Irrigation',
      description: 'Brand new 5HP solar pump with 5-year manufacturer warranty and installation support.',
      price: 65000,
      isConditionNew: true,
      warrantyInfo: '5 Years Manufacturer Warranty',
      brand: 'Kirloskar',
      sku: 'KIR-SOLAR-5HP',
      availabilityStatus: 'in_stock',
      contactPhone: '9822000001',
    }, userAHeaders);

    assert(productRes.status === 201, 'Create brand-new marketplace product', `Status: ${productRes.status}`);
    const productId = productRes.body?.listingId;

    // Test 3.2: Rejection of second-hand listings
    const secondHandRes = await request('POST', '/api/listings', {
      module: 'marketplace',
      providerType: 'business',
      businessProfileId: bizAId,
      talukaAreaId: 'deori-hq',
      title: 'Old Used Mobile Phone Second-Hand',
      category: 'Electronics',
      description: 'Used for 2 years, good condition.',
      price: 3000,
      isConditionNew: false, // Second-hand attempt!
    }, userAHeaders);

    assert(secondHandRes.status === 400, 'Rejection of second-hand marketplace listing', secondHandRes.body?.error?.code);
    assert(secondHandRes.body?.error?.code === 'SECOND_HAND_PROHIBITED', 'Explicit SECOND_HAND_PROHIBITED error returned');

    // Test 3.3: Stock availability toggle (in_stock -> out_of_stock)
    const toggleStock = await request('PATCH', `/api/listings/${productId}/availability`, {
      availabilityStatus: 'out_of_stock',
    }, userAHeaders);
    assert(toggleStock.status === 200, 'Marketplace stock toggle to out_of_stock');

    // -------------------------------------------------------------------------
    // MODULE 4: KRISHI BAZAAR
    // -------------------------------------------------------------------------
    console.log('\n--- MODULE 4: KRISHI BAZAAR ---');

    // Test 4.1: Agricultural Crop Produce
    const cropRes = await request('POST', '/api/listings', {
      module: 'krishi_products',
      providerType: 'business',
      businessProfileId: bizAId,
      talukaAreaId: 'deori-hq',
      title: 'Certified Shriram 1010 Paddy Harvest Lot',
      category: 'Paddy & Rice',
      description: 'Fresh autumn harvest paddy, moisture tested below 14%, clean grain.',
      price: 2400,
      krishiType: 'product',
      cropName: 'Shriram 1010 Paddy',
      quantity: 120,
      unit: 'Quintal',
      availabilityStatus: 'available',
      contactPhone: '9822000001',
    }, userAHeaders);
    assert(cropRes.status === 201, 'Create agricultural crop produce listing');
    const cropId = cropRes.body?.listingId;

    // Test 4.2: Agricultural Equipment Rental
    const equipRes = await request('POST', '/api/listings', {
      module: 'krishi_equipment',
      providerType: 'business',
      businessProfileId: bizAId,
      talukaAreaId: 'chichgarh',
      businessBranchId: branchAId,
      title: 'Mahindra 575 DI Tractor with Rotavator for Hire',
      category: 'Tractors & Tillage',
      description: 'Available with experienced driver. Diesel charged as per actual consumption.',
      price: 900,
      krishiType: 'equipment',
      equipmentName: 'Mahindra 575 DI',
      equipmentType: 'Tractor',
      listingMode: 'rental',
      rentalRateUnit: 'per_hour',
      rentalTerms: 'Driver included, diesel excluded',
      securityDeposit: 0,
      availabilityStatus: 'available',
      contactPhone: '9822000001',
    }, userAHeaders);
    assert(equipRes.status === 201, 'Create equipment rental listing');
    const equipId = equipRes.body?.listingId;

    // Test 4.3: Equipment booking toggle (available -> booked)
    const toggleBooked = await request('PATCH', `/api/listings/${equipId}/availability`, {
      availabilityStatus: 'booked',
    }, userAHeaders);
    assert(toggleBooked.status === 200, 'Equipment availability updated to booked');

    // -------------------------------------------------------------------------
    // MODULE 5: LOCAL SERVICES
    // -------------------------------------------------------------------------
    console.log('\n--- MODULE 5: LOCAL SERVICES ---');

    // Test 5.1: Business Service Listing
    const serviceRes = await request('POST', '/api/listings', {
      module: 'services',
      providerType: 'business',
      businessProfileId: bizAId,
      talukaAreaId: 'deori-hq',
      title: 'Agricultural Pump Installation & Motor Rewinding',
      category: 'Appliance Repair',
      description: 'Certified technicians for single-phase & three-phase motor winding and on-site servicing.',
      price: 500,
      pricingType: 'quote_on_inspection',
      serviceMode: 'both',
      serviceHours: 'Mon - Sat 8:00 AM - 8:00 PM',
      experienceYears: 7,
      contactPhone: '9822000001',
      contactWhatsapp: '9822000001',
    }, userAHeaders);
    assert(serviceRes.status === 201, 'Create local services listing');
    const serviceId = serviceRes.body?.listingId;

    // -------------------------------------------------------------------------
    // PRIVACY & CONTACT MASKING
    // -------------------------------------------------------------------------
    console.log('\n--- PRIVACY & CONTACT MASKING ---');

    // Create listing with isContactHidden = true
    const hiddenContactRes = await request('POST', '/api/listings', {
      module: 'rentals',
      providerType: 'business',
      businessProfileId: bizAId,
      talukaAreaId: 'deori-hq',
      title: 'Private 2BHK House (Owner Requests In-Platform Contact)',
      category: 'Independent House',
      description: 'Residential property in quiet neighborhood.',
      price: 12000,
      propertyType: 'house',
      contactPhone: '9822999999',
      contactEmail: 'private@landlord.local',
      contactWhatsapp: '9822999999',
      isContactHidden: true, // Contact hidden!
    }, userAHeaders);
    assert(hiddenContactRes.status === 201, 'Create listing with hidden contact');
    const hiddenId = hiddenContactRes.body?.listingId;

    const publicHidden = await request('GET', `/api/listings/${hiddenId}`);
    assert(publicHidden.body?.listing?.contact_phone === null, 'contact_phone omitted from public view when hidden');
    assert(publicHidden.body?.listing?.contact_email === null, 'contact_email omitted from public view when hidden');
    assert(publicHidden.body?.listing?.contact_whatsapp === null, 'contact_whatsapp omitted from public view when hidden');
    assert(publicHidden.body?.listing?.is_contact_hidden === true, 'is_contact_hidden flag returned true to instruct frontend');

    // -------------------------------------------------------------------------
    // IDOR & ACCESS CONTROL SAFEGUARDS
    // -------------------------------------------------------------------------
    console.log('\n--- IDOR & ACCESS CONTROL SAFEGUARDS ---');

    // Test 6.1: User C attempts to create listing under User A's business (Privilege escalation)
    const idorCreate = await request('POST', '/api/listings', {
      module: 'jobs',
      providerType: 'business',
      businessProfileId: bizAId, // Belongs to User A!
      title: 'Malicious Injected Job',
      category: 'General',
      description: 'Attempting unauthorized listing under someone else business.',
    }, userCHeaders);
    assert(idorCreate.status === 403, 'Unauthorized user blocked from creating listing under another business', idorCreate.body?.error?.code);

    // Test 6.2: User C attempts to edit User A's listing (IDOR Update)
    const idorEdit = await request('PATCH', `/api/listings/${jobAId}`, {
      title: 'Hacked Title By Attacker',
    }, userCHeaders);
    assert(idorEdit.status === 403, 'Unauthorized user blocked from modifying another business listing (IDOR)', idorEdit.body?.error?.code);

    // Test 6.3: User C attempts to archive User A's listing (IDOR Delete)
    const idorDelete = await request('DELETE', `/api/listings/${jobAId}`, null, userCHeaders);
    assert(idorDelete.status === 403, 'Unauthorized user blocked from deleting another business listing (IDOR)', idorDelete.body?.error?.code);

    // Test 6.4: Unverified business owner attempts to directly set status to 'published'
    const bypassModeration = await request('PATCH', `/api/listings/${jobBId}/status`, {
      status: 'published',
    }, userBHeaders);
    assert(bypassModeration.status === 403, 'Unverified business cannot bypass moderation by patching status to published', bypassModeration.body?.error?.code);

    // -------------------------------------------------------------------------
    // MODULE 6: BUSINESS DIRECTORY
    // -------------------------------------------------------------------------
    console.log('\n--- MODULE 6: BUSINESS DIRECTORY ---');

    // Test 7.1: Public Directory list
    const dirList = await request('GET', '/api/directory?limit=50');
    assert(dirList.status === 200, 'GET /api/directory returns active businesses');
    assert(dirList.body?.businesses?.length >= 2, `Directory returned ${dirList.body?.businesses?.length} businesses`);

    // Verify verified badge is true for Business A, and false for Business B
    const bizAEntry = dirList.body?.businesses?.find(b => b.id === bizAId);
    const bizBEntry = dirList.body?.businesses?.find(b => b.id === bizBId);
    assert(bizAEntry?.isVerified === true, 'Business A displays verified state from real database record');
    assert(bizBEntry?.isVerified === false, 'Business B displays unverified state (no fabricated badge)');

    // Test 7.2: Single Business Directory Detail with Branches and Catalog
    const dirDetail = await request('GET', `/api/directory/${bizAId}`);
    assert(dirDetail.status === 200, 'GET /api/directory/:id returns business details');
    assert(dirDetail.body?.business?.branches?.length >= 1, 'Business branches aggregated into directory entry');
    assert(dirDetail.body?.business?.branches?.some(b => b.branch_name === 'Chichgarh Agro Depot'), 'Branch name correctly retrieved');

    assert(dirDetail.body?.business?.listings?.length >= 3, `Directory detail contains ${dirDetail.body?.business?.listings?.length} published catalog listings`);
    assert(Boolean(dirDetail.body?.business?.verificationDisclaimer), 'Directory provides honest verification disclaimer');

    // -------------------------------------------------------------------------
    // REPORTING & MODERATION QUEUE
    // -------------------------------------------------------------------------
    console.log('\n--- REPORTING & MODERATION REVIEW WORKFLOW ---');

    // Test 8.1: Citizen submits report for a listing
    const reportRes = await request('POST', '/api/reports', {
      targetType: 'listing',
      targetId: jobAId,
      reason: 'Wrong Category',
      details: 'This listing was posted under Accounts but refers to shop assistant duties.',
      reporterName: 'Sunil Meshram',
      reporterContact: '9822334455',
    });
    assert(reportRes.status === 201, 'Submit report for listing persisted to database', `Status: ${reportRes.status}`);
    const reportId = reportRes.body?.reportId;

    // Verify report was persisted in MySQL
    const [dbReport] = await executeQuery('SELECT * FROM listing_reports WHERE id = ?', [reportId]);
    assert(dbReport.length === 1 && dbReport[0].status === 'submitted', 'Report recorded in MySQL listing_reports table');

    // Test 8.2: Moderation pending review list
    const pendingList = await request('GET', '/api/reports/moderation/pending', null, userAHeaders);
    assert(pendingList.status === 200, 'GET /api/reports/moderation/pending returns queue');
    const hasJobBInPending = pendingList.body?.pendingListings?.some(l => l.id === jobBId);
    assert(hasJobBInPending === true, 'Unverified job listing present in moderation queue');

    // Test 8.3: Moderation review approval
    const reviewRes = await request('POST', `/api/reports/moderation/review/${jobBId}`, {
      decision: 'published',
      notes: 'Approved after telephone verification with merchant.',
    }, userAHeaders);
    assert(reviewRes.status === 200, 'Moderation review approval succeeds');
    assert(reviewRes.body?.status === 'published', 'Listing status updated to published');

    // Verify job B is now visible in public search
    const publicJobsAfter = await request('GET', '/api/listings?module=jobs');
    const foundJobBAfter = publicJobsAfter.body?.listings?.some(l => l.id === jobBId);
    assert(foundJobBAfter === true, 'Approved listing now visible to public citizens');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('========================================================');
    console.log(` Summary: ${passed} passed, ${failed} failed out of ${passed + failed} assertions.`);
    console.log('========================================================');

    if (failed === 0) {
      console.log('ALL PHASE 3 CORE MARKETPLACE ACCEPTANCE CRITERIA PASSED.');
      process.exit(0);
    } else {
      console.error('SOME PHASE 3 TESTS FAILED.');
      process.exit(1);
    }
  } catch (err) {
    console.error('[UNCAUGHT TEST RUNNER ERROR]', err);
    process.exit(1);
  }
}

// Execute test suite
runTestSuite();
