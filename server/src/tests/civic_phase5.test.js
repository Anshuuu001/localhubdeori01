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
  console.log(' LocalHub X - Phase 5 Civic, News, Events & Emergency Tests');
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
    // User A: Citizen Submitter
    const citizenEmail = `citizen_${ts}@deorihub.local`;
    const regCitizen = await request('POST', '/api/auth/register', {
      fullName: 'Sunil Meshram (Citizen)',
      email: citizenEmail,
      password: 'SecurePassword@2026',
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    });
    assert(regCitizen.status === 201, 'Citizen user registered', `Status: ${regCitizen.status}`);
    const citizenCookie = extractCookie(regCitizen, 'lhx_session');
    const citizenCsrf = regCitizen.body?.csrfToken;
    const citizenHeaders = {
      Cookie: `lhx_session=${citizenCookie}`,
      'x-csrf-token': citizenCsrf,
    };

    // User B: Editor / Admin Reviewer
    const editorEmail = `editor_${ts}@deorihub.local`;
    const regEditor = await request('POST', '/api/auth/register', {
      fullName: 'Pooja Tiwari (Civic Editor)',
      email: editorEmail,
      password: 'SecurePassword@2026',
      phone: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
    });
    assert(regEditor.status === 201, 'Editor user registered', `Status: ${regEditor.status}`);
    const editorId = regEditor.body?.user?.id;
    const editorCookie = extractCookie(regEditor, 'lhx_session');
    const editorCsrf = regEditor.body?.csrfToken;
    const editorHeaders = {
      Cookie: `lhx_session=${editorCookie}`,
      'x-csrf-token': editorCsrf,
    };

    // Promote User B to 'editor' role in database
    await executeQuery("UPDATE users SET role = 'editor' WHERE id = ?", [editorId]);
    console.log('[SETUP] Promoted User B to system editor role');

    // User C: Unauthorized Third Party (Attacker / Intruder)
    const intruderEmail = `intruder_${ts}@deorihub.local`;
    const regIntruder = await request('POST', '/api/auth/register', {
      fullName: 'Ravi Intruder (Citizen C)',
      email: intruderEmail,
      password: 'SecurePassword@2026',
      phone: `96${Math.floor(10000000 + Math.random() * 90000000)}`,
    });
    const intruderCookie = extractCookie(regIntruder, 'lhx_session');
    const intruderCsrf = regIntruder.body?.csrfToken;
    const intruderHeaders = {
      Cookie: `lhx_session=${intruderCookie}`,
      'x-csrf-token': intruderCsrf,
    };

    // ====================================================
    // 1. EVENTS DESK MODULE
    // ====================================================
    console.log('\n--- 1. EVENTS DESK LIFECYCLE & RESPONSES ---');

    // 1.1 Validation error: start date in past
    const pastEventRes = await request('POST', '/api/events', {
      title: 'Historical Mando Devi Fair',
      category: 'yatra_festival',
      description: 'Annual fair at Mando Devi temple precinct.',
      startDate: '2020-01-01',
      endDate: '2020-01-05',
      venue: 'Mando Devi Temple Ground',
    }, citizenHeaders);
    assert(pastEventRes.status === 400 && pastEventRes.body?.error?.code === 'PAST_DATE_PROHIBITED',
      'Event with past start date blocked (PAST_DATE_PROHIBITED)', `Status: ${pastEventRes.status}`);

    // 1.2 Validation error: end date before start date
    const invalidRangeRes = await request('POST', '/api/events', {
      title: 'Deori Cricket Championship',
      category: 'sports_tournament',
      description: 'Inter-village cricket tournament with teams from Deori and Chichgarh.',
      startDate: '2026-11-20',
      endDate: '2026-11-10',
      venue: 'Nagar Panchayat Stadium, Deori',
    }, citizenHeaders);
    assert(invalidRangeRes.status === 400 && invalidRangeRes.body?.error?.code === 'INVALID_DATE_RANGE',
      'Event with end date before start date blocked (INVALID_DATE_RANGE)', `Status: ${invalidRangeRes.status}`);

    // 1.3 Successful submission enters pending_review
    const submitEventRes = await request('POST', '/api/events', {
      title: 'Deori Taluka Krishi & Haat Fair 2026',
      category: 'agri_fair',
      description: 'Annual farmer gathering, organic seed exhibition, and agricultural machinery demonstration in Deori Town.',
      startDate: '2026-11-15',
      startTime: '10:00 AM',
      endDate: '2026-11-18',
      endTime: '08:00 PM',
      venue: 'Subhash Ground, Near Bus Stand',
      areaId: 'deori-hq',
      organizerName: 'Deori Agro Producers Collective',
      organizerContactPhone: '9876543210',
      permitContactOptions: 'phone',
      sourceUrl: 'https://deori.example.org/agri-fair-2026',
    }, citizenHeaders);
    assert(submitEventRes.status === 201, 'Citizen submits event for review', `Status: ${submitEventRes.status}`);
    const eventId = submitEventRes.body?.event?.id;
    assert(submitEventRes.body?.event?.status === 'pending_review', 'Event initial status is pending_review');

    // 1.4 Unapproved event hidden from public search
    const publicEventsRes = await request('GET', '/api/events?timeline=upcoming');
    const isEventInPublic = publicEventsRes.body?.events?.some(e => e.id === eventId);
    assert(!isEventInPublic, 'Unapproved event hidden from public event listings');

    // 1.5 IDOR: Unauthorized User C blocked from viewing pending event
    const intruderGetEventRes = await request('GET', `/api/events/${eventId}`, null, intruderHeaders);
    assert(intruderGetEventRes.status === 403, 'Unauthorized User C blocked from viewing pending event (FORBIDDEN)', `Status: ${intruderGetEventRes.status}`);

    // 1.6 Citizen Submitter CAN view their own pending event
    const citizenGetEventRes = await request('GET', `/api/events/${eventId}`, null, citizenHeaders);
    assert(citizenGetEventRes.status === 200, 'Submitter can view their own pending event');
    assert(citizenGetEventRes.body?.event?.isCreator === true, 'Submitter recognized as isCreator');

    // 1.7 Non-editor User C blocked from accessing moderation queue
    const intruderPendingEventsRes = await request('GET', '/api/events/moderation/pending', null, intruderHeaders);
    assert(intruderPendingEventsRes.status === 403, 'Non-staff blocked from events moderation queue (FORBIDDEN)', `Status: ${intruderPendingEventsRes.status}`);

    // 1.8 Editor User B views pending queue and approves event
    const editorPendingEventsRes = await request('GET', '/api/events/moderation/pending', null, editorHeaders);
    assert(editorPendingEventsRes.status === 200, 'Editor views events moderation queue');
    assert(editorPendingEventsRes.body?.pendingEvents?.some(e => e.id === eventId), 'Pending event present in editor moderation queue');

    const approveEventRes = await request('POST', `/api/events/moderation/review/${eventId}`, {
      decision: 'published',
      notes: 'Verified venue availability and organizer details with Deori Nagar Panchayat.',
    }, editorHeaders);
    assert(approveEventRes.status === 200, 'Editor approves event (published)', `Status: ${approveEventRes.status}`);

    // 1.9 Approved event now visible to the public
    const publicEventsAfterRes = await request('GET', '/api/events?timeline=upcoming');
    const isNowPublic = publicEventsAfterRes.body?.events?.some(e => e.id === eventId);
    assert(isNowPublic, 'Approved event now visible in public event directory');

    // 1.10 User response: Interested
    const interestedRes = await request('POST', `/api/events/${eventId}/respond`, {
      responseType: 'interested',
    }, intruderHeaders);
    assert(interestedRes.status === 200, 'Citizen records Interested response');

    const eventDetailAfterInt = await request('GET', `/api/events/${eventId}`);
    assert(eventDetailAfterInt.body?.event?.interestedCount === 1, 'Interested count is 1');

    // 1.11 Duplicate prevention: changing to Going replaces Interested without duplicating
    const goingRes = await request('POST', `/api/events/${eventId}/respond`, {
      responseType: 'going',
    }, intruderHeaders);
    assert(goingRes.status === 200, 'Citizen updates response to Going');

    const eventDetailAfterGoing = await request('GET', `/api/events/${eventId}`);
    assert(eventDetailAfterGoing.body?.event?.goingCount === 1, 'Going count is 1');
    assert(eventDetailAfterGoing.body?.event?.interestedCount === 0, 'Interested count decremented to 0 (no duplicate records)');

    // 1.12 Organizer cancels event
    const cancelEventRes = await request('PATCH', `/api/events/${eventId}/cancel`, {
      reason: 'Postponed due to unseasonal rain advisory by Gondia District Administration.',
    }, citizenHeaders);
    assert(cancelEventRes.status === 200 && cancelEventRes.body?.status === 'cancelled', 'Organizer cancels event with reason');

    // ====================================================
    // 2. TALUKA NEWS FEED MODULE
    // ====================================================
    console.log('\n--- 2. TALUKA NEWS FEED & CORRECTION WORKFLOW ---');

    // 2.1 Citizen submits news report
    const newsHeadline = `NH-53 Deori-Chichgarh Junction Road Surface Restoration Begins (${Date.now()})`;
    const submitNewsRes = await request('POST', '/api/news', {
      headline: newsHeadline,
      summary: 'Public Works Department initiates bituminous overlay on NH-53 junction in Deori Town.',
      content: 'Contractors under PWD Maharashtra have deployed machinery to repair highway potholes following the monsoon season. Commuters are advised to expect minor traffic diversions between 10 AM and 5 PM.',
      category: 'infrastructure',
      relevantDate: '2026-10-21',
      areaId: 'deori-hq',
      sourceName: 'PWD Sub-Division Deori Notice Board',
      sourceUrl: 'https://pwd.maharashtra.gov.in/deori',
    }, citizenHeaders);
    assert(submitNewsRes.status === 201, 'Citizen submits news article for review', `Status: ${submitNewsRes.status}`);
    const newsId = submitNewsRes.body?.news?.id;
    assert(submitNewsRes.body?.news?.status === 'pending_review', 'News article status is pending_review');

    // 2.2 Duplicate submission check
    const duplicateNewsRes = await request('POST', '/api/news', {
      headline: newsHeadline,
      summary: 'Another identical story submission.',
      content: 'Duplicate body text for testing duplicate detection.',
      category: 'infrastructure',
      relevantDate: '2026-10-21',
      sourceName: 'Duplicate Source',
    }, citizenHeaders);
    assert(duplicateNewsRes.status === 409 && duplicateNewsRes.body?.error?.code === 'SIMILAR_SUBMISSION_EXISTS',
      'Duplicate headline and date blocked (SIMILAR_SUBMISSION_EXISTS)', `Status: ${duplicateNewsRes.status}`);

    // 2.3 Unapproved news hidden from public feed
    const publicNewsRes = await request('GET', '/api/news');
    assert(!publicNewsRes.body?.news?.some(n => n.id === newsId), 'Unapproved news hidden from public news feed');

    // 2.4 Editor approves and publishes news
    const approveNewsRes = await request('POST', `/api/news/moderation/review/${newsId}`, {
      decision: 'published',
      notes: 'Fact-checked against PWD executive engineer public notice.',
    }, editorHeaders);
    assert(approveNewsRes.status === 200, 'Editor publishes news report', `Status: ${approveNewsRes.status}`);

    // 2.5 Published news visible to public
    const publicNewsAfterRes = await request('GET', '/api/news');
    assert(publicNewsAfterRes.body?.news?.some(n => n.id === newsId), 'Published news article live on public feed');

    // 2.6 News correction request submitted by citizen
    const correctionRes = await request('POST', `/api/news/${newsId}/corrections`, {
      reason: 'Incorrect diversion timing',
      suggestedCorrection: 'Diversions operate between 11 AM and 4 PM, not 10 AM to 5 PM according to updated site notice.',
      evidenceUrl: 'https://pwd.example.org/timing-update',
    }, intruderHeaders);
    assert(correctionRes.status === 201, 'Citizen submits news correction request', `Status: ${correctionRes.status}`);
    const correctionId = correctionRes.body?.correctionId;

    // 2.7 Editor views corrections queue and resolves
    const correctionsQueueRes = await request('GET', '/api/news/corrections/queue', null, editorHeaders);
    assert(correctionsQueueRes.status === 200 && correctionsQueueRes.body?.corrections?.some(c => c.id === correctionId),
      'Editor retrieves corrections queue');

    const reviewCorrRes = await request('POST', `/api/news/corrections/${correctionId}/review`, {
      decision: 'applied',
      notes: 'Timings verified and acknowledged.',
    }, editorHeaders);
    assert(reviewCorrRes.status === 200 && reviewCorrRes.body?.status === 'applied', 'Editor applies correction');

    // ====================================================
    // 3. GOVERNMENT NOTICES MODULE
    // ====================================================
    console.log('\n--- 3. GOVERNMENT NOTICES & AUTHORITATIVE VERIFICATION ---');

    // 3.1 Submit government notice
    const submitNoticeRes = await request('POST', '/api/notices', {
      issuingAuthority: 'Tahsil Office Deori',
      noticeTitle: 'Special Kharif Crop Damage Survey Enumeration 2026',
      summary: 'Talathi desks will conduct field inspection for hail-damaged paddy plots across Chichgarh and Borgaon circles.',
      issueDate: '2026-10-20',
      deadlineDate: '2026-11-05',
      areaId: 'deori-hq',
      officialSourceUrl: 'https://gondia.gov.in/deori-tahsil-notice',
    }, citizenHeaders);
    assert(submitNoticeRes.status === 201, 'Citizen submits government notice for verification', `Status: ${submitNoticeRes.status}`);
    const noticeId = submitNoticeRes.body?.notice?.id;

    // 3.2 Unverified notice hidden from public
    const publicNoticesRes = await request('GET', '/api/notices');
    assert(!publicNoticesRes.body?.notices?.some(n => n.id === noticeId), 'Unverified government notice hidden from public');

    // 3.3 Verification without authoritative source reference blocked
    const verifyWithoutSourceRes = await request('POST', `/api/notices/moderation/verify/${noticeId}`, {
      decision: 'published',
      verificationSourceNotes: '',
    }, editorHeaders);
    assert(verifyWithoutSourceRes.status === 400 && verifyWithoutSourceRes.body?.error?.code === 'VERIFICATION_SOURCE_REQUIRED',
      'Publishing notice without authoritative source proof blocked (VERIFICATION_SOURCE_REQUIRED)', `Status: ${verifyWithoutSourceRes.status}`);

    // 3.4 Authorized verification with authoritative circular proof
    const verifyWithSourceRes = await request('POST', `/api/notices/moderation/verify/${noticeId}`, {
      decision: 'published',
      verificationSourceNotes: 'Verified with Tahsildar Deori Office Order No. 412/Revenue/2026.',
    }, editorHeaders);
    assert(verifyWithSourceRes.status === 200 && verifyWithSourceRes.body?.isOfficialVerified === true,
      'Editor verifies and publishes official government notice');

    // 3.5 Public retrieves notice with verified state and deadline
    const publicNoticeDetail = await request('GET', `/api/notices/${noticeId}`);
    assert(publicNoticeDetail.status === 200, 'Public retrieves verified government notice');
    assert(publicNoticeDetail.body?.notice?.isOfficialVerified === true, 'Notice displays isOfficialVerified = true');
    assert(publicNoticeDetail.body?.notice?.isDeadlinePassed === false, 'Notice active with deadline not passed');

    // ====================================================
    // 4. EMERGENCY CONTACTS DIRECTORY & SAFEGUARDS
    // ====================================================
    console.log('\n--- 4. EMERGENCY CONTACTS & CORRECTION REPORTS ---');

    // 4.1 Check emergency status endpoint
    const emergStatusRes = await request('GET', '/api/emergency/status');
    assert(emergStatusRes.status === 200, 'GET /api/emergency/status responds with 200');
    assert(emergStatusRes.body?.verifiedDataConfigured === true, 'Emergency status confirms verified data configured');
    assert(emergStatusRes.body?.nationalEmergencyLines?.length >= 2, 'National emergency lines (112, 108) configured');

    // 4.2 Public listing of verified emergency contacts
    const emergContactsRes = await request('GET', '/api/emergency/contacts');
    assert(emergContactsRes.status === 200, 'Public retrieves emergency contacts');
    assert(emergContactsRes.body?.contacts?.some(c => c.primaryPhone === '112'), 'National 112 emergency line present in directory');
    assert(emergContactsRes.body?.contacts?.some(c => c.primaryPhone === '108'), 'Maharashtra 108 medical lifeline present in directory');

    // 4.3 Unauthorized user blocked from adding emergency contacts
    const unauthorizedAddContactRes = await request('POST', '/api/emergency/contacts', {
      name: 'Fake Fire Brigade',
      department: 'Unauthorized Fire',
      category: 'fire',
      primaryPhone: '9999999999',
      authoritativeSource: 'Fake Source',
    }, intruderHeaders);
    assert(unauthorizedAddContactRes.status === 403, 'Unauthorized user blocked from adding emergency contacts (FORBIDDEN)', `Status: ${unauthorizedAddContactRes.status}`);

    // 4.4 Editor adds verified local emergency duty desk
    const addContactRes = await request('POST', '/api/emergency/contacts', {
      name: 'Rural Hospital Deori (ग्रामीण रुग्णालय देवरी) Duty Desk',
      department: 'Public Health Department, Government of Maharashtra',
      category: 'medical',
      primaryPhone: '07199-225244',
      areaId: 'deori-hq',
      address: 'Near Old Bus Stand, National Highway 53, Deori',
      openingHours: '24x7 Emergency Casualty Desk',
      authoritativeSource: 'Gondia District Civil Surgeon Directory 2026 & Deori RH Superintendent sign-off',
      isVerified: true,
      sortOrder: 3,
    }, editorHeaders);
    assert(addContactRes.status === 201, 'Editor adds verified local emergency contact with official proof', `Status: ${addContactRes.status}`);
    const localContactId = addContactRes.body?.contact?.id;

    // 4.5 Citizen reports incorrect or unreachable contact
    const reportContactRes = await request('POST', `/api/emergency/contacts/${localContactId}/report`, {
      reason: 'number_unreachable',
      suggestedNumber: '07199-225245',
      evidenceNotes: 'Tested call at 2:00 PM; landline returned no dial tone. Please check alternative line.',
      reporterName: 'Sunil Meshram',
    }, citizenHeaders);
    assert(reportContactRes.status === 201, 'Citizen submits emergency contact correction report', `Status: ${reportContactRes.status}`);
    const reportId = reportContactRes.body?.reportId;

    // 4.6 Contact remains active (report does not automatically delete verified line)
    const getContactAfterReport = await request('GET', `/api/emergency/contacts/${localContactId}`);
    assert(getContactAfterReport.status === 200 && getContactAfterReport.body?.contact?.status === 'active',
      'Emergency contact remains accessible during report investigation');

    // 4.7 Editor reviews emergency contact report queue
    const reportQueueRes = await request('GET', '/api/emergency/reports/queue', null, editorHeaders);
    assert(reportQueueRes.status === 200 && reportQueueRes.body?.reports?.some(r => r.id === reportId),
      'Editor retrieves emergency contact reports queue');

    const resolveReportRes = await request('POST', `/api/emergency/reports/${reportId}/review`, {
      decision: 'verified_updated',
      notes: 'Line inspected with BSNL Deori exchange; landline restored and confirmed functional.',
    }, editorHeaders);
    assert(resolveReportRes.status === 200 && resolveReportRes.body?.status === 'verified_updated',
      'Editor resolves emergency report');

    // ====================================================
    // 5. AUDIT TRAIL LOGGING
    // ====================================================
    console.log('\n--- 5. AUDIT TRAIL VERIFICATION ---');
    const [auditRows] = await executeQuery(
      `SELECT action, entity_type FROM audit_logs 
       WHERE entity_type IN ('event', 'news_article', 'govt_notice', 'emergency_contact', 'emergency_contact_report')
       ORDER BY id DESC LIMIT 20`
    );
    assert(auditRows.length >= 6, 'Audit trail recorded Phase 5 civic events', `Count: ${auditRows.length}`);
    const actions = auditRows.map(r => r.action);
    assert(actions.includes('event.submitted') && actions.includes('event.published'), 'Audit trail contains event submission and approval');
    assert(actions.includes('news.submitted') && actions.includes('news.published'), 'Audit trail contains news submission and approval');
    assert(actions.includes('emergency_contact.created'), 'Audit trail contains emergency contact creation');

    console.log('\n========================================================');
    console.log(` Summary: ${passed} passed, ${failed} failed out of ${passed + failed} assertions.`);
    console.log('========================================================');

    if (failed === 0) {
      console.log('ALL PHASE 5 CIVIC, NEWS, EVENTS & EMERGENCY ACCEPTANCE CRITERIA PASSED.');
      process.exit(0);
    } else {
      console.error('PHASE 5 ACCEPTANCE TESTS FAILED.');
      process.exit(1);
    }
  } catch (err) {
    console.error('[TEST_RUNNER_ERROR]', err);
    process.exit(1);
  } finally {
    if (dedicatedServer) dedicatedServer.close();
  }
}

runTestSuite();
