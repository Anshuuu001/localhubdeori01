const API_BASE = '/api';

let activeCsrfToken = null;

export function setCsrfToken(token) {
  activeCsrfToken = token;
}

function getStoredCsrf() {
  if (activeCsrfToken) return activeCsrfToken;
  try {
    const match = document.cookie.split('; ').find(row => row.startsWith('lhx_csrf='));
    return match ? match.split('=')[1] : null;
  } catch {
    return null;
  }
}

/**
 * Standard fetch wrapper with timeout, credentials, CSRF, and JSON parsing.
 */
async function request(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const isFormData = options.body instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };


  const csrf = getStoredCsrf();
  if (csrf && !headers['X-CSRF-Token']) {
    headers['X-CSRF-Token'] = csrf;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message = body?.error?.message || `HTTP error ${res.status}: ${res.statusText}`;
      const err = new Error(message);
      err.code = body?.error?.code || 'REQUEST_FAILED';
      err.status = res.status;
      err.details = body?.error || body;
      throw err;
    }

    // Capture CSRF if provided in response
    if (body?.csrfToken) {
      activeCsrfToken = body.csrfToken;
    }

    return body;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Server request timed out. Please verify backend service.');
      timeoutErr.code = 'TIMEOUT';
      throw timeoutErr;
    }
    throw err;
  }
}

