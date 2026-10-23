import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Grid, ShieldAlert, Clock, Building, User } from 'lucide-react';

export default function MobileNav() {
  const {
    currentView,
    navigateToHome,
    navigateToModule,
    appMode,
    toggleAppMode,
    user,
    openAuthModal,
    setIsAccountModalOpen,
  } = useApp();

  const scrollTo = (id) => {
    if (appMode === 'business') toggleAppMode();
    navigateToHome();
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <button
        onClick={() => {
          if (appMode === 'business') toggleAppMode();
          navigateToHome();
        }}
        className={`mobile-nav-btn ${currentView === 'home' && appMode === 'personal' ? 'active' : ''}`}
        aria-label="Home"
      >
        <Home size={19} />
        <span>Home</span>
      </button>

      <button
        onClick={() => {
          if (appMode === 'business') toggleAppMode();
          navigateToModule('my-activity');
        }}
        className={`mobile-nav-btn ${currentView === 'my-activity' && appMode === 'personal' ? 'active' : ''}`}
        aria-label="My Activity"
      >
        <Clock size={19} />
        <span>Activity</span>
      </button>

      <button
        onClick={() => scrollTo('modules-section')}
        className="mobile-nav-btn"
        aria-label="Explore Modules"
      >
        <Grid size={19} />
        <span>Modules</span>
      </button>

      <button
        onClick={() => scrollTo('emergency-section')}
        className="mobile-nav-btn emergency-tab"
        aria-label="Emergency Services"
      >
        <ShieldAlert size={19} />
        <span style={{ fontWeight: 700 }}>Emergency</span>
      </button>

      {/* Mode Workspace Toggle or Admin Desk for Staff */}
      {user && ['super_admin', 'admin', 'moderator', 'verifier', 'editor'].includes(user.role) ? (
        <button
          onClick={() => {
            if (appMode === 'business') toggleAppMode();
            navigateToModule('admin');
          }}
          className={`mobile-nav-btn ${currentView === 'admin' ? 'active' : ''}`}
          aria-label="Admin Desk"
          style={currentView === 'admin' ? { color: 'var(--brand-electric)' } : {}}
        >
          <ShieldAlert size={19} style={{ color: 'var(--brand-electric)' }} />
          <span>Admin</span>
        </button>
      ) : (
        <button
          onClick={toggleAppMode}
          className={`mobile-nav-btn ${appMode === 'business' ? 'active' : ''}`}
          aria-label="Toggle Business Workspace"
          style={appMode === 'business' ? { color: '#fbbf24' } : {}}
        >
          <Building size={19} />
          <span>Business</span>
        </button>
      )}

      {/* Account / Profile Desk */}
      <button
        onClick={() => {
          if (user) {
            setIsAccountModalOpen(true);
          } else {
            openAuthModal('login');
          }
        }}
        className="mobile-nav-btn"
        aria-label="Account Desk"
      >
        <User size={19} />
        <span>{user ? 'Account' : 'Sign In'}</span>
      </button>
    </nav>
  );
}
