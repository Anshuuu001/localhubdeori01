import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import {
  ShieldCheck,
  FileCheck,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  Lock,
  Building,
  User,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export default function AdminVerificationsTab({ onActionTaken }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [targetType, setTargetType] = useState('all');
  const [badgeType, setBadgeType] = useState('all');
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');

  // Review Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Decision Form State
  const [decision, setDecision] = useState('approve');
  const [scope, setScope] = useState('general');
  const [reason, setReason] = useState('');
  const [actionNeededReason, setActionNeededReason] = useState('');
  const [expiryMonths, setExpiryMonths] = useState(12);
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminVerificationQueue({
        targetType,
        badgeType,
        status,
        search,
      });
      setRequests(res.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load verification requests.');
    } finally {
      setLoading(false);
    }
  }, [targetType, badgeType, status, search]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const openReviewModal = async (req) => {
    setSelectedReq(null);
    setReviewLoading(true);
    setDocumentUrl(null);
    setDecision('approve');
    setReason('');
    setActionNeededReason('');
    setDecisionError(null);

    try {
      const res = await api.getAdminVerificationDetail(req.id);
      setSelectedReq(res.request);
    } catch (err) {
      alert(`Failed to load request: ${err.message}`);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAccessDocument = async () => {
    if (!selectedReq) return;
    setLoadingDoc(true);
    try {
      const res = await api.accessAdminVerificationDocument(selectedReq.id);
      setDocumentUrl(res.documentUrl);
    } catch (err) {
      alert(`Failed to access document evidence: ${err.message}`);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    if ((decision === 'reject' || decision === 'suspend') && (!reason || reason.trim().length < 5)) {
      setDecisionError('A clear justification is required for rejection or suspension.');
      return;
    }

    if (decision === 'action_needed' && (!actionNeededReason || actionNeededReason.trim().length < 5)) {
      setDecisionError('Instructions for the applicant are required.');
      return;
    }

    setSubmitting(true);
    setDecisionError(null);

    try {
      await api.recordAdminVerificationDecision(selectedReq.id, {
        decision,
        reason,
        scope,
        actionNeededReason,
        expiryMonths: parseInt(expiryMonths, 10),
      });

      setSelectedReq(null);
      fetchQueue();
      if (onActionTaken) onActionTaken();
    } catch (err) {
      setDecisionError(err.message || 'Failed to record verification decision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters Bar */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            style={{
              background: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-border)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Targets (User, Business, Professional)</option>
            <option value="business">Business Profile</option>
            <option value="professional">Professional Credentials</option>
            <option value="user">Individual Citizen</option>
          </select>

          <select
            value={badgeType}
            onChange={(e) => setBadgeType(e.target.value)}
            style={{
              background: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-border)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Badge Types</option>
            <option value="business_verified">Business Verified (Shop Act / Udyam)</option>
            <option value="professional_verified">Professional Credentials (ITI / Trade)</option>
            <option value="phone_verified">Phone Verified</option>
            <option value="identity_verified">Identity Verified</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              background: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-border)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <option value="pending">Pending Review</option>
            <option value="action_needed">Action Needed</option>
            <option value="approved">Approved / Verified</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended / Revoked</option>
            <option value="all">All Lifecycle States</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Search applicant / business..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'var(--surface-subtle)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            minWidth: '220px',
          }}
        />
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'var(--status-crimson-bg)', color: '#f87171', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Requests Table / Cards */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <span>Loading verification queue...</span>
        </div>
      ) : requests.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
          }}
        >
          <CheckCircle2 size={36} style={{ color: 'var(--status-emerald)', margin: '0 auto 12px' }} />
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Verification Desk Up to Date</h4>
          <p style={{ fontSize: '0.82rem' }}>No verification requests currently matching this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: 'var(--status-emerald)',
                    }}
                  >
                    {r.badge_type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background:
                        r.status === 'approved'
                          ? 'var(--status-emerald-bg)'
                          : r.status === 'action_needed'
                          ? 'var(--status-amber-bg)'
                          : r.status === 'rejected'
                          ? 'var(--status-crimson-bg)'
                          : 'rgba(56, 189, 248, 0.1)',
                      color:
                        r.status === 'approved'
                          ? 'var(--status-emerald)'
                          : r.status === 'action_needed'
                          ? 'var(--status-amber)'
                          : r.status === 'rejected'
                          ? 'var(--status-crimson)'
                          : 'var(--brand-electric)',
                    }}
                  >
                    {r.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Doc: {r.document_type.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {r.target_type === 'business' ? r.business_name : r.requester_name}
                </div>

                <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>Applicant: {r.requester_name}</span>
                  {r.document_reference_masked && (
                    <span style={{ fontFamily: 'monospace' }}>Reg Ref: {r.document_reference_masked}</span>
                  )}
                  <span>Submitted: {new Date(r.created_at).toLocaleDateString()}</span>
                  {r.reviewer_name && <span>Reviewer: {r.reviewer_name}</span>}
                </div>
              </div>

              <div>
                <button
                  onClick={() => openReviewModal(r)}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <ShieldCheck size={15} />
                  <span>Inspect & Decide</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review & Badge Issuance Modal */}
      {selectedReq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '740px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <button
              onClick={() => setSelectedReq(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--status-emerald)', fontWeight: 700, textTransform: 'uppercase' }}>
                Verification Governance Desk
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {selectedReq.target_type === 'business' ? selectedReq.business_name : selectedReq.requester_name}
              </h3>
            </div>

            {/* Applicant Metadata & Evidence Box */}
            <div
              style={{
                background: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div><strong>Badge Type:</strong> {selectedReq.badge_type}</div>
              <div><strong>Document Type:</strong> {selectedReq.document_type}</div>
              {selectedReq.document_reference_masked && (
                <div><strong>Registration Number (Masked):</strong> {selectedReq.document_reference_masked}</div>
              )}
              {selectedReq.business_address && (
                <div><strong>Business Location:</strong> {selectedReq.business_address}</div>
              )}

              {/* Secure Document Access (Rule D: Logged & Protected) */}
              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--surface-border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Lock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Accessing evidence is strictly logged in audit trail for compliance.
                </div>
                {!documentUrl ? (
                  <button
                    type="button"
                    onClick={handleAccessDocument}
                    disabled={loadingDoc}
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    {loadingDoc ? 'Logging Access...' : 'Inspect Secure Document Evidence'}
                  </button>
                ) : (
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>View Evidence File</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Verification Decision Form */}
            <form onSubmit={handleSubmitDecision} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Verification Decision:
                </label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="approve">Approve & Issue Verification Badge</option>
                  <option value="action_needed">Action Needed (Request Additional Proof)</option>
                  <option value="reject">Reject Verification Request</option>
                  <option value="suspend">Suspend / Revoke Existing Badge</option>
                </select>
              </div>

              {decision === 'approve' && (
                <>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      Approved Trade / Establishment Scope:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. retail_krishi_merchant, residential_landlord, licensed_electrician"
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      Badge Validity Duration (Months before renewal review):
                    </label>
                    <select
                      value={expiryMonths}
                      onChange={(e) => setExpiryMonths(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <option value="6">6 Months (Temporary / Probationary)</option>
                      <option value="12">12 Months (Standard Annual Registration)</option>
                      <option value="24">24 Months (Multi-Year Trade Licence)</option>
                      <option value="0">Indefinite (Phone / Identity Proof Only)</option>
                    </select>
                  </div>
                </>
              )}

              {decision === 'action_needed' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Action Required from Applicant:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Clearly explain what document or clarification is required to complete verification..."
                    value={actionNeededReason}
                    onChange={(e) => setActionNeededReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                    required
                  />
                </div>
              )}

              {(decision === 'reject' || decision === 'suspend') && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Documented Reason for {decision.toUpperCase()}:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific reason (e.g. invalid certificate number, expired shop act, trade mismatch)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                    required
                  />
                </div>
              )}

              {decisionError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '8px 12px', background: 'var(--status-crimson-bg)', borderRadius: 'var(--radius-md)' }}>
                  {decisionError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{
                    padding: '10px 22px',
                    fontSize: '0.85rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    background:
                      decision === 'approve'
                        ? 'var(--status-emerald)'
                        : decision === 'action_needed'
                        ? 'var(--status-amber)'
                        : 'var(--status-crimson)',
                  }}
                >
                  {submitting ? 'Applying Decision...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