export const api = {
  // Phase 1 Foundation
  getHealth: () => request('/health'),
  getModules: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/modules${query ? `?${query}` : ''}`);
  },
  getModuleBySlug: (slug) => request(`/modules/${slug}`),
  getAreas: () => request('/areas'),
  getEmergencyStatus: () => request('/emergency/status'),

  // Phase 2 Authentication & Security
  getCsrf: () => request('/auth/csrf'),
  getMe: () => request('/auth/me'),
  getProvidersStatus: () => request('/auth/providers'),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  requestOtp: (data) => request('/auth/otp/request', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (data) => request('/auth/otp/verify', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  reauth: (data) => request('/auth/reauth', { method: 'POST', body: JSON.stringify(data) }),
  linkIdentifier: (data) => request('/auth/link-identifier', { method: 'POST', body: JSON.stringify(data) }),
  requestPasswordRecovery: (data) => request('/auth/password-recovery/request', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data) => request('/auth/password-recovery/reset', { method: 'POST', body: JSON.stringify(data) }),
  submitAccountRecovery: (data) => request('/auth/recovery-request', { method: 'POST', body: JSON.stringify(data) }),

  // Phase 2 Sessions
  listSessions: () => request('/sessions'),
  revokeSession: (sessionId) => request(`/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeOtherSessions: () => request('/sessions/others', { method: 'DELETE' }),

  // Phase 2 Account Profile & Deletion Grace Period
  getAccountProfile: () => request('/account/profile'),
  updateAccountProfile: (data) => request('/account/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  unlinkIdentifier: (data) => request('/account/unlink-identifier', { method: 'POST', body: JSON.stringify(data) }),
  requestAccountDeletion: (data) => request('/account/deletion/request', { method: 'POST', body: JSON.stringify(data) }),
  cancelAccountDeletion: () => request('/account/deletion/cancel', { method: 'POST' }),

  // Phase 2 Business Architecture
  listBusinesses: () => request('/business'),
  getBusiness: (id) => request(`/business/${id}`),
  createBusiness: (data) => request('/business', { method: 'POST', body: JSON.stringify(data) }),
  updateBusiness: (id, data) => request(`/business/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listBranches: (businessId) => request(`/business/${businessId}/branches`),
  createBranch: (businessId, data) => request(`/business/${businessId}/branches`, { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (businessId, branchId, data) => request(`/business/${businessId}/branches/${branchId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBranch: (businessId, branchId) => request(`/business/${businessId}/branches/${branchId}`, { method: 'DELETE' }),
  listTeamMembers: (businessId) => request(`/business/${businessId}/team`),
  listRoles: (businessId) => request(`/business/${businessId}/roles`),
  inviteTeamMember: (businessId, data) => request(`/business/${businessId}/team/invite`, { method: 'POST', body: JSON.stringify(data) }),
  updateMemberRole: (businessId, memberId, data) => request(`/business/${businessId}/team/${memberId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeTeamMember: (businessId, memberId) => request(`/business/${businessId}/team/${memberId}`, { method: 'DELETE' }),
  listBusinessInvitations: (businessId) => request(`/business/${businessId}/invitations`),
  revokeInvitation: (businessId, invitationId) => request(`/business/${businessId}/invitations/${invitationId}`, { method: 'DELETE' }),
  initiateOwnershipTransfer: (businessId, data) => request(`/business/${businessId}/transfer/initiate`, { method: 'POST', body: JSON.stringify(data) }),
  cancelOwnershipTransfer: (businessId, transferId) => request(`/business/${businessId}/transfer/${transferId}/cancel`, { method: 'POST' }),
  acceptOwnershipTransfer: (businessId, transferId) => request(`/business/${businessId}/transfer/${transferId}/accept`, { method: 'POST' }),

  // Invitations
  getMyInvitations: () => request('/invitations/my-invitations'),
  respondToInvitation: (invitationId, action) => request(`/invitations/${invitationId}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),

  // Phase 3 Core Marketplace & Modules
  getListings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/listings${query ? `?${query}` : ''}`);
  },
  getListing: (id) => request(`/listings/${id}`),
  getBusinessListings: (businessId) => request(`/listings/business/${businessId}`),
  createListing: (data) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),
  updateListing: (id, data) => request(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateListingAvailability: (id, availabilityStatus) =>
    request(`/listings/${id}/availability`, { method: 'PATCH', body: JSON.stringify({ availabilityStatus }) }),
  updateListingStatus: (id, status) =>
    request(`/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteListing: (id) => request(`/listings/${id}`, { method: 'DELETE' }),

  // Phase 3 Business Directory
  getDirectory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/directory${query ? `?${query}` : ''}`);
  },
  getDirectoryBusiness: (id) => request(`/directory/${id}`),

  // Phase 3 Reporting & Moderation
  submitReport: (data) => request('/reports', { method: 'POST', body: JSON.stringify(data) }),
  getPendingModeration: () => request('/reports/moderation/pending'),
  reviewListing: (listingId, data) =>
    request(`/reports/moderation/review/${listingId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Phase 3 Media Uploads
  uploadImages: (formData) => request('/uploads', { method: 'POST', body: formData }),

  // Phase 4: Job Applications
  applyForJob: (data) => request('/requests/jobs', { method: 'POST', body: JSON.stringify(data) }),
  getJobApplication: (id) => request(`/requests/jobs/${id}`),
  withdrawJobApplication: (id, reason) =>
    request(`/requests/jobs/${id}/withdraw`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  updateJobApplicationStatus: (id, data) =>
    request(`/requests/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Phase 4: Listing Enquiries
  submitEnquiry: (data) => request('/requests/enquiries', { method: 'POST', body: JSON.stringify(data) }),
  getEnquiry: (id) => request(`/requests/enquiries/${id}`),
  cancelEnquiry: (id, reason) =>
    request(`/requests/enquiries/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  markEnquiryViewed: (id) => request(`/requests/enquiries/${id}/view`, { method: 'PATCH' }),
  respondToEnquiry: (id, responseMessage) =>
    request(`/requests/enquiries/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ responseMessage }) }),
  closeEnquiry: (id, reason) =>
    request(`/requests/enquiries/${id}/close`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // Phase 4: Local Service Requests
  submitServiceRequest: (data) => request('/requests/services', { method: 'POST', body: JSON.stringify(data) }),
  getServiceRequest: (id) => request(`/requests/services/${id}`),
  cancelServiceRequest: (id, reason) =>
    request(`/requests/services/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  updateServiceRequestStatus: (id, data) =>
    request(`/requests/services/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Phase 4: Transit Requests (Rides & Deliveries)
  submitTransitRequest: (data) => request('/requests/transit', { method: 'POST', body: JSON.stringify(data) }),
  getTransitRequest: (id) => request(`/requests/transit/${id}`),
  cancelTransitRequest: (id, reason) =>
    request(`/requests/transit/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  updateTransitRequestStatus: (id, data) =>
    request(`/requests/transit/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Phase 4: My Activity Dashboard
  getMyActivity: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/activity/my-activity${query ? `?${query}` : ''}`);
  },

  // Phase 4: Business Workspace Requests Queue
  getBusinessRequests: (businessId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/business/${businessId}/requests${query ? `?${query}` : ''}`);
  },

  // Phase 4: In-App Notifications
  getNotifications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/notifications${query ? `?${query}` : ''}`);
  },
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),

  // Phase 5: Events Desk
  getEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/events${query ? `?${query}` : ''}`);
  },
  getEvent: (id) => request(`/events/${id}`),
  submitEvent: (data) => request('/events', { method: 'POST', body: JSON.stringify(data) }),
  cancelEvent: (id, reason) =>
    request(`/events/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  respondToEvent: (id, responseType) =>
    request(`/events/${id}/respond`, { method: 'POST', body: JSON.stringify({ responseType }) }),
  getPendingEvents: () => request('/events/moderation/pending'),
  reviewEvent: (id, data) =>
    request(`/events/moderation/review/${id}`, { method: 'POST', body: JSON.stringify(data) }),

  // Phase 5: Taluka News Feed
  getNews: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/news${query ? `?${query}` : ''}`);
  },
  getNewsArticle: (id) => request(`/news/${id}`),
  submitNews: (data) => request('/news', { method: 'POST', body: JSON.stringify(data) }),
  submitNewsCorrection: (id, data) =>
    request(`/news/${id}/corrections`, { method: 'POST', body: JSON.stringify(data) }),
  getPendingNews: () => request('/news/moderation/pending'),
  reviewNews: (id, data) =>
    request(`/news/moderation/review/${id}`, { method: 'POST', body: JSON.stringify(data) }),
  getNewsCorrections: () => request('/news/corrections/queue'),
  reviewNewsCorrection: (id, data) =>
    request(`/news/corrections/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),

  // Phase 5: Government Notices
  getGovtNotices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/notices${query ? `?${query}` : ''}`);
  },
  getGovtNotice: (id) => request(`/notices/${id}`),
  submitGovtNotice: (data) => request('/notices', { method: 'POST', body: JSON.stringify(data) }),
  getPendingGovtNotices: () => request('/notices/moderation/pending'),
  verifyGovtNotice: (id, data) =>
    request(`/notices/moderation/verify/${id}`, { method: 'POST', body: JSON.stringify(data) }),

  // Phase 5: Emergency & Important Contacts
  getEmergencyStatus: () => request('/emergency/status'),
  getEmergencyContacts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/emergency/contacts${query ? `?${query}` : ''}`);
  },
  getEmergencyContact: (id) => request(`/emergency/contacts/${id}`),
  createEmergencyContact: (data) => request('/emergency/contacts', { method: 'POST', body: JSON.stringify(data) }),
  updateEmergencyContact: (id, data) =>
    request(`/emergency/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  submitEmergencyContactReport: (id, data) =>
    request(`/emergency/contacts/${id}/report`, { method: 'POST', body: JSON.stringify(data) }),
  getEmergencyContactReports: () => request('/emergency/reports/queue'),
  reviewEmergencyContactReport: (id, data) =>
    request(`/emergency/reports/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),

  // Phase 6: Admin Panel, Moderation, Verification & Governance
  getAdminSummary: () => request('/admin/summary'),
  getAdminModerationQueue: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/moderation/queue${query ? `?${query}` : ''}`);
  },
  getAdminModerationDetail: (module, id) => request(`/admin/moderation/item/${module}/${id}`),
  recordAdminModerationDecision: (data) =>
    request('/admin/moderation/decision', { method: 'POST', body: JSON.stringify(data) }),
  
  getAdminVerificationQueue: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/verifications/queue${query ? `?${query}` : ''}`);
  },
  getAdminVerificationDetail: (id) => request(`/admin/verifications/${id}`),
  accessAdminVerificationDocument: (id) => request(`/admin/verifications/${id}/document`),
  recordAdminVerificationDecision: (id, data) =>
    request(`/admin/verifications/${id}/decision`, { method: 'POST', body: JSON.stringify(data) }),
  
  getAdminReportsQueue: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/reports/queue${query ? `?${query}` : ''}`);
  },
  reviewAdminReport: (id, data) =>
    request(`/admin/reports/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
  
  getAdminRestrictions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/restrictions${query ? `?${query}` : ''}`);
  },
  createAdminRestriction: (data) =>
    request('/admin/restrictions', { method: 'POST', body: JSON.stringify(data) }),
  reassessAdminRestriction: (id, data) =>
    request(`/admin/restrictions/${id}/reassess`, { method: 'PATCH', body: JSON.stringify(data) }),
  
  getAdminAppeals: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/appeals${query ? `?${query}` : ''}`);
  },
  reviewAdminAppeal: (id, data) =>
    request(`/admin/appeals/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
  
  getAdminAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },
  listAdminUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users${query ? `?${query}` : ''}`);
  },
  updateAdminUserRole: (id, data) =>
    request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAdminPermissions: () => request('/admin/permissions'),
  getAdminUserPermissions: (id) => request(`/admin/users/${id}/permissions`),
  updateAdminUserPermissions: (id, data) =>
    request(`/admin/users/${id}/permissions`, { method: 'POST', body: JSON.stringify(data) }),

  // Phase 6 Citizen Verifications & Appeals
  submitVerificationRequest: (data) =>
    request('/verifications/submit', { method: 'POST', body: JSON.stringify(data) }),
  getTargetBadges: (targetType, targetId) => request(`/verifications/badges/${targetType}/${targetId}`),
  submitRestrictionAppeal: (restrictionId, data) =>
    request(`/restrictions/${restrictionId}/appeal`, { method: 'POST', body: JSON.stringify(data) }),

  // Phase 7 Universal Search, Saved Items, Preferences & Discovery
  search: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/search${query ? `?${query}` : ''}`);
  },
  getSearchSuggestions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/search/suggestions${query ? `?${query}` : ''}`);
  },
  getSearchHistory: () => request('/search/history'),
  clearSearchHistory: () => request('/search/history', { method: 'DELETE' }),

  getSavedItems: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/saved-items${query ? `?${query}` : ''}`);
  },
  saveItem: (data) => request('/saved-items', { method: 'POST', body: JSON.stringify(data) }),
  unsaveItem: (id) => request(`/saved-items/${id}`, { method: 'DELETE' }),
  unsaveItemByTarget: (itemType, itemId) =>
    request(`/saved-items/target/${itemType}/${itemId}`, { method: 'DELETE' }),
  checkItemSaved: (itemType, itemId) => request(`/saved-items/check/${itemType}/${itemId}`),

  getUserPreferences: () => request('/account/preferences'),
  updateUserPreferences: (data) =>
    request('/account/preferences', { method: 'PUT', body: JSON.stringify(data) }),

  getDiscoveryFeed: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/discovery/feed${query ? `?${query}` : ''}`);
  },
};


