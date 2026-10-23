import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Home,
  Briefcase,
  Building,
  Truck,
  Wheat,
  ShoppingBag,
  Wrench,
  Calendar,
  Newspaper,
  ShieldAlert,
  Building2,
  Bookmark,
  Clock,
  Sparkles,
  User,
  Shield,
} from 'lucide-react';

const ICON_MAP = {
  Home: Home,
  Briefcase: Briefcase,
  Truck: Truck,
  Wheat: Wheat,
  ShoppingBag: ShoppingBag,
  Wrench: Wrench,
  Calendar: Calendar,
  Newspaper: Newspaper,
  ShieldAlert: ShieldAlert,
  Building2: Building2,
};

export default function Sidebar() {
  const {
    modules,
    currentView,
    navigateToHome,
    navigateToModule,
    navigateToSavedItems,
    appMode,
    toggleAppMode,
    user,
    setIsAccountModalOpen,
    openAuthModal,
  } = useApp();

  return (
    <aside className="app-sidebar" aria-label="Main Navigation">
      <div className="sidebar-nav-container">
        {/* Workspace Mode Indicator banner if in Business Mode */}
        {appMode === 'business' && (
          <div style={{ padding: '10px 14px', margin: '0 8px 12px', background: 'var(--status-amber-bg)', border: '1px solid var(--status-amber-border)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--status-amber)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={14} />
              Business Workspace
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Managing registered profiles & team permissions.
            </div>
          </div>
        )}

        {/* Home Link */}
        <button
          onClick={() => {
            if (appMode === 'business') toggleAppMode();
            navigateToHome();
          }}
          className={`sidebar-nav-item ${currentView === 'home' && appMode === 'personal' ? 'active' : ''}`}
        >
          <div className="sidebar-item-left">
            <Home size={18} />
            <span>Home Overview</span>
          </div>
        </button>

        {/* Business Workspace Tab if in Business Mode */}
        {appMode === 'business' && (
          <button
            onClick={() => {}}
            className="sidebar-nav-item active"
            style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}
          >
            <div className="sidebar-item-left">
              <Building2 size={18} />
              <span>Enterprise Desk</span>
            </div>
          </button>
        )}

        {/* Modules Section */}
        <div className="sidebar-section-title">Local Modules</div>

        {modules.map((m) => {
          const IconComponent = ICON_MAP[m.icon] || Sparkles;
          const isActive = currentView === m.slug && appMode === 'personal';

          return (
            <button
              key={m.id}
              onClick={() => {
                if (appMode === 'business') toggleAppMode();
                navigateToModule(m.slug);
              }}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="sidebar-item-left">
                <IconComponent size={17} />
                <span>{m.title}</span>
              </div>
              {m.featured && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--brand-electric)',
                    backgroundColor: 'var(--brand-blue-bg)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                  }}
                >
                  Key
                </span>
              )}
            </button>
          );
        })}

        {/* Saved & Activity Shortcuts */}
        <div className="sidebar-section-title">Personal Desk</div>
        <button
          onClick={() => {
            if (appMode === 'business') toggleAppMode();
            navigateToModule('my-activity');
          }}
          className={`sidebar-nav-item ${currentView === 'my-activity' && appMode === 'personal' ? 'active' : ''}`}
        >
          <div className="sidebar-item-left">
            <Clock size={17} />
            <span>My Activity</span>
          </div>
        </button>
        <button
          onClick={() => {
            if (appMode === 'business') toggleAppMode();
            navigateToSavedItems();
          }}
          className={`sidebar-nav-item ${currentView === 'saved-items' && appMode === 'personal' ? 'active' : ''}`}
        >
          <div className="sidebar-item-left">
            <Bookmark size={17} />
            <span>Saved Bookmarks</span>
          </div>
        </button>

        {/* Citizen Security & Sessions Shortcut */}
        {user && (
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="sidebar-nav-item"
          >
            <div className="sidebar-item-left">
              <Shield size={17} style={{ color: 'var(--brand-electric)' }} />
              <span>Security & Devices</span>
            </div>
          </button>
        )}

        {/* Administration Desk for Staff */}
        {user && ['super_admin', 'admin', 'moderator', 'verifier', 'editor'].includes(user.role) && (
          <>
            <div className="sidebar-section-title" style={{ color: 'var(--brand-electric)', marginTop: '16px' }}>
              Governance & Admin
            </div>
            <button
              onClick={() => {
                if (appMode === 'business') toggleAppMode();
                navigateToModule('admin');
              }}
              className={`sidebar-nav-item ${currentView === 'admin' ? 'active' : ''}`}
              style={{
                border: '1px solid #bfdbfe',
                background: currentView === 'admin' ? 'var(--brand-blue-bg)' : '#ffffff',
                color: 'var(--text-primary)',
              }}
            >
              <div className="sidebar-item-left">
                <ShieldAlert size={17} style={{ color: 'var(--brand-primary)' }} />
                <span style={{ fontWeight: 600 }}>Admin Desk</span>
              </div>
              <span
                style={{
                  fontSize: '0.62rem',
                  color: 'var(--brand-primary)',
                  background: 'var(--brand-blue-bg)',
                  border: '1px solid #bfdbfe',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                {user.role === 'super_admin' ? 'Super Admin' : user.role}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Footer Mode Switcher Card */}
      <div className="sidebar-footer">
        <div className="mode-toggle-card">
          <div className="mode-header">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Workspace Scope
            </span>
            <button onClick={toggleAppMode} className="mode-badge" style={{ cursor: 'pointer' }}>
              {appMode.toUpperCase()} MODE
            </button>
          </div>
          <p className="mode-desc">
            {appMode === 'personal'
              ? 'Personal mode for exploring jobs, rentals, rides & local services.'
              : 'Business workspace for managing profiles, branches, and team staff.'}
          </p>
        </div>
      </div>
    </aside>
  );
}
