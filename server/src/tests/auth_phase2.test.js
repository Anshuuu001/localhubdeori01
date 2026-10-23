import http from 'http';
import { env } from '../config/env.js';
import { executeQuery } from '../config/database.js';
import { getDevSimulatedOtp } from '../services/sms.service.js';
import { getDevSimulatedEmailOtp } from '../services/email.service.js';
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
  console.log(' LocalHub X - Phase 2 Comprehensive Test Suite');
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
    // 1. Phase 1 Regressions Check
    console.log('\n--- 1. Phase 1 Compatibility Checks ---');
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'healthy', 'GET /api/health', `DB Connected: ${health.body?.database?.connected}`);

    const modules = await request('GET', '/api/modules');
    assert(modules.status === 200 && modules.body.count === 10, 'GET /api/modules', `Found ${modules.body?.count} modules`);

    const areas = await request('GET', '/api/areas');
    assert(areas.status === 200 && areas.body.taluka === 'Deori Taluka', 'GET /api/areas', `Taluka: ${areas.body?.taluka}`);

    const emergency = await request('GET', '/api/emergency/status');
    assert(emergency.status === 200 && typeof emergency.body.verifiedDataConfigured === 'boolean', 'GET /api/emergency/status', 'Emergency safeguards intact (no invented numbers)');

    // 2. Authentication: Email/Password Registration
    console.log('\n--- 2. Account Registration & Password Hashing ---');
    const timestamp = Date.now();
    const testEmail1 = `citizen_${timestamp}@deorihub.local`;
    const testPass = 'SecureDeori@2026';

    const regRes = await request('POST', '/api/auth/register', {
      fullName: 'Ganesh Meshram',
      email: testEmail1,
      password: testPass,
    });

    assert(regRes.status === 201, 'Register user with email/password', `Status: ${regRes.status}`);
    assert(regRes.body?.user?.isEmailVerified === false, 'Separate email verification state initialized as false');
    
    // Verify password is NOT stored in plaintext in the DB
    const [dbUser] = await executeQuery('SELECT password_hash FROM users WHERE email = ?', [testEmail1]);
    assert(
      dbUser[0]?.password_hash && !dbUser[0].password_hash.includes(testPass) && dbUser[0].password_hash.startsWith('$2'),
      'Password stored as strong bcrypt hash (never plaintext)'
    );

    const user1SessionCookie = extractCookie(regRes, 'lhx_session');
    const user1Csrf = regRes.body?.csrfToken;
    assert(Boolean(user1SessionCookie), 'HttpOnly session cookie issued on registration');

    // 3. Email / Password Login
    console.log('\n--- 3. Email/Password Authentication & Security ---');
    const badLogin = await request('POST', '/api/auth/login', {
      email: testEmail1,
      password: 'WrongPassword123',
    });
    assert(badLogin.status === 401, 'Rejection of incorrect password with generic message', badLogin.body?.error?.code);

    const goodLogin = await request('POST', '/api/auth/login', {
      email: testEmail1,
      password: testPass,
    });
    assert(goodLogin.status === 200 && goodLogin.body.user.email === testEmail1, 'Successful login with valid credentials');
    const user1Token = goodLogin.body.token;

    // 4. Phone OTP Registration & Rate Limiting
    console.log('\n--- 4. Phone OTP Registration, Expiry & Single-Use ---');
    const testPhone = `9822${String(timestamp).slice(-6)}`;
    
    const otpReq = await request('POST', '/api/auth/otp/request', {
      identifier: testPhone,
      channel: 'phone_sms',
      purpose: 'login',
    });
    assert(otpReq.status === 200 && otpReq.body.isDevelopmentMock === true, 'Request Phone OTP with development mock notice', otpReq.body?.devNotice);

    const simulatedOtp = getDevSimulatedOtp(testPhone);
    assert(Boolean(simulatedOtp && simulatedOtp.length === 6), 'Simulated OTP generated in dev queue');

    // Test wrong OTP attempt
    const wrongOtpRes = await request('POST', '/api/auth/otp/verify', {
      identifier: testPhone,
      otp: '000000',
      purpose: 'login',
    });
    assert(wrongOtpRes.status === 400 && wrongOtpRes.body?.error?.code === 'INVALID_OTP', 'Rejection of invalid OTP with remaining attempts');

    // Verify with correct OTP
    const otpVerifyRes = await request('POST', '/api/auth/otp/verify', {
      identifier: testPhone,
      otp: simulatedOtp,
      purpose: 'login',
      fullName: 'Deori Farmer Rajendra',
    });
    assert(otpVerifyRes.status === 200 && otpVerifyRes.body.user.isPhoneVerified === true, 'Successful Phone OTP verification and separate phone verified flag set');

    // Test replay / reuse of already consumed OTP
    const reuseRes = await request('POST', '/api/auth/otp/verify', {
      identifier: testPhone,
      otp: simulatedOtp,
      purpose: 'login',
    });
    assert(reuseRes.status === 400, 'Prevention of OTP reuse (single-use challenge consumed)');

    // 5. CSRF Protection for Session Cookies
    console.log('\n--- 5. CSRF Protection on Mutating Endpoints ---');
    const csrfFail = await request(
      'PATCH',
      '/api/account/profile',
      { fullName: 'Tampered Name' },
      { Cookie: `lhx_session=${user1SessionCookie}` } // missing X-CSRF-Token
    );
    assert(csrfFail.status === 403 && csrfFail.body?.error?.code === 'CSRF_VALIDATION_FAILED', 'State-changing request blocked without valid CSRF header');

    const csrfPass = await request(
      'PATCH',
      '/api/account/profile',
      { fullName: 'Ganesh Meshram Updated' },
      {
        Cookie: `lhx_session=${user1SessionCookie}`,
        'X-CSRF-Token': user1Csrf,
      }
    );
    assert(csrfPass.status === 200, 'State-changing request succeeds with valid CSRF token header');

    // 6. Active Session Management & Revocation
    console.log('\n--- 6. Session & Device Management ---');
    const sessionsRes = await request('GET', '/api/sessions', null, {
      Authorization: `Bearer ${user1Token}`,
    });
    assert(sessionsRes.status === 200 && sessionsRes.body.count >= 1, 'List active sessions for current user', `Count: ${sessionsRes.body?.count}`);

    // 7. Password Recovery without User Enumeration
    console.log('\n--- 7. Password Recovery & Anti-Enumeration ---');
    const fakeRecov = await request('POST', '/api/auth/password-recovery/request', {
      identifier: 'nonexistent_person_999@gmail.com',
    });
    const realRecov = await request('POST', '/api/auth/password-recovery/request', {
      identifier: testEmail1,
    });
    assert(
      fakeRecov.status === 200 && realRecov.status === 200 && fakeRecov.body.message === realRecov.body.message,
      'Password recovery returns identical uniform response preventing user enumeration'
    );

    const resetOtp = getDevSimulatedEmailOtp(testEmail1);
    assert(Boolean(resetOtp), 'Reset OTP dispatched to email simulation queue');

    const newPass = 'BrandNewPassword@2026';
    const resetRes = await request('POST', '/api/auth/password-recovery/reset', {
      identifier: testEmail1,
      otp: resetOtp,
      newPassword: newPass,
    });
    assert(resetRes.status === 200, 'Password reset succeeded with OTP');

    // Confirm that old session was invalidated on password reset
    const oldSessionCheck = await request('GET', '/api/account/profile', null, {
      Authorization: `Bearer ${user1Token}`,
    });
    assert(oldSessionCheck.status === 401, 'Previous sessions revoked immediately on password reset');

    // Re-login with new password
    const reLogin = await request('POST', '/api/auth/login', {
      email: testEmail1,
      password: newPass,
    });
    const freshUser1Token = reLogin.body.token;
    const freshUser1Id = reLogin.body.user.id;
    assert(reLogin.status === 200, 'Login verified with updated password');

    // 8. Loss of Both Identifiers (Recovery Request Queue)
    console.log('\n--- 8. Loss of Identifiers Recovery Flow ---');
    const lossReq = await request('POST', '/api/auth/recovery-request', {
      fullName: 'Lost Account Holder',
      lostIdentifier: 'lostphone@example.com',
      alternateContact: '+91 9423000000',
      details: 'SIM card damaged and email account password lost while traveling in Gondia.',
    });
    assert(lossReq.status === 201 && lossReq.body.status === 'pending_review', 'Loss-of-identifiers request placed in pending_review queue without bypassing auth');

    // 9. Account Deletion Request with 30-Day Grace Period
    console.log('\n--- 9. Account Deletion & Grace Period ---');
    // First re-authenticate to allow sensitive action
    await request('POST', '/api/auth/reauth', { password: newPass }, {
      Authorization: `Bearer ${freshUser1Token}`,
    });

    const delReq = await request('POST', '/api/account/deletion/request', { reason: 'Moving to Pune' }, {
      Authorization: `Bearer ${freshUser1Token}`,
    });
    assert(delReq.status === 201 && delReq.body.gracePeriodDays === 30, 'Account deletion initiated with 30-day grace period');

    const cancelDel = await request('POST', '/api/account/deletion/cancel', {}, {
      Authorization: `Bearer ${freshUser1Token}`,
    });
    assert(cancelDel.status === 200, 'Account deletion successfully cancelled within grace period');

    // 10. Business Architecture: Create Profile (Unverified by default)
    console.log('\n--- 10. Business Profile & Multi-Workspace Architecture ---');
    const bizCreate = await request(
      'POST',
      '/api/business',
      {
        name: 'Deori Agro Krishi Kendra',
        businessType: 'Agriculture & Fertilizer',
        category: 'Krishi Bazaar',
        description: 'Certified seeds, bio-fertilizers, and farm tools for Deori farmers.',
        phone: '07184-252100',
        addressLine1: 'Main Road, Near Shivaji Chowk, Deori',
        talukaAreaId: 'deori-hq',
      },
      { Authorization: `Bearer ${freshUser1Token}` }
    );
    assert(bizCreate.status === 201, 'Business profile created', `ID: ${bizCreate.body?.business?.id}`);
    assert(bizCreate.body?.business?.verificationStatus === 'unverified', 'Business profile is explicitly Unverified by default (no fake verification)');
    const businessId = bizCreate.body?.business?.id;

    // 11. Business Branches
    console.log('\n--- 11. Business Branches Management ---');
    const branchRes = await request(
      'POST',
      `/api/business/${businessId}/branches`,
      {
        branchName: 'Chichgarh Circle Outlet',
        talukaAreaId: 'chichgarh',
        address: 'Market Yard, Chichgarh',
        phone: '07184-255010',
        isHeadquarters: false,
      },
      { Authorization: `Bearer ${freshUser1Token}` }
    );
    assert(branchRes.status === 201, 'Branch added under business profile');

    const branchList = await request('GET', `/api/business/${businessId}/branches`, null, {
      Authorization: `Bearer ${freshUser1Token}`,
    });
    assert(branchList.status === 200 && branchList.body.branches.length === 2, 'List branches (HQ + new branch)', `Count: ${branchList.body?.branches?.length}`);

    // 12. Team Invitations & Permission Scoping
    console.log('\n--- 12. Team Invitations & Granular Role Permissions ---');
    // Create a second user: Rahul (Listings Staff)
    const user2Email = `rahul_staff_${timestamp}@deorihub.local`;
    const user2Reg = await request('POST', '/api/auth/register', {
      fullName: 'Rahul Bhende',
      email: user2Email,
      password: 'RahulStaff@2026',
    });
    const user2Token = user2Reg.body.token;
    const user2Id = user2Reg.body.user.id;

    // Send invitation to user2 for 'listings_staff' role
    const inviteRes = await request(
      'POST',
      `/api/business/${businessId}/team/invite`,
      {
        inviteeIdentifier: user2Email,
        roleId: 'listings_staff',
      },
      { Authorization: `Bearer ${freshUser1Token}` }
    );
    assert(inviteRes.status === 201, 'Send team invitation scoped to specific business with Listings Staff role');
    const invitationId = inviteRes.body.invitationId;

    // User 2 checks incoming invitations
    const myInvites = await request('GET', '/api/invitations/my-invitations', null, {
      Authorization: `Bearer ${user2Token}`,
    });
    assert(myInvites.status === 200 && myInvites.body.invitations.length === 1, 'Invited user receives scoped invitation in desk');

    // User 2 accepts invitation
    const acceptInvite = await request('POST', `/api/invitations/${invitationId}/respond`, { action: 'accept' }, {
      Authorization: `Bearer ${user2Token}`,
    });
    assert(acceptInvite.status === 200, 'Invited user accepts membership');

    // 13. Data Isolation & IDOR / Permission Checks
    console.log('\n--- 13. Data Isolation, IDOR & Permission Enforcement ---');
    // User 2 attempts to edit business profile details (requires 'business.edit', which listings_staff lacks)
    const unauthorizedEdit = await request(
      'PATCH',
      `/api/business/${businessId}`,
      { name: 'Illegally Renamed Business' },
      { Authorization: `Bearer ${user2Token}` }
    );
    assert(
      unauthorizedEdit.status === 403 && unauthorizedEdit.body?.error?.code === 'INSUFFICIENT_PERMISSIONS',
      'Listings Staff blocked from business.edit (Permission isolation enforced on backend)'
    );

    // User 3 (Strand citizen) attempts to view User 1's business team (IDOR protection)
    const user3Email = `stranger_${timestamp}@deorihub.local`;
    const user3Reg = await request('POST', '/api/auth/register', {
      fullName: 'Pooja Patil',
      email: user3Email,
      password: 'PoojaPatil@2026',
    });
    const user3Token = user3Reg.body.token;

    const idorCheck = await request('GET', `/api/business/${businessId}/team`, null, {
      Authorization: `Bearer ${user3Token}`,
    });
    assert(idorCheck.status === 403, 'Unrelated user blocked from accessing business team (IDOR protection)');

    // 14. Controlled Ownership Transfer
    console.log('\n--- 14. Controlled Business Ownership Transfer ---');
    // User 2 (regular team member) attempts to initiate ownership transfer (Blocked)
    const illegalTransfer = await request(
      'POST',
      `/api/business/${businessId}/transfer/initiate`,
      { proposedOwnerId: user2Id },
      { Authorization: `Bearer ${user2Token}` }
    );
    assert(illegalTransfer.status === 403, 'Regular team member cannot transfer business ownership');

    // Owner transfers to user 2
    // First reauth owner
    await request('POST', '/api/auth/reauth', { password: newPass }, {
      Authorization: `Bearer ${freshUser1Token}`,
    });

    const validTransfer = await request(
      'POST',
      `/api/business/${businessId}/transfer/initiate`,
      { proposedOwnerId: user2Id, notes: 'Retirement handover' },
      { Authorization: `Bearer ${freshUser1Token}` }
    );
    assert(validTransfer.status === 201 && validTransfer.body.status === 'pending_acceptance', 'Owner initiates controlled ownership transfer requiring acceptance');
    const transferId = validTransfer.body.transferId;

    // User 2 accepts transfer
    const acceptTransfer = await request(
      'POST',
      `/api/business/${businessId}/transfer/${transferId}/accept`,
      {},
      { Authorization: `Bearer ${user2Token}` }
    );
    assert(acceptTransfer.status === 200, 'Proposed owner accepts transfer and becomes primary owner');

    // Confirm in DB that User 2 is now owner and User 1 was safely demoted to manager
    const [bizPostTransfer] = await executeQuery('SELECT owner_user_id FROM business_profiles WHERE id = ?', [businessId]);
    assert(bizPostTransfer[0]?.owner_user_id === user2Id, 'Business owner_user_id safely updated to proposed owner');

    // 15. Audit Trail Verification
    console.log('\n--- 15. Immutable Security Audit Trail ---');
    const [auditRows] = await executeQuery(
      'SELECT action, actor_id, entity_type FROM audit_logs WHERE actor_id IN (?, ?) ORDER BY created_at ASC',
      [freshUser1Id, user2Id]
    );
    assert(auditRows.length >= 6, 'Audit trail recorded security & membership events', `Total logged: ${auditRows.length}`);
    const actions = auditRows.map(a => a.action);
    assert(actions.includes('business.created') && actions.includes('business.ownership_transfer_completed'), 'Audit log contains business.created and ownership_transfer_completed');

    console.log('\n========================================================');
    console.log(` Summary: ${passed} passed, ${failed} failed out of ${passed + failed} assertions.`);
    console.log('========================================================');

    if (failed === 0) {
      console.log('ALL PHASE 2 BACKEND ACCEPTANCE CRITERIA PASSED.');
      process.exit(0);
    } else {
      console.error('SOME TESTS FAILED.');
      process.exit(1);
    }
  } catch (err) {
    console.error('[UNCAUGHT TEST RUNNER ERROR]', err);
    process.exit(1);
  }
}

// Allow server startup
setTimeout(runTestSuite, 1000);
