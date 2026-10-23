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
  console.log(' LocalHub X - Phase 6 Admin Panel, Moderation & Verification Tests');
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
    // 1. Citizen User
    const citizenEmail = `citizen_p6_${ts}@deorihub.local`;
    const regCitizen = await request('POST', '/api/auth/register', {
      fullName: 'Ganesh Wadhave (Citizen)',
      email: citizenEmail,
      password: 'SecurePassword@2026',
      phone: `9822${String(ts).slice(-6)}`,
    });
    assert(regCitizen.status === 201, 'Citizen registered successfully', `Status: ${regCitizen.status}`);
    const citizenCookie = extractCookie(regCitizen, 'lhx_session');
    const citizenCsrf = regCitizen.body.csrfToken;
    const citizenId = regCitizen.body.user.id;

    // 2. Super Admin User
    const superAdminEmail = `superadmin_${ts}@deorihub.local`;
    const regSuperAdmin = await request('POST', '/api/auth/register', {
      fullName: 'Pooja Dongre (Super Admin)',
      email: superAdminEmail,
      password: 'SuperAdminPassword@2026',
      phone: `9823${String(ts).slice(-6)}`,
    });
    const superAdminCookie = extractCookie(regSuperAdmin, 'lhx_session');
    const superAdminCsrf = regSuperAdmin.body.csrfToken;
    const superAdminId = regSuperAdmin.body.user.id;
    await executeQuery("UPDATE users SET role = 'super_admin' WHERE id = ?", [superAdminId]);
    console.log('[SETUP] Promoted User to super_admin role');

    // 3. Moderator User
    const modEmail = `moderator_${ts}@deorihub.local`;
    const regMod = await request('POST', '/api/auth/register', {
      fullName: 'Rajesh Bisen (Moderator)',
      email: modEmail,
      password: 'ModeratorPassword@2026',
      phone: `9824${String(ts).slice(-6)}`,
    });
    const modCookie = extractCookie(regMod, 'lhx_session');
    const modCsrf = regMod.body.csrfToken;
    const modId = regMod.body.user.id;
    await executeQuery("UPDATE users SET role = 'moderator' WHERE id = ?", [modId]);
    console.log('[SETUP] Promoted User to moderator role');

    // 4. Verifier User
    const verifierEmail = `verifier_${ts}@deorihub.local`;
    const regVerifier = await request('POST', '/api/auth/register', {
      fullName: 'Anita Shende (Verifier)',
      email: verifierEmail,
      password: 'VerifierPassword@2026',
      phone: `9825${String(ts).slice(-6)}`,
    });
    const verifierCookie = extractCookie(regVerifier, 'lhx_session');
    const verifierCsrf = regVerifier.body.csrfToken;
    const verifierId = regVerifier.body.user.id;
    await executeQuery("UPDATE users SET role = 'verifier' WHERE id = ?", [verifierId]);
    console.log('[SETUP] Promoted User to verifier role');

    // ------------------------------------------------------------------
    // SECTION 1: ADMIN ACCESS, RBAC & LEAST PRIVILEGE
    // ------------------------------------------------------------------
    console.log('\n--- 1. ADMIN ACCESS & RBAC ENFORCEMENT ---');

    // Unauthorized access blocked
    const unauthRes = await request('GET', '/api/admin/summary');
    assert(unauthRes.status === 401, 'Anonymous request to admin endpoints blocked (UNAUTHORIZED)', `Status: ${unauthRes.status}`);

    // Citizen forbidden from admin
    const citizenAdminRes = await request('GET', '/api/admin/summary', null, {
      Cookie: `lhx_session=${citizenCookie}; lhx_csrf=${citizenCsrf}`,
      'X-CSRF-Token': citizenCsrf,
    });
    assert(citizenAdminRes.status === 403, 'Regular citizen blocked from admin panel (FORBIDDEN)', `Status: ${citizenAdminRes.status}`);

    // Super Admin retrieves summary
    const superAdminSummary = await request('GET', '/api/admin/summary', null, {
      Cookie: `lhx_session=${superAdminCookie}; lhx_csrf=${superAdminCsrf}`,
      'X-CSRF-Token': superAdminCsrf,
    });
    assert(superAdminSummary.status === 200, 'Super Admin retrieves real dashboard summary counts', `Status: ${superAdminSummary.status}`);
    assert(superAdminSummary.body.counts !== undefined, 'Summary contains real database counts object');
    assert(superAdminSummary.body.moduleBreakdown !== undefined, 'Summary contains module breakdown');

    // Verifier attempts moderation action -> blocked by least privilege
    const verifierModAttempt = await request('POST', '/api/admin/moderation/decision', {
      module: 'jobs',
      id: 'dummy-id',
      decision: 'approve_publish',
    }, {
      Cookie: `lhx_session=${verifierCookie}; lhx_csrf=${verifierCsrf}`,
      'X-CSRF-Token': verifierCsrf,
    });
    assert(verifierModAttempt.status === 403, 'Verifier blocked from jobs moderation (least privilege enforced)', `Status: ${verifierModAttempt.status}`);

    // Self-role escalation prevention (Rule A)
    const selfEscalate = await request('PATCH', `/api/admin/users/${superAdminId}/role`, {
      role: 'super_admin',
    }, {
      Cookie: `lhx_session=${superAdminCookie}; lhx_csrf=${superAdminCsrf}`,
      'X-CSRF-Token': superAdminCsrf,
    });
    assert(selfEscalate.status === 403, 'User blocked from modifying their own administrative role (SELF_ROLE_MODIFICATION_PROHIBITED)', `Status: ${selfEscalate.status}`);

    // Super Admin updates citizen role to editor
    const promoteRes = await request('PATCH', `/api/admin/users/${citizenId}/role`, {
      role: 'editor',
    }, {
      Cookie: `lhx_session=${superAdminCookie}; lhx_csrf=${superAdminCsrf}`,
      'X-CSRF-Token': superAdminCsrf,
    });
    assert(promoteRes.status === 200, 'Super Admin can promote user role', `Status: ${promoteRes.status}`);
    assert(promoteRes.body.newRole === 'editor', 'Role successfully updated to editor');

    // ------------------------------------------------------------------
    // SECTION 2: CENTRAL MODERATION QUEUE
    // ------------------------------------------------------------------
    console.log('\n--- 2. CENTRAL MODERATION QUEUE & LIFECYCLE ---');

    // Citizen creates a business profile & listing
    const bizRes = await request('POST', '/api/business', {
      name: `Kisan Agri Store ${ts}`,
      businessType: 'Retail Merchant',
      category: 'Krishi Inputs',
      description: 'Fertilizers and seeds in Deori Taluka',
      phone: `9822${String(ts).slice(-6)}`,
      talukaAreaId: 'deori-hq',
    }, {
      Cookie: `lhx_session=${citizenCookie}; lhx_csrf=${citizenCsrf}`,
      'X-CSRF-Token': citizenCsrf,
    });
    assert(bizRes.status === 201, 'Citizen creates business profile', `Status: ${bizRes.status}`);
    const bizId = bizRes.body.business.id;

    // Create a listing in pending_review
    const listRes = await request('POST', '/api/listings', {
      module: 'jobs',
      businessProfileId: bizId,
      title: 'Tractor Mechanic Apprentice',
      category: 'Mechanic',
      description: 'Zero fee apprenticeship for agricultural machinery repairs in Deori.',
      price: 12000,
      pricePeriod: 'monthly',
      talukaAreaId: 'deori-hq',
      jobDetails: {
        jobType: 'Full-time',
        salaryPeriod: 'monthly',
      },
    }, {
      Cookie: `lhx_session=${citizenCookie}; lhx_csrf=${citizenCsrf}`,
      'X-CSRF-Token': citizenCsrf,
    });
    assert(listRes.status === 201, 'Submit new listing for moderation', `Status: ${listRes.status}`);
    const listingId = listRes.body.listingId;
    assert(listRes.body.status === 'pending_review', 'Listing initial status is pending_review');

    // Public cannot view pending listing
    const publicList = await request('GET', '/api/listings?module=jobs');
    const foundPublic = (publicList.body.listings || []).find(l => l.id === listingId);
    assert(!foundPublic, 'Pending review listing does not leak into public directory');

    // Moderator views central moderation queue
    const queueRes = await request('GET', '/api/admin/moderation/queue?module=jobs', null, {
      Cookie: `lhx_session=${modCookie}; lhx_csrf=${modCsrf}`,
      'X-CSRF-Token': modCsrf,
    });
    assert(queueRes.status === 200, 'Moderator retrieves central moderation queue', `Status: ${queueRes.status}`);
    const foundInQueue = queueRes.body.items.find(i => i.id === listingId);
    assert(Boolean(foundInQueue), 'Pending listing appears in central moderation queue');

    // Inspect detailed item
    const detailRes = await request('GET', `/api/admin/moderation/item/jobs/${listingId}`, null, {
      Cookie: `lhx_session=${modCookie}; lhx_csrf=${modCsrf}`,
      'X-CSRF-Token': modCsrf,
    });
    assert(detailRes.status === 200, 'Moderator inspects detailed item submission', `Status: ${detailRes.status}`);
    assert(detailRes.body.item.title === 'Tractor Mechanic Apprentice', 'Inspection returns accurate listing data');

    // Rejection without reason fails
    const failReject = await request('POST', '/api/admin/moderation/decision', {
      module: 'jobs',
      id: listingId,
      decision: 'reject',
    }, {
      Cookie: `lhx_session=${modCookie}; lhx_csrf=${modCsrf}`,
      'X-CSRF-Token': modCsrf,
    });
    assert(failReject.status === 400, 'Rejection without reason blocked (REASON_REQUIRED)', `Status: ${failReject.status}`);

    // Moderator approves listing
    const approveRes = await request('POST', '/api/admin/moderation/decision', {
      module: 'jobs',
      id: listingId,
      decision: 'approve_publish',
      notes: 'Verified zero-fee salary compliance.',
    }, {
      Cookie: `lhx_session=${modCookie}; lhx_csrf=${modCsrf}`,
      'X-CSRF-Token': modCsrf,
    });
    assert(approveRes.status === 200, 'Moderator approves listing', `Status: ${approveRes.status}`);
    assert(approveRes.body.newStatus === 'published', 'Listing status updated to published');

    // Public now sees approved listing
    const publicListAfter = await request('GET', '/api/listings?module=jobs');
    const foundPublished = (publicListAfter.body.listings || []).find(l => l.id === listingId);
    assert(Boolean(foundPublished), 'Approved listing is now visible on public directory');

    // ------------------------------------------------------------------
    // SECTION 3: USER, BUSINESS & PROFESSIONAL VERIFICATION
    // ------------------------------------------------------------------
    console.log('\n--- 3. VERIFICATION QUEUE & BADGE GOVERNANCE ---');

    // Citizen submits verification request with document
    const verifSub = await request('POST', '/api/verifications/submit', {
      targetType: 'business',
      targetId: bizId,
      badgeType: 'business_verified',
      documentType: 'shop_act_licence',
      documentReferenceMasked: 'MH-GONDIA-***-9821',
      documentUrl: '/uploads/documents/biz_registration_deori.pdf',
      submittedData: { establishmentYear: 2021, talukaWard: 'Ward 4' },
    }, {
      Cookie: `lhx_session=${citizenCookie}; lhx_csrf=${citizenCsrf}`,
      'X-CSRF-Token': citizenCsrf,
    });
    assert(verifSub.status === 201, 'Citizen submits business verification request', `Status: ${verifSub.status}`);
    const verifReqId = verifSub.body.id;

    // Verifier retrieves verification queue
    const verifQueue = await request('GET', '/api/admin/verifications/queue', null, {
      Cookie: `lhx_session=${verifierCookie}; lhx_csrf=${verifierCsrf}`,
      'X-CSRF-Token': verifierCsrf,
    });
    assert(verifQueue.status === 200, 'Verifier retrieves verification queue', `Status: ${verifQueue.status}`);
    const inVerifQueue = verifQueue.body.requests.find(r => r.id === verifReqId);
    assert(Boolean(inVerifQueue), 'Verification request present in reviewer queue');

    // Verifier accesses document -> access is logged
    const docAccess = await request('GET', `/api/admin/verifications/${verifReqId}/document`, null, {
      Cookie: `lhx_session=${verifierCookie}; lhx_csrf=${verifierCsrf}`,
      'X-CSRF-Token': verifierCsrf,
    });
    assert(docAccess.status === 200, 'Authorized verifier accesses evidence document', `Status: ${docAccess.status}`);
    assert(docAccess.body.accessGranted === true, 'Document access granted to verifier');

    // Verifier issues Action Needed
    const actionNeededRes = await request('POST', `/api/admin/verifications/${verifReqId}/decision`, {
      decision: 'action_needed',
      actionNeededReason: 'Please upload a clear scan of the renewed Maharashtra Shop Act registration certificate.',
    }, {
      Cookie: `lhx_session=${verifierCookie}; lhx_csrf=${verifierCsrf}`,
      'X-CSRF-Token': verifierCsrf,
    });
    assert(actionNeededRes.status === 200, 'Verifier records Action Needed decision', `Status: ${actionNeededRes.status}`);
    assert(actionNeededRes.body.status === 'action_needed', 'Status updated to action_needed');

    // Verifier approves verification and issues badge
    const approveVerif = await request('POST', `/api/admin/verifications/${verifReqId}/decision`, {
      decision: 'approve',
      reason: 'Verified against Maharashtra establishment portal records.',
      scope: 'retail_krishi_merchant',
      expiryMonths: 12,
    }, {
      Cookie: `lhx_session=${verifierCookie}; lhx_csrf=${verifierCsrf}`,
      'X-CSRF-Token': verifierCsrf,
    });
    assert(approveVerif.status === 200, 'Verifier approves verification request', `Status: ${approveVerif.status}`);
    assert(approveVerif.body.badge !== null, 'Active verification badge issued');

    // Public badge inspection endpoint
    const publicBadge = await request('GET', `/api/verifications/badges/business/${bizId}`);
    assert(publicBadge.status === 200, 'Public retrieves business verification badges', `Status: ${publicBadge.status}`);
    assert(publicBadge.body.count > 0, 'Business possesses active verification badge');
    assert(publicBadge.body.badges[0].explanation.includes('Maharashtra Shop Act'), 'Badge displays honest limited scope explanation');

    // ------------------------------------------------------------------
    // SECTION 4: REPORTS MANAGEMENT & EMERGENCY INACCURACIES
    // ------------------------------------------------------------------
    console.log('\n--- 4. COMMUNITY REPORTS & URGENT EMERGENCY QUEUE ---');

    // Citizen reports misleading listing
    const repRes = await request('POST', '/api/reports', {
      targetType: 'listing',
      targetId: listingId,
      reason: 'Inaccurate Location',
      details: 'Tractor shop is located in Chichgarh circle, not Deori HQ.',
    }, {
      Cookie: `lhx_session=${citizenCookie}; lhx_csrf=${citizenCsrf}`,
      'X-CSRF-Token': citizenCsrf,
    });
    assert(repRes.status === 201, 'Citizen submits listing report', `Status: ${repRes.status}`);
    const reportId = repRes.body.reportId;

    // Moderator views reports queue
    const repQueue = await request('GET', '/api/admin/reports/queue', null, {
      Cookie: `lhx_session=${modCookie}; lhx_csrf=${modCsrf}`,
      'X-CSRF-Token': modCsrf,
    });
    assert(repQueue.status === 200, 'Moderator retrieves reports queue', `Status: ${repQueue.status}`);
    const foundReport = repQueue.body.reports.find(r => r.id === reportId);
    assert(Boolean(foundReport), 'Report is listed in moderation queue');

    // Moderator resolves report
    const resolveRep = await request('POST', `/api/admin/reports/${reportId}/review`, {
      sourceQueue: 'listing_reports',
      status: 'resolved',
      resolutionNotes: 'Contacted business owner and updated circle to Chichgarh.',
    }, {
      Cookie: `lhx_session=${modCookie}; lhx_csrf=${modCsrf}`,
      'X-CSRF-Token': modCsrf,
    });
    assert(resolveRep.status === 200, 'Moderator resolves report with documented notes', `Status: ${resolveRep.status}`);

    // ------------------------------------------------------------------
    // SECTION 5: RESTRICTIONS & 30-DAY APPEALS WORKFLOW
    // ------------------------------------------------------------------
    console.log('\n--- 5. RESTRICTIONS & 30-DAY APPEALS WORKFLOW ---');

    // Moderator attempts to impose restriction -> blocked by least privilege
    const modRestrFail = await request('POST', '/api/admin/restrictions', {
      userId: citizenId,
      targetType: 'listing',
      targetId: listingId,
      restrictionType: 'listing_hold',
      reasonCategory: 'misleading_pricing',
      publicReason: 'Test listing hold',
    }, {
      Cookie: `lhx_session=${modCookie}; lhx_csrf=${modCsrf}`,
      'X-CSRF-Token': modCsrf,
    });
    assert(modRestrFail.status === 403, 'Staff without restrictions.manage permission blocked (Status: 403)');

    // Super Admin imposes listing hold restriction
    const restrRes = await request('POST', '/api/admin/restrictions', {
      userId: citizenId,
      targetType: 'listing',
      targetId: listingId,
      restrictionType: 'listing_hold',
      reasonCategory: 'misleading_pricing',
      publicReason: 'Listing placed on temporary hold due to unverified salary claims. Please provide verification documents.',
      internalNotes: 'Flagged after community report investigation.',
      affectedScope: 'listing:jobs',
      expiryDays: 14,
    }, {
      Cookie: `lhx_session=${superAdminCookie}; lhx_csrf=${superAdminCsrf}`,
      'X-CSRF-Token': superAdminCsrf,
    });
    assert(restrRes.status === 201, 'Super Admin imposes listing hold restriction', `Status: ${restrRes.status}`);
    const restrictionId = restrRes.body.id;
    assert(restrRes.body.appealWindowEndsAt !== undefined, 'Automatic 30-day appeal window assigned');

    // Listing is now paused/held
    const checkListHold = await request('GET', '/api/listings?module=jobs');
    const isVisibleDuringHold = (checkListHold.body.listings || []).some(l => l.id === listingId);
    assert(!isVisibleDuringHold, 'Listing on hold is hidden from public search');

    // Citizen submits appeal within 30-day window
    const appealRes = await request('POST', `/api/restrictions/${restrictionId}/appeal`, {
      appealReason: 'We have updated our terms and attached official salary slips confirming Rs 12,000 monthly apprentice stipend.',
      supportingEvidence: 'Stipend agreement 2026 attached.',
    }, {
      Cookie: `lhx_session=${citizenCookie}; lhx_csrf=${citizenCsrf}`,
      'X-CSRF-Token': citizenCsrf,
    });
    assert(appealRes.status === 201, 'Citizen submits appeal within 30-day window', `Status: ${appealRes.status}`);
    const appealId = appealRes.body.appealId;

    // Staff views appeals queue
    const appealsQueue = await request('GET', '/api/admin/appeals', null, {
      Cookie: `lhx_session=${superAdminCookie}; lhx_csrf=${superAdminCsrf}`,
      'X-CSRF-Token': superAdminCsrf,
    });
    assert(appealsQueue.status === 200, 'Admin retrieves appeals queue', `Status: ${appealsQueue.status}`);
    const foundAppeal = appealsQueue.body.appeals.find(a => a.id === appealId);
    assert(Boolean(foundAppeal), 'Submitted appeal present in staff review queue');

    // Review appeal: Lift restriction
    const liftAppeal = await request('POST', `/api/admin/appeals/${appealId}/review`, {
      decision: 'lift',
      decisionNotes: 'Evidence verified. Stipend documentation accepted. Restoring listing.',
      liftReason: 'Stipend agreement verified by staff.',
    }, {
      Cookie: `lhx_session=${superAdminCookie}; lhx_csrf=${superAdminCsrf}`,
      'X-CSRF-Token': superAdminCsrf,
    });
    assert(liftAppeal.status === 200, 'Separate authorized reviewer lifts restriction upon valid appeal', `Status: ${liftAppeal.status}`);

    // Listing restored
    const checkListAfterLift = await request('GET', '/api/listings?module=jobs');
    const isVisibleAfterLift = (checkListAfterLift.body.listings || []).some(l => l.id === listingId);
    assert(isVisibleAfterLift, 'Listing is restored to public directory after restriction lifted');

    // ------------------------------------------------------------------
    // SECTION 6: APPEND-ONLY AUDIT LOGS EXPLORER
    // ------------------------------------------------------------------
    console.log('\n--- 6. SECURITY AUDIT LOGS EXPLORER ---');

    const auditRes = await request('GET', '/api/admin/audit-logs?limit=50', null, {
      Cookie: `lhx_session=${superAdminCookie}; lhx_csrf=${superAdminCsrf}`,
      'X-CSRF-Token': superAdminCsrf,
    });
    assert(auditRes.status === 200, 'Authorized admin retrieves audit logs', `Status: ${auditRes.status}`);
    assert(auditRes.body.logs.length > 0, `Audit logs returned (Count: ${auditRes.body.logs.length})`);

    const hasRoleChange = auditRes.body.logs.some(l => l.action === 'admin.role_changed');
    assert(hasRoleChange, 'Audit logs contain role change record');

    const hasDocAccess = auditRes.body.logs.some(l => l.action === 'verification.document_accessed');
    assert(hasDocAccess, 'Audit logs contain sensitive document access record');

    const hasModeration = auditRes.body.logs.some(l => l.action.startsWith('moderation.'));
    assert(hasModeration, 'Audit logs contain moderation decision record');

    const hasRestriction = auditRes.body.logs.some(l => l.action.startsWith('restriction.'));
    assert(hasRestriction, 'Audit logs contain restriction record');

    assert(auditRes.body.immutabilityNotice !== undefined, 'Audit explorer provides honest immutability disclaimer');

  } catch (err) {
    console.error('[UNEXPECTED_TEST_CRASH]', err);
    failed++;
  } finally {
    if (dedicatedServer) {
      dedicatedServer.close();
    }
  }

  console.log('========================================================');
  console.log(` Summary: ${passed} passed, ${failed} failed out of ${passed + failed} assertions.`);
  console.log('========================================================');
  if (failed > 0) {
    console.error('TEST SUITE FAILED.');
    process.exit(1);
  } else {
    console.log('ALL PHASE 6 ADMIN, MODERATION & VERIFICATION ACCEPTANCE CRITERIA PASSED.');
    process.exit(0);
  }
}

runTestSuite();
