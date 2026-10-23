import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Bookmark, Sparkles, ArrowRight, ExternalLink, MapPin } from 'lucide-react';

export default function SavedItemsSection() {
  const { user, navigateToSavedItems, navigateToModule } = useApp();
  const [savedPreview, setSavedPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadSavedPreview() {
      if (!user) {
        setSavedPreview([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.getSavedItems({ limit: 4 });
        if (isMounted) {
          setSavedPreview(res.items || []);
        }
      } catch {
        if (isMounted) setSavedPreview([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSavedPreview();
    return () => { isMounted = false; };
  }, [user]);

  return (
    <section id="saved-section" aria-label="Saved Items" style={{ marginBottom: '32px' }}>
      <div className="section-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            <Bookmark size={22} style={{ color: 'var(--brand-electric)' }} />
            <span>Saved Items & Contacts</span>
          </h2>
          <p className="section-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Offline-accessible bookmarks with real-time availability tracking across Deori Taluka.
          </p>
        </div>

        {user && savedPreview.length > 0 && (
          <button
            onClick={navigateToSavedItems}
            className="header-btn"
            style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem', gap: '6px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'var(--brand-electric)' }}
          >
            <span>View All ({savedPreview.length}+)</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div className="feed-card-container">
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
            <span style={{ fontSize: '0.82rem' }}>Retrieving your saved bookmarks...</span>
          </div>
        ) : savedPreview.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {savedPreview.map((item) => (
              <div
                key={item.savedId}
                onClick={navigateToSavedItems}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-card, #ffffff)',
                  border: '1px solid var(--surface-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#93c5fd';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--surface-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.12)', color: 'var(--brand-electric)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {item.module}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: item.liveStatus === 'available' ? 'var(--status-emerald)' : 'var(--status-crimson)',
                      }}
                    >
                      {item.liveStatus === 'available' ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: 1.35 }}>
                    {item.summary ? item.summary.slice(0, 80) + '...' : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={11} style={{ color: 'var(--brand-electric)' }} />
                    <span>{item.areaName}</span>
                  </div>
                  <ExternalLink size={12} style={{ color: 'var(--brand-electric)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-wrap">
            <div className="empty-icon-wrapper">
              <Bookmark size={26} />
            </div>
            <h3 className="empty-title">No Saved Items Yet</h3>
            <p className="empty-description">
              Whenever you bookmark a job opening, rental property, harvester contact, or technician profile, it will be pinned here for one-tap retrieval.
            </p>

            <button
              onClick={() => navigateToModule('krishi-bazaar')}
              className="empty-action-btn"
            >
              <Sparkles size={14} style={{ color: 'var(--brand-electric)' }} />
              <span>Browse Krishi Bazaar</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
