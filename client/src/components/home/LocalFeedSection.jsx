import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Newspaper,
  Building2,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Plus,
  Clock,
  MapPin,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react';

export default function LocalFeedSection() {
  const { selectedArea, navigateToModule } = useApp();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFeed() {
      setLoading(true);
      try {
        const res = await api.getDiscoveryFeed({
          areaId: selectedArea?.id || 'all',
          limit: 4,
        });

        if (isMounted) {
          setFeedItems(res.items || []);
        }
      } catch (err) {
        console.error('Failed to load local discovery feed:', err);
        if (isMounted) setFeedItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFeed();
    return () => { isMounted = false; };
  }, [selectedArea]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFeedBadgeStyle = (item) => {
    if (item.feedType === 'notice') {
      return {
        bg: 'rgba(56, 189, 248, 0.12)',
        color: 'var(--brand-electric)',
        icon: Building2,
        label: 'Official Notice',
      };
    }
    if (item.feedType === 'event') {
      return {
        bg: 'rgba(249, 115, 22, 0.12)',
        color: '#f97316',
        icon: Calendar,
        label: 'Civic Event',
      };
    }
    if (item.feedType === 'listing') {
      return {
        bg: 'rgba(52, 211, 153, 0.12)',
        color: 'var(--status-emerald)',
        icon: ShoppingBag,
        label: 'Marketplace',
      };
    }
    return {
      bg: 'rgba(96, 165, 250, 0.12)',
      color: '#60a5fa',
      icon: Newspaper,
      label: 'Local News',
    };
  };

  return (
    <section id="local-feed-section" aria-label="Taluka Local Discovery Feed">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">
            <Newspaper size={22} style={{ color: 'var(--brand-electric)' }} />
            <span>Local Discovery Feed</span>
          </h2>
          <p className="section-subtitle">
            Official circulars, APMC market news, and community announcements for {selectedArea?.name || 'Deori Taluka'}.
          </p>
        </div>

        <button
          onClick={() => navigateToModule('taluka-news-feed')}
          className="header-btn"
          style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem', gap: '6px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'var(--brand-electric)' }}
        >
          <span>View All News & Circulars</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="feed-card-container">
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
            <span style={{ fontSize: '0.82rem' }}>Loading discovery feed...</span>
          </div>
        ) : feedItems.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {feedItems.map(item => {
              const badge = getFeedBadgeStyle(item);
              const BadgeIcon = badge.icon;

              return (
                <article
                  key={item.id}
                  onClick={() => navigateToModule(item.action?.targetModule || 'taluka-news-feed')}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-card, #ffffff)',
                    border: '1px solid var(--surface-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#93c5fd';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--surface-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: badge.color,
                          backgroundColor: badge.bg,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        <BadgeIcon size={11} />
                        <span>{badge.label}</span>
                      </span>

                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {formatDate(item.date)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.35 }}>
                      {item.title}
                    </h3>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.excerpt}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.sourceName || item.areaName}
                    </span>
                    <span style={{ color: 'var(--brand-electric)', fontWeight: 600 }}>
                      {item.action?.label || 'Read details'} →
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state-wrap" style={{ padding: '36px 20px' }}>
            <div className="empty-icon-wrapper" style={{ width: '48px', height: '48px' }}>
              <Newspaper size={24} style={{ color: 'var(--brand-electric)' }} />
            </div>
            <h3 className="empty-title">Taluka Discovery Feed Active</h3>
            <p className="empty-description" style={{ maxWidth: '480px', margin: '0 auto 16px' }}>
              Verified government circulars, events, and ground-level journalism are updated continuously. No fabricated articles are shown.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => navigateToModule('taluka-news-feed')}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Submit News or Circular</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
