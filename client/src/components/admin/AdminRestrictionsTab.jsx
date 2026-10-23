import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  X,
  FileText,
  User,
  ShieldAlert,
} from 'lucide-react';

export default function AdminRestrictionsTab({ onActionTaken }) {
  const [subTab, setSubTab] = useState('restrictions'); // 'restrictions' | 'new_restriction' | 'appeals'

  // Restrictions list
  const [restrictions, setRestrictions] = useState([]);
  const [loadingRestr, setLoadingRestr] = useState(true);

  // Appeals list
  const [appeals, setAppeals] = useState([]);
  const [loadingAppeals, setLoadingAppeals] = useState(false);

  // Impose restriction form state
  const [userId, setUserId] = useState('');
  const [targetType, setTargetType] = useState('user_account');
  const [targetId, setTargetId] = useState('');
  const [restrictionType, setRestrictionType] = useState('warning');
  const [reasonCategory, setReasonCategory] = useState('fraudulent_listing');
  const [publicReason, setPublicReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [affectedScope, setAffectedScope] = useState('create_listings');
  const [expiryDays, setExpiryDays] = useState(14);
  const [submittingRestr, setSubmittingRestr] = useState(false);
  const [restrError, setRestrError] = useState(null);
  const [restrSuccess, setRestrSuccess] = useState(null);

  // Reassess / Lift modal
  const [reassessItem, setReassessItem] = useState(null);
  const [liftReason, setLiftReason] = useState('');
  const [submittingReassess, setSubmittingReassess] = useState(false);

  // Appeal review modal
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [appealDecision, setAppealDecision] = useState('uphold');
  const [appealNotes, setAppealNotes] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealError, setAppealError] = useState(null);

  const fetchRestrictions = useCallback(async () => {
    setLoadingRestr(true);
    try {
      const res = await api.getAdminRestrictions({ status: 'all' });
      setRestrictions(res.restrictions || []);
    } catch (err) {
      console.warn('Failed to load restrictions:', err);
    } finally {
      setLoadingRestr(false);
    }
  }, []);

  const fetchAppeals = useCallback(async () => {
    setLoadingAppeals(true);
    try {
      const res = await api.getAdminAppeals({ status: 'all' });
      setAppeals(res.appeals || []);
    } catch (err) {
      console.warn('Failed to load appeals:', err);
    } finally {
      setLoadingAppeals(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'restrictions') fetchRestrictions();
    if (subTab === 'appeals') fetchAppeals();
  }, [subTab, fetchRestrictions, fetchAppeals]);

  const handleCreateRestriction = async (e) => {
    e.preventDefault();
    setSubmittingRestr(true);
    setRestrError(null);
    setRestrSuccess(null);

    try {
      const res = await api.createAdminRestriction({
        userId: userId.trim(),
        targetType,
        targetId: targetId.trim(),
        restrictionType,
        reasonCategory,
        publicReason: publicReason.trim(),
        internalNotes: internalNotes.trim(),
        affectedScope: affectedScope.trim(),
        expiryDays: expiryDays ? parseInt(expiryDays, 10) : null,
      });

      setRestrSuccess(`Restriction imposed successfully (ID: ${res.id}). 30-day appeal window active.`);
      setPublicReason('');
      setInternalNotes('');
      fetchRestrictions();
      if (onActionTaken) onActionTaken();
    } catch (err) {
      setRestrError(err.message || 'Failed to impose restriction.');
    } finally {
      setSubmittingRestr(false);
    }
  };

  const handleLiftRestriction = async (e) => {
    e.preventDefault();
    if (!reassessItem || !liftReason.trim()) return;

    setSubmittingReassess(true);
    try {
      await api.reassessAdminRestriction(reassessItem.id, {
        action: 'lift',
        liftReason: liftReason.trim(),
      });
      setReassessItem(null);
      setLiftReason('');
      fetchRestrictions();
      if (onActionTaken) onActionTaken();
    } catch (err) {
      alert(`Error lifting restriction: ${err.message}`);
    } finally {
      setSubmittingReassess(false);
    }
  };

  const handleReviewAppeal = async (e) => {
    e.preventDefault();
    if (!selectedAppeal || !appealNotes.trim()) return;

    setSubmittingAppeal(true);
    setAppealError(null);

    try {
      await api.reviewAdminAppeal(selectedAppeal.id, {
        decision: appealDecision,
        decisionNotes: appealNotes.trim(),
        liftReason: appealDecision === 'lift' ? appealNotes.trim() : null,
      });

      setSelectedAppeal(null);
      setAppealNotes('');
      fetchAppeals();
      fetchRestrictions();
      if (onActionTaken) onActionTaken();
    } catch (err) {
      setAppealError(err.message || 'Failed to record appeal decision.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sub-navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '1px solid var(--surface-border)',
          paddingBottom: '12px',
        }}
      >
        <button
          onClick={() => setSubTab('restrictions')}
          className={`btn-secondary ${subTab === 'restrictions' ? 'active' : ''}`}
          style={{
            padding: '8px 16px',
            fontSize: '0.82rem',
            background: subTab === 'restrictions' ? 'var(--brand-blue-bg)' : 'transparent',
            borderColor: subTab === 'restrictions' ? 'var(--brand-electric)' : 'var(--surface-border)',
            color: subTab === 'restrictions' ? 'var(--brand-electric)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Active Restrictions ({restrictions.filter((r) => r.status === 'active').length})
        </button>

        <button
          onClick={() => setSubTab('appeals')}
          className={`btn-secondary ${subTab === 'appeals' ? 'active' : ''}`}
          style={{
            padding: '8px 16px',
            fontSize: '0.82rem',
            background: subTab === 'appeals' ? 'var(--brand-blue-bg)' : 'transparent',
            borderColor: subTab === 'appeals' ? 'var(--brand-electric)' : 'var(--surface-border)',
            color: subTab === 'appeals' ? 'var(--brand-electric)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Citizen Appeals Queue ({appeals.filter((a) => a.status === 'submitted').length})
        </button>

        <button
          onClick={() => setSubTab('new_restriction')}
          className={`btn-secondary ${subTab === 'new_restriction' ? 'active' : ''}`}
          style={{
            padding: '8px 16px',
            fontSize: '0.82rem',
            background: subTab === 'new_restriction' ? 'var(--brand-blue-bg)' : 'transparent',
            borderColor: subTab === 'new_restriction' ? 'var(--brand-electric)' : 'var(--surface-border)',
            color: subTab === 'new_restriction' ? 'var(--brand-electric)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <PlusCircle size={14} />
          <span>Impose Protective Restriction</span>
        </button>
      </div>

      {/* Tab 1: Restrictions List */}
      {subTab === 'restrictions' && (
        <div>
          {loadingRestr ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <span>Loading restrictions catalog...</span>
            </div>
          ) : restrictions.length === 0 ? (
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
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No Active Restrictions</h4>
              <p style={{ fontSize: '0.82rem' }}>All accounts and listings are operating within guidelines.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {restrictions.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--surface-card)',
                    border: `1px solid ${r.status === 'active' ? 'rgba(239, 68, 68, 0.3)' : 'var(--surface-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '650px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: r.status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-subtle)',
                          color: r.status === 'active' ? 'var(--status-crimson)' : 'var(--text-muted)',
                        }}
                      >
                        {r.restriction_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--surface-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {r.target_type}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Status: <strong>{r.status}</strong>
                      </span>
                    </div>

                    <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Restricted User: {r.user_name} ({r.user_email || r.user_phone})
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      <strong>Reason:</strong> {r.public_reason}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <span>Affected Scope: {r.affected_scope}</span>
                      <span>Restricted by: {r.restricted_by_name}</span>
                      <span>Appeal Window Ends: {new Date(r.appeal_window_ends_at).toLocaleDateString()}</span>
                      {r.expires_at && <span>Expires: {new Date(r.expires_at).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  {r.status === 'active' && (
                    <div>
                      <button
                        onClick={() => setReassessItem(r)}
                        className="btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer' }}
                      >
                        Reassess / Lift
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Citizen Appeals Queue */}
      {subTab === 'appeals' && (
        <div>
          {loadingAppeals ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <span>Loading citizen appeals...</span>
            </div>
          ) : appeals.length === 0 ? (
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
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No Pending Appeals</h4>
              <p style={{ fontSize: '0.82rem' }}>All submitted citizen appeals have been adjudicated.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appeals.map((a) => (
                <div
                  key={a.id}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '650px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: a.is_late_appeal ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.12)',
                          color: a.is_late_appeal ? 'var(--status-crimson)' : 'var(--brand-electric)',
                        }}
                      >
                        {a.is_late_appeal ? 'LATE APPEAL WITH JUSTIFICATION' : 'STANDARD 30-DAY APPEAL'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: a.status === 'upheld' ? 'var(--status-crimson-bg)' : a.status === 'lifted' ? 'var(--status-emerald-bg)' : 'var(--status-amber-bg)',
                          color: a.status === 'upheld' ? 'var(--status-crimson)' : a.status === 'lifted' ? 'var(--status-emerald)' : 'var(--status-amber)',
                        }}
                      >
                        {a.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Appellant: {a.appellant_name} ({a.appellant_email || a.appellant_phone})
                    </div>

                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      <strong>Appeal Reason:</strong> {a.appeal_reason}
                    </div>

                    {a.supporting_evidence && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <strong>Evidence:</strong> {a.supporting_evidence}
                      </div>
                    )}

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '14px' }}>
                      <span>Submitted: {new Date(a.created_at).toLocaleDateString()}</span>
                      <span>Originally restricted by: {a.original_restricter_name}</span>
                      {a.reviewer_name && <span>Adjudicated by: {a.reviewer_name}</span>}
                    </div>
                  </div>

                  {a.status === 'submitted' && (
                    <div>
                      <button
                        onClick={() => {
                          setSelectedAppeal(a);
                          setAppealDecision('uphold');
                          setAppealNotes('');
                        }}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer' }}
                      >
                        Review Appeal
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Impose New Restriction Form */}
      {subTab === 'new_restriction' && (
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            maxWidth: '680px',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Impose Proportionate Administrative Restriction
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Enforces server-side restrictions with automatic 30-day appeal rights. No reporter details or internal security signals will be exposed.
            </p>
          </div>

          {restrSuccess && (
            <div style={{ padding: '12px', background: 'var(--status-emerald-bg)', color: 'var(--status-emerald)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.82rem' }}>
              {restrSuccess}
            </div>
          )}

          {restrError && (
            <div style={{ padding: '12px', background: 'var(--status-crimson-bg)', color: '#f87171', borderRadius: '8px', marginBottom: '16px', fontSize: '0.82rem' }}>
              {restrError}
            </div>
          )}

          <form onSubmit={handleCreateRestriction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Target User ID (UUID):
                </label>
                <input
                  type="text"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
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
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Target Type:
                </label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                >
                  <option value="user_account">User Account</option>
                  <option value="listing">Listing Item</option>
                  <option value="business_profile">Business Profile</option>
                  <option value="feature_posting">Posting Capability</option>
                  <option value="emergency_protective">Emergency Protective Action</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Target ID (Entity UUID / user ID):
                </label>
                <input
                  type="text"
                  placeholder="Target record identifier..."
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
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
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Restriction Action:
                </label>
                <select
                  value={restrictionType}
                  onChange={(e) => setRestrictionType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                >
                  <option value="warning">Formal Warning / Notice</option>
                  <option value="listing_hold">Listing Hold (Pending Verification)</option>
                  <option value="listing_removal">Listing Removal (Direct Violation)</option>
                  <option value="feature_restriction">Feature Restriction</option>
                  <option value="account_suspension">Account Suspension</option>
                  <option value="emergency_protective_action">Emergency Protective Action</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Reason Category:
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                }}
              >
                <option value="fraudulent_listing">Fraudulent or Misleading Listing</option>
                <option value="misleading_pricing">Predatory Job Fees or Deceptive Pricing</option>
                <option value="unauthorized_emergency_claim">Unauthorized Emergency or Helpline Claims</option>
                <option value="policy_violation">Community Policy Violation</option>
                <option value="safety_protection">Urgent Public Safety Protection</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Public Reason (Visible to user in notice):
              </label>
              <textarea
                rows={3}
                placeholder="Clearly state the reason for this restriction. Do not disclose reporter identities or internal security signals."
                value={publicReason}
                onChange={(e) => setPublicReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Affected Scope:
                </label>
                <input
                  type="text"
                  placeholder="e.g. create_listings, service_bookings, account_access"
                  value={affectedScope}
                  onChange={(e) => setAffectedScope(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
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
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Expiry Duration (Days):
                </label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                >
                  <option value="7">7 Days (Temporary Hold)</option>
                  <option value="14">14 Days (Standard Review Period)</option>
                  <option value="30">30 Days (Full Appeal Window)</option>
                  <option value="90">90 Days (Extended Suspension)</option>
                  <option value="">Indefinite (Until Documented Appeal Adjudication)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={submittingRestr}
                className="btn-primary"
                style={{
                  padding: '10px 24px',
                  background: 'var(--status-crimson)',
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  fontSize: '0.85rem',
                  cursor: submittingRestr ? 'not-allowed' : 'pointer',
                }}
              >
                {submittingRestr ? 'Enforcing...' : 'Impose Restriction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reassess / Lift Modal */}
      {reassessItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
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
              maxWidth: '540px',
              width: '100%',
              padding: '24px',
              position: 'relative',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Lift Restriction
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Lifting will restore active account or listing status in MySQL. A documented reason is required.
            </p>

            <form onSubmit={handleLiftRestriction}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Reason for Lifting Restriction:
                </label>
                <textarea
                  rows={3}
                  placeholder="Document why this restriction is being lifted..."
                  value={liftReason}
                  onChange={(e) => setLiftReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setReassessItem(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReassess}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', cursor: submittingReassess ? 'not-allowed' : 'pointer' }}
                >
                  {submittingReassess ? 'Lifting...' : 'Confirm Lift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Appeal Modal */}
      {selectedAppeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
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
              maxWidth: '600px',
              width: '100%',
              padding: '24px',
              position: 'relative',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Adjudicate Citizen Appeal
            </h3>
            <div style={{ background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.8rem' }}>
              <div><strong>Appellant:</strong> {selectedAppeal.appellant_name}</div>
              <div><strong>Appeal Reason:</strong> {selectedAppeal.appeal_reason}</div>
              {selectedAppeal.supporting_evidence && <div><strong>Evidence:</strong> {selectedAppeal.supporting_evidence}</div>}
            </div>

            <form onSubmit={handleReviewAppeal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Appeal Decision:
                </label>
                <select
                  value={appealDecision}
                  onChange={(e) => setAppealDecision(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                >
                  <option value="uphold">Uphold Restriction (Reject Appeal)</option>
                  <option value="lift">Lift Restriction (Accept Appeal & Restore Account/Item)</option>
                  <option value="modify">Modify Restriction (Adjust Scope or Duration)</option>
                  <option value="info_requested">Request More Information from Appellant</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Decision Findings & Adjudication Notes:
                </label>
                <textarea
                  rows={3}
                  placeholder="Document findings and justification for appeal outcome..."
                  value={appealNotes}
                  onChange={(e) => setAppealNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                  required
                />
              </div>

              {appealError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '8px', background: 'var(--status-crimson-bg)', borderRadius: '6px' }}>
                  {appealError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAppeal(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', cursor: submittingAppeal ? 'not-allowed' : 'pointer' }}
                >
                  {submittingAppeal ? 'Adjudicating...' : 'Confirm Adjudication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
