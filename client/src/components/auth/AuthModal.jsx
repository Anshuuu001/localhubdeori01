import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  Lock,
  Mail,
  Phone,
  User,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  HelpCircle,
  KeyRound,
} from 'lucide-react';

export default function AuthModal() {
  const { authModal, closeAuthModal, handleLoginSuccess } = useApp();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'recovery' | 'lost-access'
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'otp'

  // Common Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Step state for OTP flows
  const [otpStep, setOtpStep] = useState(false); // false: enter contact, true: enter code
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [otpPurpose, setOtpPurpose] = useState('login');
  const [otpChannel, setOtpChannel] = useState('phone_sms');

  // Loss of access fields
  const [lostIdentifier, setLostIdentifier] = useState('');
  const [alternateContact, setAlternateContact] = useState('');
  const [lossDetails, setLossDetails] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [devNotice, setDevNotice] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);

  useEffect(() => {
    if (authModal.isOpen) {
      setActiveTab(authModal.initialTab || 'login');
      setError(null);
      setSuccessMsg(null);
      setOtpStep(false);
      setOtp('');

      // Fetch provider statuses
      api.getProvidersStatus().then(res => setProviderInfo(res)).catch(() => {});
    }
  }, [authModal.isOpen, authModal.initialTab]);

  if (!authModal.isOpen) return null;

  // 1. Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setSuccessMsg('Logged in successfully!');
      setTimeout(() => {
        handleLoginSuccess(res.user, res.csrfToken);
      }, 500);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Email/Password Registration
  const handlePasswordRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.register({ fullName, email, password });
      setSuccessMsg(res.message || 'Registration successful!');
      setTimeout(() => {
        handleLoginSuccess(res.user, res.csrfToken);
      }, 500);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Request OTP for Login, Register or Password Reset
  const handleRequestOtp = async (purpose = 'login', channel = 'phone_sms') => {
    setError(null);
    setLoading(true);
    const identifier = channel === 'phone_sms' ? phone.trim() : email.trim();

    if (!identifier) {
      setError(`Please enter your ${channel === 'phone_sms' ? 'phone number' : 'email address'}.`);
      setLoading(false);
      return;
    }

    try {
      const res = await api.requestOtp({
        identifier,
        channel,
        purpose,
      });

      setTargetIdentifier(identifier);
      setOtpPurpose(purpose);
      setOtpChannel(channel);
      setOtpStep(true);
      setSuccessMsg(res.message);
      if (res.isDevelopmentMock) {
        setDevNotice(res.devNotice || 'Development Mock Provider active. Real SMS/Email gateway not configured in server/.env.');
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch security code.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify OTP and Complete Auth
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (otpPurpose === 'password_reset') {
        const res = await api.resetPassword({
          identifier: targetIdentifier,
          otp: otp.trim(),
          newPassword,
        });
        setSuccessMsg(res.message);
        setTimeout(() => {
          setOtpStep(false);
          setActiveTab('login');
          setLoginMethod('password');
          setPassword('');
          setError(null);
        }, 1200);
      } else {
        const res = await api.verifyOtp({
          identifier: targetIdentifier,
          otp: otp.trim(),
          purpose: otpPurpose,
          fullName: fullName.trim() || undefined,
        });
        setSuccessMsg(res.message);
        setTimeout(() => {
          handleLoginSuccess(res.user, res.csrfToken);
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Incorrect code.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Submit Loss of Access Recovery Request
  const handleLossRecovery = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.submitAccountRecovery({
        fullName,
        lostIdentifier,
        alternateContact,
        details: lossDetails,
      });
      setSuccessMsg(res.message);
      setTimeout(() => {
        closeAuthModal();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to submit recovery request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeAuthModal} role="dialog" aria-modal="true">
      <div
        className="modal-card auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '100%' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="modal-icon-badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: 'var(--brand-electric)' }}>
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>
                {activeTab === 'login' && 'Sign In to LocalHub X'}
                {activeTab === 'register' && 'Create Your Account'}
                {activeTab === 'recovery' && 'Password Recovery'}
                {activeTab === 'lost-access' && 'Loss of Identifiers Recovery'}
              </h2>
              <p className="modal-subtitle" style={{ fontSize: '0.78rem' }}>
                Deori Taluka Citizen & Enterprise Portal
              </p>
            </div>
          </div>
          <button onClick={closeAuthModal} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation (when not in sub-flow) */}
        {!otpStep && (activeTab === 'login' || activeTab === 'register') && (
          <div className="auth-tab-bar" style={{ display: 'flex', borderBottom: '1px solid var(--surface-border-subtle)', padding: '0 20px' }}>
            <button
              onClick={() => { setActiveTab('login'); setError(null); }}
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'login' ? '2px solid var(--brand-electric)' : '2px solid transparent',
                color: activeTab === 'login' ? 'var(--brand-electric)' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(null); }}
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'register' ? '2px solid var(--brand-electric)' : '2px solid transparent',
                color: activeTab === 'register' ? 'var(--brand-electric)' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Alerts */}
          {error && (
            <div className="auth-alert error" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 14px', borderRadius: '8px', background: 'var(--status-crimson-bg)', border: '1px solid var(--status-crimson-border)', color: 'var(--status-crimson)', fontSize: '0.82rem', marginBottom: '16px' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 14px', borderRadius: '8px', background: 'var(--status-emerald-bg)', border: '1px solid var(--status-emerald-border)', color: 'var(--status-emerald)', fontSize: '0.82rem', marginBottom: '16px' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{successMsg}</div>
            </div>
          )}

          {devNotice && (
            <div className="auth-alert dev-notice" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 14px', borderRadius: '8px', background: 'var(--status-amber-bg)', border: '1px solid var(--status-amber-border)', color: 'var(--status-amber)', fontSize: '0.78rem', marginBottom: '16px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Development Advisory:</strong> {devNotice}
              </div>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {activeTab === 'login' && !otpStep && (
            <div>
              {/* Method Switch: Password vs Phone OTP */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', background: 'var(--surface-subtle)', padding: '4px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('password'); setError(null); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: loginMethod === 'password' ? 'var(--surface-card)' : 'transparent',
                    color: loginMethod === 'password' ? 'var(--brand-primary)' : 'var(--text-muted)',
                    boxShadow: loginMethod === 'password' ? 'var(--shadow-xs)' : 'none',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Email & Password
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('otp'); setError(null); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: loginMethod === 'otp' ? 'var(--surface-card)' : 'transparent',
                    color: loginMethod === 'otp' ? 'var(--brand-primary)' : 'var(--text-muted)',
                    boxShadow: loginMethod === 'otp' ? 'var(--shadow-xs)' : 'none',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Phone OTP
                </button>
              </div>

              {loginMethod === 'password' ? (
                <form onSubmit={handlePasswordLogin}>
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@deori.local"
                        style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Password</label>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('recovery'); setError(null); }}
                        style={{ background: 'none', border: 'none', color: 'var(--brand-electric)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', marginTop: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                    <ArrowRight size={16} />
                  </button>
                </form>
              ) : (
                <div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Mobile Phone Number (India)</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9822XXXXXX"
                        style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                      A 6-digit one-time code will be dispatched to verify your device.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleRequestOtp('login', 'phone_sms')}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    {loading ? 'Sending Code...' : 'Send Verification Code'}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Lost access to both phone & email?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('lost-access'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--brand-electric)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Submit Recovery Request
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && !otpStep && (
            <div>
              <form onSubmit={handlePasswordRegister}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="citizen@deorihub.local"
                      style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Create Password (min. 8 characters)</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}

          {/* OTP STEP (For Phone Login, Register, or Password Reset) */}
          {otpStep && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Enter the 6-digit verification code sent to:
                </p>
                <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.95rem' }}>
                  {targetIdentifier}
                </div>
              </div>

              <form onSubmit={handleVerifyOtp}>
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    style={{
                      width: '100%',
                      padding: '14px',
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      letterSpacing: '8px',
                      fontWeight: 700,
                      background: 'var(--surface-ground)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {otpPurpose === 'password_reset' && (
                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {loading ? 'Verifying Code...' : otpPurpose === 'password_reset' ? 'Reset Password & Invalidate Sessions' : 'Confirm & Sign In'}
                  <ArrowRight size={16} />
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => { setOtpStep(false); setOtp(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                  >
                    ← Change number/email
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleRequestOtp(otpPurpose, otpChannel)}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-electric)', fontSize: '0.78rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RotateCcw size={12} />
                    Resend Code
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: PASSWORD RECOVERY REQUEST */}
          {activeTab === 'recovery' && !otpStep && (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Enter your registered email address or phone number. We will dispatch a single-use security code to reset your password.
              </p>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Registered Email or Phone</label>
                <input
                  type="text"
                  required
                  value={targetIdentifier}
                  onChange={(e) => setTargetIdentifier(e.target.value)}
                  placeholder="email@domain.com or 9822XXXXXX"
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const isEmail = targetIdentifier.includes('@');
                  handleRequestOtp('password_reset', isEmail ? 'email' : 'phone_sms');
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                {loading ? 'Dispatching...' : 'Send Password Reset Code'}
                <ArrowRight size={16} />
              </button>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LOSS OF ACCESS RECOVERY (PENDING REVIEW) */}
          {activeTab === 'lost-access' && (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                If you have lost access to both your registered phone number and email address, you can submit an administrative identity recovery request. Identity checks cannot be bypassed.
              </p>

              <form onSubmit={handleLossRecovery}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Full Name on Account</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your legal name"
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Lost Phone or Email</label>
                  <input
                    type="text"
                    required
                    value={lostIdentifier}
                    onChange={(e) => setLostIdentifier(e.target.value)}
                    placeholder="Previous contact details"
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Working Alternate Contact (New Phone or Email)</label>
                  <input
                    type="text"
                    required
                    value={alternateContact}
                    onChange={(e) => setAlternateContact(e.target.value)}
                    placeholder="Where our support team can reach you"
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Explanation of Circumstances</label>
                  <textarea
                    required
                    rows={3}
                    value={lossDetails}
                    onChange={(e) => setLossDetails(e.target.value)}
                    placeholder="Explain how both contact credentials were lost (e.g. damaged device, lost SIM)."
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {loading ? 'Submitting...' : 'Submit Case for Manual Review'}
                </button>

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); setError(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
