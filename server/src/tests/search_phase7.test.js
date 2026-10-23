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
  console.log(' LocalHub X - Phase 7 Universal Search & Discovery Tests');
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

    // ------------------------------------------------------------------
    // Setup Test Users
    // ------------------------------------------------------------------
    // Citizen A
    const userAEmail = `citizen_a_p7_${ts}@deorihub.local`;
    const regUserA = await request('POST', '/api/auth/register', {
      fullName: 'Suresh Meshram (User A)',
      email: userAEmail,
      password: 'SecurePassword@2026',
      phone: `9825${String(ts).slice(-6)}`,
    });
    assert(regUserA.status === 201, 'Citizen A registered successfully', `Status: ${regUserA.status}`);
    const cookieA = extractCookie(regUserA, 'lhx_session');
    const csrfA = regUserA.body.csrfToken;
    const userAId = regUserA.body.user.id;

    // Citizen B (for data isolation testing)
    const userBEmail = `citizen_b_p7_${ts}@deorihub.local`;
    const regUserB = await request('POST', '/api/auth/register', {
      fullName: 'Sunita Rahangdale (User B)',
      email: userBEmail,
      password: 'SecurePassword@2026',
      phone: `9826${String(ts).slice(-6)}`,
    });
    const cookieB = extractCookie(regUserB, 'lhx_session');
    const csrfB = regUserB.body.csrfToken;
    const userBId = regUserB.body.user.id;

    // Admin / Staff user for publishing
    const adminEmail = `admin_p7_${ts}@deorihub.local`;
    const regAdmin = await request('POST', '/api/auth/register', {
      fullName: 'Admin User P7',
      email: adminEmail,
      password: 'AdminPassword@2026',
      phone: `9827${String(ts).slice(-6)}`,
    });
    const adminCookie = extractCookie(regAdmin, 'lhx_session');
    const adminCsrf = regAdmin.body.csrfToken;
    const adminId = regAdmin.body.user.id;

    // Promote admin user to super_admin
    await executeQuery(`UPDATE users SET role = 'super_admin' WHERE id = ?`, [adminId]);

    // Create Business Profile for User A
    const createBiz = await request('POST', '/api/business', {
      name: `Dongre Agro Industries ${ts}`,
      businessType: 'services_retail',
      category: 'Agriculture & Farm Equipment',
      description: 'Harvesters and tractors for Deori and Chichgarh circles',
      phone: '9822100200',
      whatsapp: '9822100200',
      email: `dongre_${ts}@agro.local`,
      talukaAreaId: 'deori-hq',
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    assert(createBiz.status === 201, 'Business profile created', `Status: ${createBiz.status}`);
    const bizId = createBiz.body.business.id;

    // Promote business to verified for testing
    await executeQuery(`UPDATE business_profiles SET verification_status = 'verified' WHERE id = ?`, [bizId]);

    // ------------------------------------------------------------------
    // SECTION 1: SEARCH QUERY VALIDATION
    // ------------------------------------------------------------------
    console.log('\n--- 1. SEARCH QUERY VALIDATION ---');
    const emptySearch = await request('GET', '/api/search?q=');
    assert(emptySearch.status === 400, 'Empty search query is rejected (QUERY_TOO_SHORT)', `Status: ${emptySearch.status}`);
    assert(emptySearch.body.error?.code === 'QUERY_TOO_SHORT', 'Correct error code returned for short query');

    const longQuery = 'A'.repeat(105);
    const tooLongSearch = await request('GET', `/api/search?q=${longQuery}`);
    assert(tooLongSearch.status === 400, 'Excessively long query is rejected (QUERY_TOO_LONG)', `Status: ${tooLongSearch.status}`);

    const validQueryRes = await request('GET', '/api/search?q=Deori');
    assert(validQueryRes.status === 200, 'Valid universal search request succeeds', `Status: ${validQueryRes.status}`);
    assert(Array.isArray(validQueryRes.body.results), 'Search returns results array');
    assert(validQueryRes.body.pagination !== undefined, 'Search returns pagination metadata');
    assert(validQueryRes.body.moduleBreakdown !== undefined, 'Search returns module breakdown statistics');

    // ------------------------------------------------------------------
    // SECTION 2: MULTI-MODULE PUBLIC SEARCH DISCOVERY
    // ------------------------------------------------------------------
    console.log('\n--- 2. MULTI-MODULE SEARCH DISCOVERY ---');

    // 2.1 Publish Job Listing
    const kwJob = `SolarTech_${ts}`;
    const newJob = await request('POST', '/api/listings', {
      businessProfileId: bizId,
      module: 'jobs',
      category: 'Technician',
      title: `${kwJob} Solar Panel Installer Needed`,
      description: 'Urgent solar rooftop technician for agricultural pumps in Deori circle.',
      price: 18000,
      pricePeriod: 'month',
      talukaAreaId: 'deori-hq',
      jobType: 'full_time',
      qualifications: 'ITI Electrical',
      vacanciesCount: 2,
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    assert(newJob.status === 201, 'Job listing created', `Status: ${newJob.status}`);
    const jobListingId = newJob.body.listingId;

    // Approve job listing via admin
    await request('POST', '/api/admin/moderation/decision', {
      module: 'jobs',
      id: jobListingId,
      decision: 'approve_publish',
      reason: 'Job meets transparent salary criteria',
    }, {
      Cookie: `lhx_session=${adminCookie}`,
      'x-csrf-token': adminCsrf,
    });

    // 2.2 Publish Rental Listing (with contact hidden for privacy test)
    const kwRental = `Godown_${ts}`;
    const newRental = await request('POST', '/api/listings', {
      businessProfileId: bizId,
      module: 'rentals',
      category: 'Commercial',
      title: `${kwRental} Grain Storage Warehouse NH53`,
      description: 'Paddy and wheat godown facility near Soundad bypass.',
      price: 25000,
      pricePeriod: 'month',
      talukaAreaId: 'soundad',
      isContactHidden: true, // Contact masking test!
      contactPhone: '9899001122',
      propertyType: 'shop',
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    assert(newRental.status === 201, 'Rental listing created', `Status: ${newRental.status}`);
    const rentalListingId = newRental.body.listingId;

    // Approve rental listing
    await request('POST', '/api/admin/moderation/decision', {
      module: 'rentals',
      id: rentalListingId,
      decision: 'approve_publish',
      reason: 'Approved godown rental',
    }, {
      Cookie: `lhx_session=${adminCookie}`,
      'x-csrf-token': adminCsrf,
    });

    // 2.3 Publish Community Event
    const kwEvent = `KisanMela_${ts}`;
    const newEvent = await request('POST', '/api/events', {
      title: `${kwEvent} Deori Taluka Organic Agri Fair`,
      description: 'Grand agricultural exhibition of organic paddy and drip irrigation kits.',
      category: 'agri_fair',
      venue: 'APMC Market Yard Deori',
      organizerName: 'Deori Farmer Welfare Collective',
      startDate: '2026-11-15',
      endDate: '2026-11-17',
      startTime: '09:00:00',
      endTime: '18:00:00',
      areaId: 'deori-hq',
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    const eventId = newEvent.body.event?.id;
    // Approve event
    await executeQuery(`UPDATE events SET status = 'published' WHERE id = ?`, [eventId]);

    // 2.4 Publish News Article
    const kwNews = `Bawanthadi_${ts}`;
    const newNews = await request('POST', '/api/news', {
      headline: `${kwNews} Canal Water Released for Rabi Sowing`,
      summary: 'Irrigation department confirms full canal discharge across Shiwnikalan and Borgaon.',
      content: 'Detailed report on water distribution schedule for taluka paddy growers.',
      category: 'agriculture',
      relevantDate: '2026-10-22',
      areaId: 'shiwnikalan',
      sourceName: 'Gondia Daily Reporter',
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    const newsId = newNews.body.news?.id;
    // Approve news
    await executeQuery(`UPDATE news_articles SET status = 'published', published_at = NOW() WHERE id = ?`, [newsId]);

    // 2.5 Publish Government Notice
    const kwNotice = `PanchayatGrant_${ts}`;
    const newNotice = await request('POST', '/api/notices', {
      noticeTitle: `${kwNotice} Solar Streetlight Tenders Announced`,
      issuingAuthority: 'Panchayat Samiti Deori',
      officialSourceUrl: `https://deori.gov.in/tenders/solar-${ts}`,
      summary: 'Public applications invited for gram panchayat solar lighting installations.',
      areaId: 'deori-hq',
      issueDate: '2026-10-22',
      deadlineDate: '2026-11-30',
    }, {
      Cookie: `lhx_session=${adminCookie}`,
      'x-csrf-token': adminCsrf,
    });
    const noticeId = newNotice.body.notice?.id;
    // Approve notice
    await executeQuery(`UPDATE govt_notices SET status = 'published' WHERE id = ?`, [noticeId]);

    // 2.6 Publish Verified Emergency Helpline
    const kwHelpline = `ChichgarhRescue_${ts}`;
    const newHelpline = await request('POST', '/api/emergency/contacts', {
      name: `${kwHelpline} Forest Fire & Wildlife Rescue`,
      department: 'Maharashtra Forest Department Chichgarh Range',
      category: 'wildlife_rescue',
      primaryPhone: '07184299881',
      areaId: 'chichgarh',
      authoritativeSource: 'Maharashtra Forest Department Gazetted Order 2026',
    }, {
      Cookie: `lhx_session=${adminCookie}`,
      'x-csrf-token': adminCsrf,
    });
    assert(newHelpline.status === 201, 'Verified emergency contact created', `Status: ${newHelpline.status}`);

    // ------------------------------------------------------------------
    // SECTION 3: UNIVERSAL SEARCH MATCHING & RETRIEVAL
    // ------------------------------------------------------------------
    console.log('\n--- 3. MULTI-MODULE RETRIEVAL & FILTERING ---');

    // Search Job
    const searchJobRes = await request('GET', `/api/search?q=${kwJob}`);
    assert(searchJobRes.status === 200, 'Universal search finds published job');
    assert(searchJobRes.body.results.some(r => r.module === 'jobs' && r.title.includes(kwJob)), 'Job result correctly labeled with module: jobs');

    // Search Rental & Test Contact Masking
    const searchRentalRes = await request('GET', `/api/search?q=${kwRental}`);
    assert(searchRentalRes.status === 200, 'Universal search finds published rental');
    const rentalItem = searchRentalRes.body.results.find(r => r.title.includes(kwRental));
    assert(rentalItem !== undefined, 'Rental item present in search results');
    assert(rentalItem.contactPhone === null, 'Contact phone is strictly masked when isContactHidden is true');
    assert(rentalItem.contactWhatsapp === null, 'Contact WhatsApp is strictly masked when isContactHidden is true');

    // Search Event
    const searchEventRes = await request('GET', `/api/search?q=${kwEvent}`);
    assert(searchEventRes.body.results.some(r => r.module === 'events' && r.title.includes(kwEvent)), 'Event found in universal search with module: events');

    // Search News
    const searchNewsRes = await request('GET', `/api/search?q=${kwNews}`);
    assert(searchNewsRes.body.results.some(r => r.module === 'news' && r.title.includes(kwNews)), 'News found in universal search with module: news');

    // Search Notice
    const searchNoticeRes = await request('GET', `/api/search?q=${kwNotice}`);
    assert(searchNoticeRes.body.results.some(r => r.module === 'notices' && r.title.includes(kwNotice)), 'Govt notice found in universal search with module: notices');

    // Search Emergency
    const searchEmergRes = await request('GET', `/api/search?q=${kwHelpline}`);
    assert(searchEmergRes.body.results.some(r => r.module === 'emergency' && r.title.includes(kwHelpline)), 'Emergency helpline found in universal search');

    // Module Filter Validation
    const filterJobsOnly = await request('GET', `/api/search?q=Deori&module=jobs`);
    assert(filterJobsOnly.status === 200, 'Search with module filter succeeds');
    assert(filterJobsOnly.body.results.every(r => r.module === 'jobs'), 'module=jobs filter strictly returns only job listings');

    // ------------------------------------------------------------------
    // SECTION 4: LOCATION SCOPE & NEARBY EXPANSION
    // ------------------------------------------------------------------
    console.log('\n--- 4. LOCATION SCOPE & STRUCTURED NEARBY EXPANSION ---');

    // Area filter: exact circle
    const searchChichgarh = await request('GET', `/api/search?q=${kwHelpline}&areaId=chichgarh`);
    assert(searchChichgarh.body.results.length > 0, 'Search finds item in specified chichgarh circle');

    const searchWrongCircle = await request('GET', `/api/search?q=${kwHelpline}&areaId=soundad&expandNearby=false`);
    assert(searchWrongCircle.body.results.length === 0, 'Search strictly isolates circles when expandNearby is false');

    // Nearby Expansion: deori-hq is adjacent to chichgarh
    const searchNearby = await request('GET', `/api/search?q=${kwHelpline}&areaId=deori-hq&expandNearby=true`);
    assert(searchNearby.body.results.some(r => r.title.includes(kwHelpline)), 'Nearby expansion finds item in adjacent circle');

    // ------------------------------------------------------------------
    // SECTION 5: MODERATION & PUBLIC VISIBILITY BARRIER
    // ------------------------------------------------------------------
    console.log('\n--- 5. MODERATION & RESTRICTIONS BARRIER ---');

    // Create unverified business profile for Citizen A
    const createUnverifiedBiz = await request('POST', '/api/business', {
      name: `Unverified Trade Hub ${ts}`,
      businessType: 'services_retail',
      category: 'General',
      phone: '9822100299',
      talukaAreaId: 'deori-hq',
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    const unverifiedBizId = createUnverifiedBiz.body.business.id;

    // Create unapproved listing
    const unapprovedKw = `HiddenPending_${ts}`;
    const unapprovedListing = await request('POST', '/api/listings', {
      businessProfileId: unverifiedBizId,
      module: 'jobs',
      category: 'Unverified',
      title: `${unapprovedKw} Secret Unapproved Job`,
      description: 'This listing is still in pending_review status.',
      price: 15000,
      pricePeriod: 'month',
      talukaAreaId: 'deori-hq',
      jobType: 'part_time',
      qualifications: 'None',
      vacanciesCount: 1,
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    assert(unapprovedListing.body.status === 'pending_review', 'Listing initially placed in pending_review status');

    const searchPending = await request('GET', `/api/search?q=${unapprovedKw}`);
    assert(searchPending.body.results.length === 0, 'Pending review listing NEVER leaks into universal search results');

    // ------------------------------------------------------------------
    // SECTION 6: SEARCH SUGGESTIONS & SEARCH HISTORY
    // ------------------------------------------------------------------
    console.log('\n--- 6. SEARCH SUGGESTIONS & HISTORY ---');

    const suggestRes = await request('GET', `/api/search/suggestions?q=${kwJob.slice(0, 8)}`);
    assert(suggestRes.status === 200, 'Search suggestions endpoint succeeds');
    assert(suggestRes.body.suggestions.some(s => s.text.includes(kwJob)), 'Suggestions return matching real published records');

    // Check search history for Citizen A (who searched previously while authenticated)
    const historyRes = await request('GET', '/api/search/history', null, {
      Cookie: `lhx_session=${cookieA}`,
    });
    assert(historyRes.status === 200, 'Authenticated user can retrieve search history');
    assert(Array.isArray(historyRes.body.history), 'Search history is array');

    // Privacy / IDOR test: User B cannot see User A's history
    const historyB = await request('GET', '/api/search/history', null, {
      Cookie: `lhx_session=${cookieB}`,
    });
    assert(historyB.body.history.length === 0, 'User B has separate, clean history (Strict Privacy Isolation)');

    // Clear search history
    const clearHist = await request('DELETE', '/api/search/history', null, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    assert(clearHist.status === 200, 'Search history cleared successfully');

    // ------------------------------------------------------------------
    // SECTION 7: SAVED ITEMS / BOOKMARKS LIFECYCLE
    // ------------------------------------------------------------------
    console.log('\n--- 7. SAVED ITEMS / BOOKMARKS LIFECYCLE ---');

    // 7.1 Unauthenticated save attempt blocked
    const unauthSave = await request('POST', '/api/saved-items', {
      itemType: 'listing',
      itemId: jobListingId,
      module: 'jobs',
    });
    assert(unauthSave.status === 401, 'Unauthenticated save attempt blocked (UNAUTHORIZED)', `Status: ${unauthSave.status}`);

    // 7.2 Save valid item
    const saveJob = await request('POST', '/api/saved-items', {
      itemType: 'listing',
      itemId: jobListingId,
      module: 'jobs',
      notes: 'Interesting solar technician opening in Deori',
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    assert(saveJob.status === 201, 'Citizen A saves job listing', `Status: ${saveJob.status}`);
    const savedJobId = saveJob.body.savedId;
    assert(typeof savedJobId === 'string', 'Returned saved ID is valid UUID string');

    // 7.3 Duplicate save prevention
    const dupSave = await request('POST', '/api/saved-items', {
      itemType: 'listing',
      itemId: jobListingId,
      module: 'jobs',
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    assert(dupSave.status === 409, 'Duplicate save prevented with HTTP 409 (ALREADY_SAVED)', `Status: ${dupSave.status}`);

    // 7.4 Check item saved status
    const checkSaved = await request('GET', `/api/saved-items/check/listing/${jobListingId}`, null, {
      Cookie: `lhx_session=${cookieA}`,
    });
    assert(checkSaved.body.isSaved === true, 'Check saved confirms item is saved for Citizen A');

    // 7.5 List saved items & verify live availability
    const listSavedA = await request('GET', '/api/saved-items', null, {
      Cookie: `lhx_session=${cookieA}`,
    });
    assert(listSavedA.status === 200, 'Citizen A retrieves saved items list');
    const savedEntry = listSavedA.body.items.find(it => it.itemId === jobListingId);
    assert(savedEntry !== undefined, 'Saved job listing present in list');
    assert(savedEntry.liveStatus === 'available', 'Live status indicates available');
    assert(savedEntry.title.includes(kwJob), 'Resolved listing title matches database');

    // 7.6 IDOR / Privacy Isolation: User B cannot see User A's saved items
    const listSavedB = await request('GET', '/api/saved-items', null, {
      Cookie: `lhx_session=${cookieB}`,
    });
    assert(listSavedB.body.items.length === 0, 'User B sees 0 saved items (Strict IDOR Isolation)');

    // 7.7 Unavailable / Removed state handling: Remove underlying listing
    await executeQuery(`UPDATE listings SET status = 'removed' WHERE id = ?`, [jobListingId]);
    const listSavedRemoved = await request('GET', '/api/saved-items', null, {
      Cookie: `lhx_session=${cookieA}`,
    });
    const removedEntry = listSavedRemoved.body.items.find(it => it.itemId === jobListingId);
    assert(removedEntry.liveStatus === 'removed', 'Saved item accurately reflects removed status');
    assert(removedEntry.isAvailable === false, 'isAvailable flag is false when underlying listing is delisted');

    // 7.8 Unsave Item
    const unsaveRes = await request('DELETE', `/api/saved-items/${savedJobId}`, null, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    assert(unsaveRes.status === 200, 'Citizen A removes item from saved desk');

    const checkAfterUnsave = await request('GET', `/api/saved-items/check/listing/${jobListingId}`, null, {
      Cookie: `lhx_session=${cookieA}`,
    });
    assert(checkAfterUnsave.body.isSaved === false, 'Item confirmed unsaved');

    // ------------------------------------------------------------------
    // SECTION 8: USER PREFERENCES (MODULE PINNING)
    // ------------------------------------------------------------------
    console.log('\n--- 8. USER PREFERENCES (PINNED MODULES) ---');

    const updatePrefs = await request('PUT', '/api/account/preferences', {
      pinnedModules: ['krishi-bazaar', 'emergency-contacts', 'jobs-hub'],
      preferredAreaId: 'soundad',
    }, {
      Cookie: `lhx_session=${cookieA}`,
      'x-csrf-token': csrfA,
    });
    assert(updatePrefs.status === 200, 'User preferences updated with pinned modules');

    const getPrefs = await request('GET', '/api/account/preferences', null, {
      Cookie: `lhx_session=${cookieA}`,
    });
    assert(getPrefs.status === 200, 'User preferences retrieved');
    assert(getPrefs.body.preferences.pinnedModules.includes('krishi-bazaar'), 'Pinned modules stored and retrieved');
    assert(getPrefs.body.preferences.preferredAreaId === 'soundad', 'Preferred area stored and retrieved');

    // ------------------------------------------------------------------
    // SECTION 9: LOCAL DISCOVERY FEED
    // ------------------------------------------------------------------
    console.log('\n--- 9. LOCAL DISCOVERY FEED ---');

    const feedRes = await request('GET', '/api/discovery/feed');
    assert(feedRes.status === 200, 'Local discovery feed retrieved successfully');
    assert(Array.isArray(feedRes.body.items), 'Discovery feed returns items array');
    assert(feedRes.body.items.some(it => it.isOfficialSource === true), 'Feed contains verified official government notices');
    assert(feedRes.body.items.some(it => it.feedType === 'news'), 'Feed contains grassroots journalism');

    console.log('========================================================');
    console.log(` Summary: ${passed} passed, ${failed} failed out of ${passed + failed} assertions.`);
    console.log('========================================================');

    if (failed === 0) {
      console.log('ALL PHASE 7 UNIVERSAL SEARCH & DISCOVERY CRITERIA PASSED.');
    } else {
      console.error(`FAILED with ${failed} failures.`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('[UNCAUGHT TEST RUNNER ERROR]', err);
    process.exitCode = 1;
  } finally {
    if (dedicatedServer) dedicatedServer.close();
    process.exit(process.exitCode || 0);
  }
}

runTestSuite();
