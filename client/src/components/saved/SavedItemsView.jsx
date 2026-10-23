import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Bookmark,
  ArrowLeft,
  Trash2,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  LogIn,
  RefreshCw,
} from 'lucide-react';

const MODULE_TABS = [
  { id: 'all', label: 'All Saved' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'rentals', label: 'Rentals' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'krishi', label: 'Krishi Bazaar' },
  { id: 'services', label: 'Services' },
  { id: 'directory', label: 'Directory' },
  { id: 'events', label: 'Events' },
  { id: 'news', label: 'News' },
  { id: 'notices', label: 'Notices' },
  { id: 'emergency', label: 'Helplines' },
];

export default function SavedItemsView() {
  const { user, openAuthModal, navigateToHome, navigateToModule } = useApp();
  const [selectedModule, setSelectedModule] = useState('all');
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSaved = useCallback(async () => {
    if (!user) {
      setSavedItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.getSavedItems({
        module: selectedModule === 'all' ? undefined : selectedModule,
        limit: 50,
      });
      setSavedItems(res.items || []);
    } catch (err) {
      console.error('[Fetch Saved Items Error]', err);
      setError('Failed to load saved items.');
    } finally {
      setLoading(false);
    }
  }, [user, selectedModule]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const handleUnsave = async (savedId, e) => {
    e.stopPropagation();
    try {
      await api.unsaveItem(savedId);
      setSavedItems(prev => prev.filter(it => it.savedId !== savedId));
    } catch (err) {
      console.error('[Unsave Error]', err);
    }
  };

  const handleOpenItem = (item) => {
    const slugMap = {
      jobs: 'jobs-hub',
      rentals: 'rentals-pg',
      marketplace: 'marketplace',
      krishi: 'krishi-bazaar',
      services: 'local-services',
      directory: 'business-directory',
      events: 'events-desk',
      news: 'taluka-news-feed',
      notices: 'taluka-news-feed',
      emergency: 'emergency-contacts',
    };
    navigateToModule(slugMap[item.module] || 'jobs-hub');
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.12)',
            color: 'var(--brand-electric)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Bookmark size={28} />
        </div>
        <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          Sign In to Access Your Saved Bookmarks
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 20px' }}>
          Saved items are securely synced to your citizen account for private, fast retrieval even in low-connectivity areas.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="header-btn"
          style={{ width: 'auto', padding: '10px 24px', background: 'var(--brand-electric)', color: '#0b1120', fontWeight: 700, margin: '0 auto' }}
        >
          <LogIn size={15} />
          <span>Sign In / Register</span>
        </button>
      </div>
    );
  }

  return (
    <div className="saved-items-page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={navigateToHome}
            className="header-btn"
            style={{ width: 'auto', padding: '6px 14px', gap: '6px', fontSize: '0.8rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bookmark size={22} style={{ color: 'var(--brand-electric)' }} />
              <span>Saved Items & Contacts</span>
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Private offline-accessible bookmarks across Deori Taluka with live availability tracking.
            </p>
          </div>
        </div>

        <button onClick={fetchSaved} className="header-btn" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.78rem', gap: '6px' }}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Module Filter Tabs */}
      <div className="category-tabs" role="tablist" style={{ overflowX: 'auto', marginBottom: '24px' }}>
        {MODULE_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selectedModule === tab.id}
            onClick={() => setSelectedModule(tab.id)}
            className={`category-tab-btn ${selectedModule === tab.id ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <span>Loading your saved bookmarks...</span>
        </div>
      ) : error ? (
        <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-crimson)', textAlign: 'center' }}>
          {error}
        </div>
      ) : savedItems.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--surface-subtle)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <Bookmark size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            No Saved Items in {selectedModule === 'all' ? 'Your Desk' : selectedModule}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 18px' }}>
            When you browse jobs, rentals, tractors, or emergency lines, click the bookmark icon to save them for quick offline access.
          </p>
          <button
            onClick={() => navigateToModule('krishi-bazaar')}
            className="header-btn"
            style={{ width: 'auto', padding: '8px 18px', background: 'var(--brand-blue-bg)', color: 'var(--brand-electric)', margin: '0 auto' }}
          >
            <Sparkles size={14} />
            <span>Browse Krishi Bazaar</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {savedItems.map((item) => {
            const isAvailable = item.liveStatus === 'available';

            return (
              <article
                key={item.savedId}
                onClick={() => handleOpenItem(item)}
                style={{
                  background: 'var(--surface-card, #ffffff)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'all 0.18s ease',
                  opacity: isAvailable ? 1 : 0.8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#93c5fd';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--surface-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                }}
              >
                <div>
                  {/* Top Bar: Module Pill, Live Status, Remove Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: 'var(--brand-electric)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.module}
                      </span>

                      {/* Live Availability Status */}
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-full)',
                          fontWeight: 700,
                          background:
                            item.liveStatus === 'available'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : item.liveStatus === 'under_review'
                              ? 'rgba(251, 191, 36, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                          color:
                            item.liveStatus === 'available'
                              ? 'var(--status-emerald)'
                              : item.liveStatus === 'under_review'
                              ? '#fbbf24'
                              : 'var(--status-crimson)',
                        }}
                      >
                        {item.liveStatus === 'available'
                          ? 'Available'
                          : item.liveStatus === 'under_review'
                          ? 'Under Review'
                          : item.liveStatus === 'removed'
                          ? 'Removed / Delisted'
                          : item.liveStatus === 'expired'
                          ? 'Expired'
                          : 'Unavailable'}
                      </span>
                    </div>

                    {/* Unsave Button */}
                    <button
                      onClick={(e) => handleUnsave(item.savedId, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Remove bookmark"
                      aria-label="Remove bookmark"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                    {item.title}
                  </h3>

                  {/* Summary */}
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    {item.summary}
                  </p>

                  {/* Price if present */}
                  {item.price !== null && item.price !== undefined && (
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--brand-electric)', marginBottom: '8px' }}>
                      ₹{item.price.toLocaleString('en-IN')}
                      {item.pricePeriod && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {' '}/ {item.pricePeriod}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--surface-border-subtle)',
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} style={{ color: 'var(--brand-electric)' }} />
                    <span>{item.areaName}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>Saved {new Date(item.savedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
