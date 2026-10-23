import React from 'react';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Users,
  Building,
  CheckCircle2,
  Activity,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminOverviewTab({ summary, loading, onSelectTab }) {
  if (loading || !summary) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <span>Loading authentic administrative metrics from database...</span>
      </div>
    );
  }

  const { counts, moduleBreakdown, verificationStats, recentActivity } = summary;

  const kpis = [
    {
      id: 'pending-reviews',
      title: 'Pending Content Reviews',
      count: counts.pendingReviews,
      icon: Clock,
      color: 'var(--brand-electric)',
      bg: 'rgba(56, 189, 248, 0.1)',
      tab: 'moderation',
      subtitle: 'Across listings, civic events, news & notices',
    },
    {
      id: 'verifications',
      title: 'Verification Requests',
      count: counts.verificationRequests,
      icon: ShieldCheck,
      color: 'var(--status-emerald)',
      bg: 'rgba(16, 185, 129, 0.1)',
      tab: 'verifications',
      subtitle: `${verificationStats.action_needed || 0} requiring applicant action`,
    },
    {
      id: 'reports',
      title: 'Active Community Reports',
      count: counts.activeReports,
      icon: AlertTriangle,
      color: counts.urgentCorrections > 0 ? 'var(--status-crimson)' : 'var(--status-amber)',
      bg: counts.urgentCorrections > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.1)',
      tab: 'reports',
      subtitle: `${counts.urgentCorrections} urgent safety/emergency corrections`,
      urgent: counts.urgentCorrections > 0,
    },
    {
      id: 'appeals',
      title: 'Appeals & Restrictions',
      count: counts.pendingAppeals,
      icon: Scale,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.1)',
      tab: 'restrictions',
      subtitle: `${counts.activeRestrictions} active restrictions enforced`,
    },
  ];

  const moduleNames = {
    jobs: 'Jobs Hub',
    rentals: 'Rentals & PG',
    marketplace: 'New Marketplace',
    krishi_products: 'Krishi Produce',
    krishi_equipment: 'Krishi Machinery',
    services: 'Local Services',
    business_directory: 'Business Profiles',
    events: 'Events Desk',
    news: 'Taluka News Feed',
    govt_notices: 'Govt Notices',
    emergency_contacts: 'Emergency Contacts',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Urgent Alert Banner if Urgent Corrections Exist */}
      {counts.urgentCorrections > 0 && (
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--status-crimson-bg)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={22} style={{ color: 'var(--status-crimson)' }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                Urgent Public Safety Corrections Queue ({counts.urgentCorrections})
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Authoritative emergency contact inaccuracy or safety-critical reports require immediate triage.
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('reports')}
            className="btn-primary"
            style={{
              background: 'var(--status-crimson)',
              borderColor: 'rgba(239, 68, 68, 0.5)',
              padding: '8px 16px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Triage Urgent Reports
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              onClick={() => onSelectTab(kpi.tab)}
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = kpi.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--surface-border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {kpi.title}
                  </span>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: kpi.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: kpi.color,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {kpi.count}
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--surface-border-subtle)',
                  paddingTop: '8px',
                }}
              >
                <span>{kpi.subtitle}</span>
                <ChevronRight size={14} style={{ color: kpi.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Module Workload Breakdown + System Footprint */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Module Pending Queue Distribution */}
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Layers size={18} style={{ color: 'var(--brand-electric)' }} />
            <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Module Workload & Queues
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(moduleBreakdown || {}).map(([key, count]) => (
              <div
                key={key}
                onClick={() => onSelectTab('moderation')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{moduleNames[key] || key}</span>
                <span
                  style={{
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    background: count > 0 ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: count > 0 ? 'var(--brand-electric)' : 'var(--text-muted)',
                  }}
                >
                  {count} pending
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Activity & Platform Footprint */}
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Activity size={18} style={{ color: 'var(--status-emerald)' }} />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Platform Footprint (Deori Taluka)
              </h3>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{counts.totalUsers}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Registered Citizens</div>
              </div>
              <div style={{ background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{counts.activeBusinesses}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Local Businesses</div>
              </div>
              <div style={{ background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{counts.publishedListings}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Live Listings</div>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              All counts are queried in real time with parameterized SQL from the production database schema.
              LocalHub X adheres to zero fabricated verification, authentic data integrity, and strict least privilege.
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--surface-border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Deori HQ • Non-GPS Locality • Audit-Logged
            </span>
            <button
              onClick={() => onSelectTab('audit')}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              View Full Audit Trail
            </button>
          </div>
        </div>
      </div>

      {/* Recent Authorized Admin Activity Feed */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Recent Authorized Administrative Actions
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Append-only audit trail
          </span>
        </div>

        {recentActivity && recentActivity.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentActivity.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border-subtle)',
                  fontSize: '0.8rem',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      color: 'var(--brand-electric)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {act.action}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{act.actorName}</span>
                  <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    target: {act.entityType} ({act.entityId || 'general'})
                  </span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                  {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No recent administrative actions recorded.
          </div>
        )}
      </div>
    </div>
  );
}
