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
  console.log(' LocalHub X - Phase 4 User Activity & Requests Test Suite');
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
    // User A: Employer / Business Owner
    const userAEmail = `employer_${ts}@deorihub.local`;
    const regA = await request('POST', '/api/auth/register', {
      fullName: 'Ramesh Agro Services (Employer A)',
      email: userAEmail,
      password: 'SecurePassword@2026',
    });
    assert(regA.status === 201, 'User A (Employer) registered', `Status: ${regA.status}`);
    const userASession = extractCookie(regA, 'lhx_session');
    const userACsrf = regA.body?.csrfToken;
    const userAHeaders = {
      Cookie: `lhx_session=${userASession}`,
      'X-CSRF-Token': userACsrf,
    };

    // User B: Citizen / Applicant / Requester
    const userBEmail = `citizen_applicant_${ts}@deorihub.local`;
    const regB = await request('POST', '/api/auth/register', {
      fullName: 'Sunil Meshram (Applicant B)',
      email: userBEmail,
      password: 'SecurePassword@2026',
    });
    assert(regB.status === 201, 'User B (Citizen) registered', `Status: ${regB.status}`);
    const userBSession = extractCookie(regB, 'lhx_session');
    const userBCsrf = regB.body?.csrfToken;
    const userBHeaders = {
      Cookie: `lhx_session=${userBSession}`,
      'X-CSRF-Token': userBCsrf,
    };

    // User C: Unaffiliated 3rd-party user for IDOR attack tests
    const userCEmail = `unrelated_${ts}@deorihub.local`;
    const regC = await request('POST', '/api/auth/register', {
      fullName: 'Unauthorized Intruder (User C)',
      email: userCEmail,
      password: 'SecurePassword@2026',
    });
    assert(regC.status === 201, 'User C (Attacker) registered', `Status: ${regC.status}`);
    const userCSession = extractCookie(regC, 'lhx_session');
    const userCCsrf = regC.body?.csrfToken;
    const userCHeaders = {
      Cookie: `lhx_session=${userCSession}`,
      'X-CSRF-Token': userCCsrf,
    };

    // 2. Setup Business A under User A
    const bizRes = await request('POST', '/api/business', {
      name: 'Ramesh Agro Tech Deori',
      businessType: 'Agriculture & Equipment',
      category: 'Agri Services',
      description: 'Serving farmers and rural enterprises across Deori Taluka',
      email: 'contact@rameshagro.local',
      phone: '9876543210',
      addressLine1: 'Station Road, Deori',
      talukaAreaId: 'deori-hq',
    }, userAHeaders);
    const businessAId = bizRes.body?.business?.id;
    assert(bizRes.status === 201 && businessAId, 'Business A created', `ID: ${businessAId}`);

    // Mark Business A as verified so listings are published immediately
    await executeQuery(
      `UPDATE business_profiles SET verification_status = 'verified' WHERE id = ?`,
      [businessAId]
    );

    // Create Published Job Listing under Business A
    const jobListingRes = await request('POST', '/api/listings', {
      module: 'jobs',
      businessProfileId: businessAId,
      title: 'Tractor Mechanic & Field Operator',
      category: 'Skilled Trades',
      description: 'Looking for an experienced tractor operator and service technician in Deori.',
      price: 18000,
      pricePeriod: 'month',
      talukaAreaId: 'deori-hq',
      jobType: 'Full-time',
      vacanciesCount: 2,
      experienceRequired: '2 years minimum',
      qualifications: 'ITI Tractor Mechanic or equivalent field experience',
    }, userAHeaders);
    const jobListingId = jobListingRes.body?.listingId;
    assert(jobListingRes.status === 201 && jobListingId, 'Published Job Listing created', `ID: ${jobListingId}`);

    // Create Published Rental Listing under Business A
    const rentalListingRes = await request('POST', '/api/listings', {
      module: 'rentals',
      businessProfileId: businessAId,
      title: '1 BHK Rental Room near Deori Bus Stand',
      category: 'Residential',
      description: 'Clean room with water supply and separate electricity meter.',
      price: 3500,
      pricePeriod: 'month',
      talukaAreaId: 'deori-hq',
      propertyType: 'room',
      depositAmount: 7000,
      furnishingStatus: 'semi_furnished',
    }, userAHeaders);
    const rentalListingId = rentalListingRes.body?.listingId;
    assert(rentalListingRes.status === 201 && rentalListingId, 'Published Rental Listing created', `ID: ${rentalListingId}`);

    // Create Published Local Service Listing under Business A
    const serviceListingRes = await request('POST', '/api/listings', {
      module: 'services',
      businessProfileId: businessAId,
      title: 'Borewell Motor Repair & Pump Installation',
      category: 'Electrical & Pumps',
      description: 'On-site repair for agricultural submersibles and domestic pumps across Deori villages.',
      price: 500,
      pricePeriod: 'job',
      pricingType: 'starting_at',
      talukaAreaId: 'deori-hq',
    }, userAHeaders);
    const serviceListingId = serviceListingRes.body?.listingId;
    assert(serviceListingRes.status === 201 && serviceListingId, 'Published Service Listing created', `ID: ${serviceListingId}`);

    // ====================================================
    // MODULE 1: JOB APPLICATIONS LIFECYCLE
    // ====================================================
    console.log('\n--- 1. JOB APPLICATIONS LIFECYCLE ---');

    // 1.1 Candidate B applies for job
    const applyRes = await request('POST', '/api/requests/jobs', {
      listingId: jobListingId,
      applicantName: 'Sunil Meshram',
      applicantPhone: '9823456789',
      applicantEmail: 'sunil.meshram@deorihub.local',
      coverNote: 'Experienced in Mahindra & Swaraj tractor repairs. Residing in Chichgarh.',
      experienceSummary: '3 years at local garage',
      qualifications: 'ITI Diesel Mechanic',
    }, userBHeaders);
    assert(applyRes.status === 201, 'Candidate B applies for job (Status: 201)');
    const jobAppId = applyRes.body?.application?.id;
    assert(applyRes.body?.application?.status === 'submitted', 'Job application status is "submitted"');

    // 1.2 Prevent duplicate applications
    const dupApplyRes = await request('POST', '/api/requests/jobs', {
      listingId: jobListingId,
      applicantName: 'Sunil Meshram',
      applicantPhone: '9823456789',
    }, userBHeaders);
    assert(dupApplyRes.status === 409, 'Duplicate job application prevented (APPLICATION_ALREADY_EXISTS)', `Status: ${dupApplyRes.status}`);

    // 1.3 Prevent self-application
    const selfApplyRes = await request('POST', '/api/requests/jobs', {
      listingId: jobListingId,
      applicantName: 'Ramesh Patil',
    }, userAHeaders);
    assert(selfApplyRes.status === 400, 'Self-application blocked (SELF_APPLICATION_PROHIBITED)', `Status: ${selfApplyRes.status}`);

    // 1.4 Applicant views their own application
    const viewAppRes = await request('GET', `/api/requests/jobs/${jobAppId}`, null, userBHeaders);
    assert(viewAppRes.status === 200, 'Candidate views own job application');
    assert(viewAppRes.body?.application?.userRole === 'applicant', 'User role correctly detected as applicant');
    assert(viewAppRes.body?.history?.length >= 1, 'Status history timeline includes initial submission');
    assert(viewAppRes.body?.history[0]?.toStatus === 'submitted', 'History records "submitted" status');

    // 1.5 IDOR Attack: User C (Intruder) blocked from viewing Candidate B's application
    const idorAppRes = await request('GET', `/api/requests/jobs/${jobAppId}`, null, userCHeaders);
    assert(idorAppRes.status === 403, 'Unauthorized User C blocked from viewing job application (IDOR Safeguard)', `Status: ${idorAppRes.status}`);

    // 1.6 Employer A shortlists Candidate B
    const shortlistRes = await request('PATCH', `/api/requests/jobs/${jobAppId}/status`, {
      status: 'shortlisted',
      reason: 'Strong local experience with Swaraj tractors',
      notes: 'Call for in-person interview on Monday',
    }, userAHeaders);
    assert(shortlistRes.status === 200, 'Employer shortlists candidate application', `New Status: ${shortlistRes.body?.status}`);

    // 1.7 Invalid status transition rejected
    const invalidTransRes = await request('PATCH', `/api/requests/jobs/${jobAppId}/status`, {
      status: 'submitted', // Cannot move backwards to submitted
    }, userAHeaders);
    assert(invalidTransRes.status === 400, 'Invalid backwards transition rejected (INVALID_STATUS_TRANSITION)', `Status: ${invalidTransRes.status}`);

    // 1.8 Candidate cannot tamper with employer status
    const tamperRes = await request('PATCH', `/api/requests/jobs/${jobAppId}/status`, {
      status: 'hired',
    }, userBHeaders);
    assert(tamperRes.status === 403, 'Candidate blocked from updating application status to hired (FORBIDDEN)', `Status: ${tamperRes.status}`);

    // 1.9 Employer A hires Candidate B
    const hireRes = await request('PATCH', `/api/requests/jobs/${jobAppId}/status`, {
      status: 'hired',
      reason: 'Selected following practical workshop test',
    }, userAHeaders);
    assert(hireRes.status === 200, 'Employer transitions candidate application to "hired"');

    // 1.10 Verify Status History Audit Trail
    const auditRes = await request('GET', `/api/requests/jobs/${jobAppId}`, null, userBHeaders);
    assert(auditRes.body?.history?.length === 3, 'Status history contains 3 immutable transition records (submitted -> shortlisted -> hired)');

    // ====================================================
    // MODULE 2: RENTAL & GENERAL LISTING ENQUIRIES
    // ====================================================
    console.log('\n--- 2. RENTAL & GENERAL LISTING ENQUIRIES ---');

    // 2.1 Citizen B submits enquiry for Rental room
    const enquiryRes = await request('POST', '/api/requests/enquiries', {
      listingId: rentalListingId,
      message: 'Hello, is this room still available? Can we visit today for inspection?',
      preferredContactMethod: 'phone',
      contactPhone: '9823456789',
    }, userBHeaders);
    assert(enquiryRes.status === 201, 'Citizen B submits rental enquiry (Status: 201)');
    const enquiryId = enquiryRes.body?.enquiry?.id;
    assert(enquiryRes.body?.enquiry?.status === 'sent', 'Enquiry status is "sent"');

    // 2.2 Landlord A marks enquiry as viewed
    const markViewedRes = await request('PATCH', `/api/requests/enquiries/${enquiryId}/view`, {}, userAHeaders);
    assert(markViewedRes.status === 200, 'Landlord marks enquiry as viewed (Status: viewed)');

    // 2.3 Landlord A responds to enquiry
    const respondRes = await request('PATCH', `/api/requests/enquiries/${enquiryId}/respond`, {
      responseMessage: 'Yes, the room is vacant. Please visit between 4 PM and 6 PM near Deori Bus Stand.',
    }, userAHeaders);
    assert(respondRes.status === 200, 'Landlord responds with message', `Status: ${respondRes.body?.status}`);

    // 2.4 Verify enquiry history and response retrieval
    const getEnquiryRes = await request('GET', `/api/requests/enquiries/${enquiryId}`, null, userBHeaders);
    assert(getEnquiryRes.status === 200, 'Requester retrieves responded enquiry');
    assert(getEnquiryRes.body?.enquiry?.responseMessage.includes('between 4 PM and 6 PM'), 'Response message persisted correctly');

    // 2.5 Landlord closes enquiry
    const closeEnquiryRes = await request('PATCH', `/api/requests/enquiries/${enquiryId}/close`, {
      reason: 'Inspection scheduled',
    }, userAHeaders);
    assert(closeEnquiryRes.status === 200, 'Landlord closes enquiry (Status: closed)');

    // 2.6 Cancellation test: Citizen B submits and cancels a 2nd enquiry
    const enquiry2Res = await request('POST', '/api/requests/enquiries', {
      listingId: rentalListingId,
      message: 'Second enquiry for parking query.',
    }, userBHeaders);
    const enquiry2Id = enquiry2Res.body?.enquiry?.id;
    const cancelEnquiryRes = await request('PATCH', `/api/requests/enquiries/${enquiry2Id}/cancel`, {
      reason: 'Found alternative accommodation',
    }, userBHeaders);
    assert(cancelEnquiryRes.status === 200, 'Requester cancels enquiry (Status: cancelled)');

    // ====================================================
    // MODULE 3: LOCAL SERVICE REQUESTS
    // ====================================================
    console.log('\n--- 3. LOCAL SERVICE REQUESTS ---');

    // 3.1 Citizen B submits service request
    const srvRes = await request('POST', '/api/requests/services', {
      listingId: serviceListingId,
      serviceDescription: 'Borewell pump in agricultural field has stopped lifting water. Need inspection.',
      serviceAreaId: 'deori-hq',
      addressDetails: 'Farm plot near Borgaon road, Deori',
      preferredDate: '2026-10-25',
      preferredTimeSlot: 'morning',
      contactName: 'Sunil Meshram',
      contactPhone: '9823456789',
    }, userBHeaders);
    assert(srvRes.status === 201, 'Citizen B submits service request (Status: 201)');
    const srvReqId = srvRes.body?.serviceRequest?.id;
    assert(srvRes.body?.serviceRequest?.status === 'pending', 'Service request status is "pending"');

    // 3.2 Provider A accepts service request
    const acceptSrvRes = await request('PATCH', `/api/requests/services/${srvReqId}/status`, {
      status: 'accepted',
      notes: 'Technician will visit with testing multimeter at 10 AM',
    }, userAHeaders);
    assert(acceptSrvRes.status === 200, 'Provider accepts service request (Status: accepted)');

    // 3.3 Provider A marks in progress
    const inProgressSrvRes = await request('PATCH', `/api/requests/services/${srvReqId}/status`, {
      status: 'in_progress',
    }, userAHeaders);
    assert(inProgressSrvRes.status === 200, 'Provider marks service in progress (Status: in_progress)');

    // 3.4 Provider A marks completed
    const completeSrvRes = await request('PATCH', `/api/requests/services/${srvReqId}/status`, {
      status: 'completed',
    }, userAHeaders);
    assert(completeSrvRes.status === 200, 'Provider marks service completed (Status: completed)');

    // 3.5 Rejection test with reason
    const srv2Res = await request('POST', '/api/requests/services', {
      listingId: serviceListingId,
      serviceDescription: 'Another service request for motor winding.',
      addressDetails: 'Near Post Office, Chichgarh',
      contactName: 'Sunil Meshram',
      contactPhone: '9823456789',
    }, userBHeaders);
    const srv2ReqId = srv2Res.body?.serviceRequest?.id;

    // Rejection without reason fails
    const rejectNoReasonRes = await request('PATCH', `/api/requests/services/${srv2ReqId}/status`, {
      status: 'rejected',
    }, userAHeaders);
    assert(rejectNoReasonRes.status === 400, 'Rejection without reason blocked (REJECTION_REASON_REQUIRED)');

    // Rejection with reason succeeds
    const rejectWithReasonRes = await request('PATCH', `/api/requests/services/${srv2ReqId}/status`, {
      status: 'rejected',
      reason: 'Area outside our current daily travel radius',
    }, userAHeaders);
    assert(rejectWithReasonRes.status === 200, 'Provider rejects service request with reason (Status: rejected)');

    // ====================================================
    // MODULE 4: RIDE & DELIVERY REQUESTS (TRANSIT)
    // ====================================================
    console.log('\n--- 4. RIDE & DELIVERY REQUESTS (TRANSIT) ---');

    // 4.1 Citizen B submits a Ride request
    const rideRes = await request('POST', '/api/requests/transit', {
      requestType: 'ride',
      pickupAreaId: 'deori-hq',
      pickupAddress: 'Deori Shivaji Chowk',
      dropoffAreaId: 'chichgarh',
      dropoffAddress: 'Chichgarh Main Market',
      scheduledDate: '2026-10-22',
      scheduledTime: '09:30 AM',
      passengerCount: 3,
      contactName: 'Sunil Meshram',
      contactPhone: '9823456789',
      providerBusinessId: businessAId,
      notes: 'Traveling with luggage for weekly market.',
    }, userBHeaders);
    assert(rideRes.status === 201, 'Citizen B submits Ride request (Status: 201)');
    const rideId = rideRes.body?.transitRequest?.id;
    assert(rideRes.body?.transitRequest?.status === 'pending', 'Ride request status is "pending"');
    assert(rideRes.body?.transitRequest?.expiresInHours === 24, 'Configurable 24-hour expiry policy configured');

    // 4.2 Citizen B submits a Delivery request
    const deliveryRes = await request('POST', '/api/requests/transit', {
      requestType: 'delivery',
      pickupAreaId: 'deori-hq',
      pickupAddress: 'Kisan Seva Kendra, Deori',
      dropoffAddress: 'Gram Panchayat Office, Soundad',
      parcelCategory: 'produce_agri',
      parcelWeightKg: 15.5,
      parcelDescription: 'Certified paddy seeds packet (15kg)',
      recipientName: 'Kishore Wagh',
      recipientPhone: '9890123456',
      contactName: 'Sunil Meshram',
      contactPhone: '9823456789',
      providerBusinessId: businessAId,
    }, userBHeaders);
    assert(deliveryRes.status === 201, 'Citizen B submits Delivery request (Status: 201)');
    const deliveryId = deliveryRes.body?.transitRequest?.id;
    assert(deliveryRes.body?.transitRequest?.requestType === 'delivery', 'Distinct delivery request created');

    // 4.3 Operator accepts and completes the Ride request
    const acceptRideRes = await request('PATCH', `/api/requests/transit/${rideId}/status`, {
      status: 'accepted',
    }, userAHeaders);
    assert(acceptRideRes.status === 200, 'Operator accepts ride request (Status: accepted)');

    const inProgressRideRes = await request('PATCH', `/api/requests/transit/${rideId}/status`, {
      status: 'in_progress',
    }, userAHeaders);
    assert(inProgressRideRes.status === 200, 'Ride in progress (Status: in_progress)');

    const completeRideRes = await request('PATCH', `/api/requests/transit/${rideId}/status`, {
      status: 'completed',
    }, userAHeaders);
    assert(completeRideRes.status === 200, 'Ride marked completed (Status: completed)');

    // 4.4 User cancels delivery request
    const cancelDeliveryRes = await request('PATCH', `/api/requests/transit/${deliveryId}/cancel`, {
      reason: 'Arranged direct farmer transport',
    }, userBHeaders);
    assert(cancelDeliveryRes.status === 200, 'User cancels delivery request (Status: cancelled)');

    // ====================================================
    // MODULE 5: IN-APP NOTIFICATIONS INTEGRATION
    // ====================================================
    console.log('\n--- 5. IN-APP NOTIFICATIONS INTEGRATION ---');

    // 5.1 Citizen B checks notifications
    const notifRes = await request('GET', '/api/notifications', null, userBHeaders);
    assert(notifRes.status === 200, 'Citizen B retrieves notifications');
    assert(notifRes.body?.notifications?.length > 0, 'In-app notifications were created for status changes', `Count: ${notifRes.body?.notifications?.length}`);
    assert(notifRes.body?.unreadCount > 0, 'Unread notification count correctly calculated', `Unread: ${notifRes.body?.unreadCount}`);

    // 5.2 Mark single notification as read
    const firstNotifId = notifRes.body?.notifications[0]?.id;
    const markReadRes = await request('PATCH', `/api/notifications/${firstNotifId}/read`, {}, userBHeaders);
    assert(markReadRes.status === 200 && markReadRes.body?.success, 'Single notification marked as read');

    // 5.3 Mark all notifications as read
    const markAllReadRes = await request('POST', '/api/notifications/mark-all-read', {}, userBHeaders);
    assert(markAllReadRes.status === 200 && markAllReadRes.body?.success, 'All notifications marked as read');

    // Verify unread count is now 0
    const zeroNotifRes = await request('GET', '/api/notifications', null, userBHeaders);
    assert(zeroNotifRes.body?.unreadCount === 0, 'Unread count is 0 after mark-all-read');

    // ====================================================
    // MODULE 6: MY ACTIVITY AGGREGATOR DASHBOARD
    // ====================================================
    console.log('\n--- 6. MY ACTIVITY DASHBOARD AGGREGATION ---');

    // 6.1 Citizen B fetches unified My Activity
    const actRes = await request('GET', '/api/activity/my-activity', null, userBHeaders);
    assert(actRes.status === 200, 'GET /api/activity/my-activity returns aggregated user records');
    assert(actRes.body?.items?.length >= 5, 'Activity aggregates across jobs, enquiries, services, rides, and deliveries', `Found: ${actRes.body?.items?.length}`);
    assert(actRes.body?.summary?.total >= 5, 'Activity summary totals calculated correctly');

    // 6.2 Filter by module type: jobs
    const jobsActRes = await request('GET', '/api/activity/my-activity?type=jobs', null, userBHeaders);
    assert(jobsActRes.status === 200 && jobsActRes.body?.items?.every(i => i.itemType === 'jobs'), 'Activity filtered strictly to jobs');

    // 6.3 Filter by status: completed
    const completedActRes = await request('GET', '/api/activity/my-activity?status=completed', null, userBHeaders);
    assert(completedActRes.status === 200 && completedActRes.body?.items?.every(i => i.statusGroup === 'completed'), 'Activity filtered strictly to completed status');

    // 6.4 Data Isolation: User C (Intruder) has 0 records in My Activity
    const intruderActRes = await request('GET', '/api/activity/my-activity', null, userCHeaders);
    assert(intruderActRes.body?.items?.length === 0, 'User C sees 0 records (Strict User Activity Data Isolation Enforced)');

    // ====================================================
    // MODULE 7: BUSINESS WORKSPACE REQUEST QUEUE
    // ====================================================
    console.log('\n--- 7. BUSINESS WORKSPACE REQUEST QUEUE ---');

    // 7.1 Employer A retrieves requests queue for Business A
    const bizReqRes = await request('GET', `/api/business/${businessAId}/requests`, null, userAHeaders);
    assert(bizReqRes.status === 200, 'Employer A retrieves incoming request queue for Business A');
    assert(bizReqRes.body?.items?.length >= 5, 'Business queue aggregates customer applications, enquiries, services, and transit', `Count: ${bizReqRes.body?.items?.length}`);
    assert(bizReqRes.body?.summary?.total >= 5, 'Business queue summary statistics returned');

    // 7.2 Access control: User C blocked from viewing Business A's queue
    const intruderBizReqRes = await request('GET', `/api/business/${businessAId}/requests`, null, userCHeaders);
    assert(intruderBizReqRes.status === 403, 'Unauthorized User C blocked from viewing Business A requests queue (FORBIDDEN)', `Status: ${intruderBizReqRes.status}`);

    console.log('\n========================================================');
    console.log(` Summary: ${passed} passed, ${failed} failed out of ${passed + failed} assertions.`);
    console.log('========================================================');

    if (failed === 0) {
      console.log('ALL PHASE 4 USER ACTIVITY & REQUEST TRACKING ACCEPTANCE CRITERIA PASSED.');
      process.exit(0);
    } else {
      console.error('PHASE 4 ACCEPTANCE TESTS FAILED.');
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
