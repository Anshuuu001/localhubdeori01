import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Building,
  Check,
  Ban,
  Clock,
  Layers,
} from 'lucide-react';

export default function AccountModal() {
  const {
    isAccountModalOpen,
    setIsAccountModalOpen,
    user,
    setUser,
    handleLogout,
    incomingInvitations,
    refreshInvitations,
    refreshBusinesses,
  } = useApp();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'sessions' | 'linking' | 'privacy' | 'invitations'

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Profile edit
  const [editName, setEditName] = useState(user?.fullName || '');

  // Linking state
  const [linkChannel, setLinkChannel] = useState('phone'); // 'phone' | 'email'
  const [linkIdentifier, setLinkIdentifier] = useState('');
  const [linkOtp, setLinkOtp] = useState('');
  const [linkOtpSent, setLinkOtpSent] = useState(false);

  // Deletion state
  const [deletionData, setDeletionData] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false);

  // Alerts
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAccountModalOpen && user) {
      setEditName(user.fullName || '');
      loadAccountData();
    }
  }, [isAccountModalOpen, user]);

  const loadAccountData = async () => {
    setError(null);
    try {
      const [profileRes, sessionsRes] = await Promise.all([
        api.getAccountProfile(),
        api.listSessions(),
      ]);
      setDeletionData(profileRes.deletionRequest);
      setSessions(sessionsRes.sessions || []);
    } catch (err) {
      console.warn('[AccountModal] Failed to load account details:', err.message);
    }
  };

  if (!isAccountModalOpen || !user) return null;

  // Save profile name
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.updateAccountProfile({ fullName: editName });
      setUser(prev => ({ ...prev, fullName: editName }));
      setSuccess('Profile name updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  // Request Link OTP
  const handleRequestLinkOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.requestOtp({
        identifier: linkIdentifier.trim(),
        channel: linkChannel === 'phone' ? 'phone_sms' : 'email',
        purpose: 'account_link',
      });
      setLinkOtpSent(true);
      setSuccess(`Verification code dispatched to ${linkIdentifier.trim()}.`);
    } catch (err) {
      setError(err.message || 'Failed to dispatch linking OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Link OTP
  const handleConfirmLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.linkIdentifier({
        identifier: linkIdentifier.trim(),
        channel: linkChannel === 'phone' ? 'phone_sms' : 'email',
        otp: linkOtp.trim(),
      });
      setSuccess(`${linkChannel === 'phone' ? 'Phone number' : 'Email address'} linked successfully!`);
      setLinkOtpSent(false);
      setLinkIdentifier('');
      setLinkOtp('');
      const updatedProfile = await api.getAccountProfile();
      setUser(prev => ({
        ...prev,
        phone: updatedProfile.profile.phone,
        isPhoneVerified: updatedProfile.profile.isPhoneVerified,
        email: updatedProfile.profile.email,
        isEmailVerified: updatedProfile.profile.isEmailVerified,
      }));
    } catch (err) {
      setError(err.message || 'Failed to link identifier.');
    } finally {
      setLoading(false);
    }
  };

  // Revoke session
  const handleRevokeSession = async (sessionId, isCurrent) => {
    try {
      await api.revokeSession(sessionId);
      if (isCurrent) {
        handleLogout();
      } else {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        setSuccess('Session revoked.');
      }
    } catch (err) {
      setError(err.message || 'Failed to revoke session.');
    }
  };

  // Revoke other sessions
  const handleRevokeOthers = async () => {
    try {
      await api.revokeOtherSessions();
      setSessions(prev => prev.filter(s => s.isCurrent));
      setSuccess('All other sessions logged out.');
    } catch (err) {
      setError(err.message || 'Failed to revoke other sessions.');
    }
  };

  // Deletion request
  const handleRequestDeletion = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.requestAccountDeletion({ reason: deletionReason });
      setDeletionData(res);
      setUser(prev => ({ ...prev, status: 'deletion_pending' }));
      setSuccess(res.message);
      setShowDeletionConfirm(false);
    } catch (err) {
      setError(err.message || 'Failed to request account deletion.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.cancelAccountDeletion();
      setDeletionData(null);
      setUser(prev => ({ ...prev, status: 'active' }));
      setSuccess(res.message);
    } catch (err) {
      setError(err.message || 'Failed to cancel deletion request.');
    } finally {
      setLoading(false);
    }
  };

  // Respond to invitation
  const handleRespondInvite = async (invitationId, action) => {
    try {
      const res = await api.respondToInvitation(invitationId, action);
      setSuccess(res.message);
      refreshInvitations();
      if (action === 'accept') {
        refreshBusinesses();
      }
    } catch (err) {
      setError(err.message || 'Failed to respond to invitation.');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsAccountModalOpen(false)} role="dialog" aria-modal="true">
      <div
        className="modal-card account-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="modal-icon-badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-electric)' }}>
              <User size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>Citizen Account & Security</h2>
              <p className="modal-subtitle" style={{ fontSize: '0.78rem' }}>
                Deori Taluka Citizen Desk • ID: {user.id.slice(0, 8)}...
              </p>
            </div>
          </div>
          <button onClick={() => setIsAccountModalOpen(false)} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-subtle)', padding: '0 16px', overflowX: 'auto' }}>
          {[
            { id: 'profile', label: 'Identity & Contacts' },
            { id: 'sessions', label: `Active Devices (${sessions.length})` },
            { id: 'invitations', label: `Business Invites (${incomingInvitations.length})` },
            { id: 'linking', label: 'Link Contacts' },
            { id: 'privacy', label: 'Privacy & Deletion' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(null); setSuccess(null); }}
              style={{
                padding: '12px 14px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--brand-primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div className="auth-alert error" style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'var(--status-crimson-bg)', border: '1px solid var(--status-crimson-border)', color: 'var(--status-crimson)', fontSize: '0.82rem', marginBottom: '16px' }}>
              <ShieldAlert size={16} />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="auth-alert success" style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'var(--status-emerald-bg)', border: '1px solid var(--status-emerald-border)', color: 'var(--status-emerald)', fontSize: '0.82rem', marginBottom: '16px' }}>
              <CheckCircle2 size={16} />
              <div>{success}</div>
            </div>
          )}

          {/* TAB 1: PROFILE & VERIFIED CONTACT IDENTIFIERS */}
          {activeTab === 'profile' && (
            <div>
              <div style={{ background: 'var(--surface-card)', borderRadius: '10px', padding: '16px', marginBottom: '20px', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <ShieldCheck size={18} style={{ color: 'var(--brand-primary)' }} />
                  Verified Contact Identifiers
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Email row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--surface-border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>{user.email || 'No email attached'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Primary electronic correspondence</div>
                      </div>
                    </div>
                    {user.isEmailVerified ? (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--status-emerald-bg)', border: '1px solid var(--status-emerald-border)', color: 'var(--status-emerald)', fontWeight: 600 }}>
                        Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--status-crimson-bg)', border: '1px solid var(--status-crimson-border)', color: 'var(--status-crimson)', fontWeight: 600 }}>
                        Unverified
                      </span>
                    )}
                  </div>

                  {/* Phone row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--surface-border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>{user.phone || 'No phone attached'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SMS security alerts & fast OTP login</div>
                      </div>
                    </div>
                    {user.isPhoneVerified ? (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--status-emerald-bg)', border: '1px solid var(--status-emerald-border)', color: 'var(--status-emerald)', fontWeight: 600 }}>
                        Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--status-crimson-bg)', border: '1px solid var(--status-crimson-border)', color: 'var(--status-crimson)', fontWeight: 600 }}>
                        Unverified
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '14px', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <strong>Security Architecture Notice:</strong> Email and Phone verification confirm your personal citizen contact methods. They do <em>not</em> represent individual background verification or business enterprise verification.
                </div>
              </div>

              {/* Edit display name */}
              <form onSubmit={handleUpdateProfile} style={{ background: 'var(--surface-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>Personal Details</h3>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Citizen Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  {loading ? 'Saving...' : 'Update Name'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: ACTIVE SESSIONS & DEVICE MANAGEMENT */}
          {activeTab === 'sessions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px', fontWeight: 700 }}>Active Signed-In Devices</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Server-managed sessions with cryptographically hashed tokens.</p>
                </div>
                {sessions.length > 1 && (
                  <button
                    onClick={handleRevokeOthers}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', color: 'var(--status-crimson)', borderColor: 'var(--status-crimson-border)' }}
                  >
                    Log Out Other Devices
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sessions.map(s => (
                  <div
                    key={s.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: s.isCurrent ? 'var(--brand-blue-bg)' : 'var(--surface-card)',
                      border: s.isCurrent ? '1px solid #bfdbfe' : '1px solid var(--surface-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {s.deviceLabel?.toLowerCase().includes('mobile') ? (
                        <Smartphone size={20} style={{ color: 'var(--brand-primary)' }} />
                      ) : (
                        <Laptop size={20} style={{ color: 'var(--brand-primary)' }} />
                      )}
                      <div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{s.deviceLabel || 'Browser Session'}</span>
                          {s.isCurrent && (
                            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--brand-primary)', color: '#ffffff', fontWeight: 700 }}>
                              Current Device
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          IP: {s.ipAddress || 'Unknown'} • Active: {new Date(s.lastActiveAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(s.id, s.isCurrent)}
                      style={{ background: 'none', border: 'none', color: 'var(--status-crimson)', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 8px' }}
                      title="Revoke session"
                    >
                      {s.isCurrent ? 'Log Out' : 'Revoke'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BUSINESS INVITATIONS */}
          {activeTab === 'invitations' && (
            <div>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 700 }}>Incoming Business Team Invitations</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Invitations sent to your verified email or phone to join enterprise workspaces in Deori Taluka.
              </p>

              {incomingInvitations.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px dashed var(--surface-border)' }}>
                  <Building size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.85rem' }}>No pending team invitations</div>
                  <div style={{ fontSize: '0.75rem' }}>When a business owner invites you as Manager or Staff, it will appear here.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {incomingInvitations.map(inv => (
                    <div
                      key={inv.id}
                      style={{
                        padding: '14px',
                        background: 'var(--surface-card)',
                        borderRadius: '8px',
                        border: '1px solid var(--surface-border)',
                        boxShadow: 'var(--shadow-xs)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{inv.business_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Role: <strong style={{ color: 'var(--brand-primary)' }}>{inv.role_name}</strong> • Invited by {inv.inviter_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Category: {inv.category} • Expires: {new Date(inv.expires_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleRespondInvite(inv.id, 'accept')}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Check size={14} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespondInvite(inv.id, 'decline')}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-crimson)' }}
                        >
                          <Ban size={14} />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAFE CONTACT LINKING */}
          {activeTab === 'linking' && (
            <div>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 700 }}>Link Additional Contact Identifier</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Link your phone or email to enable dual-channel recovery and secure sign-in. Proof of control via OTP is strictly enforced.
              </p>

              {!linkOtpSent ? (
                <div style={{ background: 'var(--surface-card)', padding: '16px', borderRadius: '10px', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setLinkChannel('phone')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid ' + (linkChannel === 'phone' ? '#bfdbfe' : 'var(--surface-border)'),
                        background: linkChannel === 'phone' ? 'var(--brand-blue-bg)' : 'var(--surface-subtle)',
                        color: linkChannel === 'phone' ? 'var(--brand-primary)' : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Link Mobile Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkChannel('email')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid ' + (linkChannel === 'email' ? '#bfdbfe' : 'var(--surface-border)'),
                        background: linkChannel === 'email' ? 'var(--brand-blue-bg)' : 'var(--surface-subtle)',
                        color: linkChannel === 'email' ? 'var(--brand-primary)' : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Link Email Address
                    </button>
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {linkChannel === 'phone' ? 'Phone Number (10 Digits)' : 'Email Address'}
                    </label>
                    <input
                      type={linkChannel === 'phone' ? 'tel' : 'email'}
                      required
                      value={linkIdentifier}
                      onChange={(e) => setLinkIdentifier(e.target.value)}
                      placeholder={linkChannel === 'phone' ? '9822XXXXXX' : 'you@deorihub.local'}
                      style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={loading || !linkIdentifier.trim()}
                    onClick={handleRequestLinkOtp}
                    className="btn btn-primary"
                    style={{ padding: '10px 18px', fontSize: '0.82rem' }}
                  >
                    {loading ? 'Dispatching...' : 'Send Verification Code'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConfirmLink} style={{ background: 'var(--surface-card)', padding: '16px', borderRadius: '10px', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
                    Enter verification code sent to <strong>{linkIdentifier}</strong>:
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={linkOtp}
                    onChange={(e) => setLinkOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '6px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', marginBottom: '14px' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      disabled={loading || linkOtp.length < 6}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                    >
                      {loading ? 'Linking...' : 'Verify & Link Identifier'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkOtpSent(false)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 5: PRIVACY & DELETION */}
          {activeTab === 'privacy' && (
            <div>
              <div style={{ background: 'var(--surface-card)', padding: '16px', borderRadius: '10px', border: '1px solid var(--surface-border)', marginBottom: '18px', boxShadow: 'var(--shadow-xs)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <Shield size={18} style={{ color: 'var(--brand-primary)' }} />
                  Data Minimization & Civic Privacy Standards
                </h3>
                <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '18px' }}>
                  <li><strong>No GPS Tracking:</strong> Locality is explicitly selected by you, not tracked through background location services.</li>
                  <li><strong>No Raw Document Storage:</strong> Government ID documents are not stored in Phase 2.</li>
                  <li><strong>Security Auditing:</strong> Administrative events (logins, ownership transfers) are audited without recording passwords, OTPs, or tokens.</li>
                </ul>
              </div>

              {/* Deletion Grace Period Section */}
              <div style={{ background: 'var(--status-crimson-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--status-crimson-border)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--status-crimson)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <Trash2 size={18} />
                  Account Deletion & Grace Period
                </h3>

                {deletionData ? (
                  <div>
                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--status-amber-bg)', border: '1px solid var(--status-amber-border)', color: 'var(--status-amber)', fontSize: '0.8rem', marginBottom: '12px' }}>
                      <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                      <strong>Deletion Scheduled:</strong> This account is in a 30-day cooling-off grace period until{' '}
                      <strong>{new Date(deletionData.scheduled_deletion_at || deletionData.scheduledDeletionAt).toLocaleDateString()}</strong>.
                    </div>
                    <button
                      onClick={handleCancelDeletion}
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                    >
                      {loading ? 'Cancelling...' : 'Cancel Deletion Request (Keep Account Active)'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Requesting deletion places your account in a 30-day cooling-off grace period. You can reactivate or cancel the deletion at any time during this period.
                    </p>

                    {!showDeletionConfirm ? (
                      <button
                        onClick={() => setShowDeletionConfirm(true)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '8px 14px', color: 'var(--status-crimson)', borderColor: 'var(--status-crimson-border)', background: 'var(--surface-card)' }}
                      >
                        Request Account Deletion
                      </button>
                    ) : (
                      <div style={{ background: 'var(--surface-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--status-crimson)', fontWeight: 600, marginBottom: '8px' }}>
                          Are you sure you want to request deletion?
                        </div>
                        <input
                          type="text"
                          value={deletionReason}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          placeholder="Optional reason for leaving"
                          style={{ width: '100%', padding: '8px 10px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem', marginBottom: '10px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleRequestDeletion}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ background: '#ef4444', borderColor: '#ef4444', fontSize: '0.78rem', padding: '6px 12px' }}
                          >
                            {loading ? 'Confirming...' : 'Confirm 30-Day Deletion Request'}
                          </button>
                          <button
                            onClick={() => setShowDeletionConfirm(false)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-subtle)' }}>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.82rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            Log Out of Account
          </button>
          <button
            onClick={() => setIsAccountModalOpen(false)}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
