import React from 'react';
import { useApp } from '../../context/AppContext';
import Header from '../common/Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import AreaSelectorModal from '../common/AreaSelectorModal';
import SystemStatusModal from '../common/SystemStatusModal';
import AuthModal from '../auth/AuthModal';
import AccountModal from '../account/AccountModal';
import BusinessWorkspace from '../business/BusinessWorkspace';
import SearchSection from '../home/SearchSection';
import EmergencySection from '../home/EmergencySection';
import ModuleTilesSection from '../home/ModuleTilesSection';
import LocalFeedSection from '../home/LocalFeedSection';
import RecentActivitySection from '../home/RecentActivitySection';
import SavedItemsSection from '../home/SavedItemsSection';
import ModuleView from '../modules/ModuleView';
import MyActivityDashboard from '../activity/MyActivityDashboard';
import AdminPanel from '../admin/AdminPanel';
import SearchResultsView from '../search/SearchResultsView';
import SavedItemsView from '../saved/SavedItemsView';

export default function AppShell() {
  const { currentView, appMode } = useApp();

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main App Content Area */}
      <div className="main-wrapper">
        <Header />

        <main className="content-area">
          {appMode === 'business' ? (
            <BusinessWorkspace />
          ) : currentView === 'admin' ? (
            <AdminPanel />
          ) : currentView === 'search' ? (
            <SearchResultsView />
          ) : currentView === 'saved-items' ? (
            <SavedItemsView />
          ) : currentView === 'my-activity' ? (
            <MyActivityDashboard />
          ) : currentView === 'home' ? (
            <div className="home-layout">
              {/* 1. Universal Search Hero */}
              <SearchSection />

              {/* 2. Emergency Shortcut Banner */}
              <EmergencySection />

              {/* 3. 10 Core Module Tiles */}
              <ModuleTilesSection />

              {/* 4. Taluka Local Feed */}
              <LocalFeedSection />

              {/* 5. My Recent Activity */}
              <RecentActivitySection />

              {/* 6. Saved Items */}
              <SavedItemsSection />
            </div>
          ) : (
            <ModuleView slug={currentView} />
          )}

          {/* Footer with Civic Context */}
          <footer
            style={{
              marginTop: '48px',
              paddingTop: '24px',
              borderTop: '1px solid var(--surface-border-subtle)',
              textAlign: 'center',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div>
              <strong>LocalHub X</strong> — Production-Oriented Local Super-App for Deori Taluka, Gondia, Maharashtra.
            </div>
            <div>
              Phase 7: Home Dashboard, Universal Search & Discovery Complete (Phases 1–7 Live) • Non-GPS • Verified Safeguards
            </div>
          </footer>
        </main>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>

      {/* Modals */}
      <AreaSelectorModal />
      <SystemStatusModal />
      <AuthModal />
      <AccountModal />
    </div>
  );
}
