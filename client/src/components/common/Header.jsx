import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  ShieldAlert,
  Activity,
  Layers,
  ChevronDown,
  Building,
  User,
  LogIn,
  Bell,
  Search,
} from 'lucide-react';
import NotificationsPopover from './NotificationsPopover';

export default function Header() {
  const {
    selectedArea,
    setIsAreaModalOpen,
    setIsDiagnosticsModalOpen,
    healthStatus,
    navigateToHome,
    navigateToModule,
    navigateToSearch,
    appMode,
    toggleAppMode,
    user,
    openAuthModal,
    setIsAccountModalOpen,
    incomingInvitations,
  } = useApp();

  const isDbConnected = healthStatus?.database?.connected;
  const hasInvites = incomingInvitations && incomingInvitations.length > 0;

  return (
    <header className="app-header">
      {/* Brand & Identity */}
      <div className="brand-section">
        <button
          onClick={navigateToHome}
          className="brand-logo-badge"
          title="LocalHub X Home"
          aria-label="LocalHub X Home"
        >
          <Layers size={22} strokeWidth={2.5} />
        </button>
        <div className="brand-title-wrap">
          <button onClick={navigateToHome} className="brand-name">
            LocalHub<span className="brand-accent-x">X</span>
          </button>
          <span className="brand-subline">Deori Taluka • गोंदिया जिल्हा</span>
        </div>
      </div>

      {/* Center Tools: Area Selector & Universal Search */}
      <div className="header-center-tools" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => setIsAreaModalOpen(true)}
          className="area-selector-pill"
          title="Select locality within Deori Taluka (Manual Selection, No GPS)"
          aria-label="Select locality"
        >
          <MapPin size={15} className="area-pin-icon" />
          <span>{selectedArea.name}</span>
          <span className="area-notice-tag">Non-GPS</span>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        </button>

        <button
          onClick={() => navigateToSearch('')}
          className="area-selector-pill"
          style={{ cursor: 'pointer', background: 'var(--brand-blue-bg)', borderColor: '#bfdbfe', color: 'var(--brand-primary)' }}
          title="Open Universal Search across Deori Taluka"
          aria-label="Universal Search"
        >
          <Search size={14} style={{ color: 'var(--brand-primary)' }} />
          <span>Search</span>
        </button>
      </div>

      {/* Right Actions: Emergency, Mode Switch, User Profile / Auth, Diagnostics */}
      <div className="header-right-actions">
        {/* Emergency Shortcut (Guaranteed Prominent Access) */}
        <button
          onClick={() => {
            const el = document.getElementById('emergency-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigateToHome();
              setTimeout(() => {
                document.getElementById('emergency-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }}
          className="header-emergency-pill"
          title="Emergency Helpline (Verified Lines Only)"
          aria-label="Emergency Helpline"
        >
          <span className="pulse-dot"></span>
          <ShieldAlert size={15} />
          <span>Emergency</span>
        </button>

        {/* Workspace Mode Switcher (Personal vs Business) */}
        <button
          onClick={toggleAppMode}
          className="header-btn"
          style={{ width: 'auto', padding: '0 10px', gap: '6px', fontSize: '0.78rem' }}
          title={`Active Workspace: ${appMode.toUpperCase()} Mode. Click to switch.`}
          aria-label="Toggle Personal or Business workspace"
        >
          {appMode === 'personal' ? (
            <>
              <User size={15} style={{ color: 'var(--brand-electric)' }} />
              <span>Personal</span>
            </>
          ) : (
            <>
              <Building size={15} style={{ color: '#fbbf24' }} />
              <span>Business</span>
            </>
          )}
        </button>

        {/* User Account Desk & Notifications, or Sign In Button */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {['super_admin', 'admin', 'moderator', 'verifier', 'editor'].includes(user.role) && (
              <button
                onClick={() => {
                  if (appMode === 'business') toggleAppMode();
                  navigateToModule('admin');
                }}
                className="header-btn"
                style={{
                  width: 'auto',
                  padding: '0 10px',
                  gap: '6px',
                  fontSize: '0.78rem',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: 'var(--brand-electric)',
                }}
                title="Taluka Governance & Admin Desk"
                aria-label="Open Admin Desk"
              >
                <ShieldAlert size={14} />
                <span>Admin</span>
              </button>
            )}
            <NotificationsPopover />
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="header-btn"
              style={{ width: 'auto', padding: '0 10px', gap: '6px', fontSize: '0.78rem', position: 'relative' }}
              title={`Citizen Account: ${user.fullName}. Click to manage security & active devices.`}
              aria-label="Open Citizen Account"
            >
              <User size={15} style={{ color: 'var(--brand-electric)' }} />
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName?.split(' ')[0] || 'Account'}
              </span>
              {hasInvites && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                  }}
                  title={`${incomingInvitations.length} pending business invitations`}
                />
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="header-btn"
            style={{ width: 'auto', padding: '0 10px', gap: '6px', fontSize: '0.78rem', background: 'var(--brand-blue-bg)', color: 'var(--brand-electric)', borderColor: 'rgba(56, 189, 248, 0.3)' }}
            title="Sign in with Email/Password or Phone OTP"
            aria-label="Sign In"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}

        {/* Diagnostics / API Health Button */}
        <button
          onClick={() => setIsDiagnosticsModalOpen(true)}
          className="header-btn"
          title={`System Diagnostics: Backend ${healthStatus ? 'Online' : 'Connecting'} | MySQL: ${isDbConnected ? 'Connected' : 'Unconfigured'}`}
          aria-label="Open System Diagnostics"
        >
          <Activity
            size={16}
            style={{
              color: isDbConnected
                ? 'var(--status-emerald)'
                : healthStatus
                ? 'var(--status-amber)'
                : 'var(--status-crimson)',
            }}
          />
        </button>
      </div>
    </header>
  );
}
