import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import ActivityDetailModal from '../activity/ActivityDetailModal';
import {
  Clock,
  Send,
  ShieldCheck,
  ArrowRight,
  Briefcase,
  Home,
  Wrench,
  Car,
  Package,
  CheckCircle2,
  AlertCircle,
  LogIn,
  RefreshCw,
} from 'lucide-react';

const TYPE_CONFIG = {
  job: { label: 'Job Application', icon: Briefcase, color: '#38bdf8' },
  enquiry: { label: 'Listing Enquiry', icon: Home, color: '#a78bfa' },
  service: { label: 'Service Booking', icon: Wrench, color: '#f59e0b' },
  ride: { label: 'Ride Booking', icon: Car, color: '#10b981' },
  delivery: { label: 'Parcel Delivery', icon: Package, color: '#ec4899' },
};

function getStatusStyle(status) {
  switch (status) {
    case 'submitted':
    case 'sent':
    case 'pending':
      return { bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)', color: 'var(--brand-electric)' };
    case 'in_progress':
    case 'viewed':
    case 'shortlisted':
    case 'accepted':
      return { bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', color: '#fbbf24' };
    case 'completed':
    case 'hired':
    case 'responded':
    case 'closed':
      return { bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.3)', color: 'var(--status-emerald)' };
    case 'rejected':
    case 'cancelled':
    case 'withdrawn':
    case 'expired':
      return { bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.3)', color: 'var(--status-crimson)' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.25)', color: 'var(--text-muted)' };
  }
}

export default function RecentActivitySection() {
  const { user, openAuthModal, navigateToModule } = useApp();

  const [activities, setActivities] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchRecent = useCallback(async () => {
    if (!user) {
      setActivities([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    try {
      const res = await api.getMyActivity({ limit: 4, page: 1 });
      setActivities(res.items || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.warn('[RecentActivitySection] Failed to load activity:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  return (
    <section id="activity-section" aria-label="Recent Activity" style={{ marginBottom: '32px' }}>
      <div className="section-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            <Clock size={22} style={{ color: 'var(--brand-electric)' }} />
            <span>My Recent Activity</span>
          </h2>
          <p className="section-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Track real-time status updates for your direct applications, local enquiries, and service requests.
          </p>
        </div>

        {user && activities.length > 0 && (
          <button
            onClick={() => navigateToModule('my-activity')}
            className="header-btn"
            style={{ width: 'auto', padding: '0 12px', gap: '6px', fontSize: '0.78rem', color: 'var(--brand-electric)', borderColor: 'rgba(56, 189, 248, 0.3)' }}
          >
            <span>View Full Activity Hub ({totalCount})</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {!user ? (
        <div className="feed-card-container">
          <div className="empty-state-wrap">
            <div className="empty-icon-wrapper">
              <Send size={26} />
            </div>
            <h3 className="empty-title">Sign In to Track Your Activity</h3>
            <p className="empty-description">
              Sign in with your phone or email to track your job applications, rental enquiries, driver bookings, and local service requests in real-time.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                marginBottom: '16px',
              }}
            >
              <ShieldCheck size={14} style={{ color: 'var(--status-emerald)' }} />
              <span>Zero fee guarantee. Your personal contact details are protected.</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => openAuthModal('login')}
                className="empty-action-btn"
                style={{ backgroundColor: 'var(--brand-electric)', color: '#0f172a', fontWeight: 700 }}
              >
                <LogIn size={15} />
                <span>Sign In to Track</span>
              </button>
              <button
                onClick={() => navigateToModule('local-services')}
                className="empty-action-btn"
              >
                <span>Explore Local Services</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : loading && activities.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {[1, 2].map(n => (
            <div
              key={n}
              style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                borderRadius: '12px',
                padding: '16px',
                minHeight: '120px',
                animation: 'pulse 1.5s infinite',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="feed-card-container">
          <div className="empty-state-wrap">
            <div className="empty-icon-wrapper">
              <Send size={26} />
            </div>
            <h3 className="empty-title">No Activity Recorded Yet</h3>
            <p className="empty-description">
              You haven't submitted any job applications, rental enquiries, or service requests yet. When you interact with local providers in Deori Taluka, your status log will appear here.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                marginBottom: '16px',
              }}
            >
              <ShieldCheck size={14} style={{ color: 'var(--status-emerald)' }} />
              <span>All requests use persistent audit history and secure provider verification.</span>
            </div>

            <button
              onClick={() => navigateToModule('local-services')}
              className="empty-action-btn"
            >
              <span>Explore Local Services</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {activities.map((item) => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.service;
              const IconComp = cfg.icon;
              const statusStyle = getStatusStyle(item.status);

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'var(--surface-border)';
                  }}
                >
                  <div>
                    {/* Header: Type Pill & Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: cfg.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <IconComp size={13} />
                        <span>{cfg.label}</span>
                      </span>

                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                          color: statusStyle.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Title */}
                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#fff',
                        marginBottom: '6px',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.title}
                    </div>

                    {/* Provider / Context */}
                    {item.businessName && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Provider: <strong>{item.businessName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Footer Timestamp & Action Link */}
                  <div
                    style={{
                      borderTop: '1px solid var(--surface-border-subtle)',
                      paddingTop: '10px',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span style={{ color: 'var(--brand-electric)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      Track Details <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <button
              onClick={() => navigateToModule('my-activity')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-electric)',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <span>Open My Activity Hub to view full history, filters & status audits</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {selectedItem && (
        <ActivityDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={() => {
            fetchRecent();
            setSelectedItem(null);
          }}
        />
      )}
    </section>
  );
}
