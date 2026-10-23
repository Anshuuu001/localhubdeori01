import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import ActivityDetailModal from './ActivityDetailModal';
import {
  Clock,
  Briefcase,
  Home,
  Wrench,
  Car,
  Package,
  MessageSquare,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Send,
  AlertCircle,
  Inbox,
  CheckCircle2,
} from 'lucide-react';

const MODULE_TABS = [
  { id: 'all', label: 'All Activity', icon: Clock },
  { id: 'jobs', label: 'Job Applications', icon: Briefcase },
  { id: 'enquiries', label: 'Property & Inquiries', icon: Home },
  { id: 'services', label: 'Local Services', icon: Wrench },
  { id: 'rides', label: 'Ride Bookings', icon: Car },
  { id: 'deliveries', label: 'Local Deliveries', icon: Package },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'pending', label: 'Pending / Submitted' },
  { id: 'in_progress', label: 'In Progress / Shortlisted' },
  { id: 'completed', label: 'Completed / Hired' },
  { id: 'cancelled', label: 'Cancelled / Rejected' },
];

export default function MyActivityDashboard() {
  const { user, openAuthModal, navigateToModule, navigateToHome } = useApp();

  const [activeType, setActiveType] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedItem, setSelectedItem] = useState(null);

  const fetchActivity = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.getMyActivity({
        type: activeType,
        status: activeStatus,
        sort: sortOrder,
        search: searchQuery,
        page,
        limit: 12,
      });

      setItems(res.items || []);
      setPagination(res.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
      setSummary(res.summary || { total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load activity. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, activeType, activeStatus, sortOrder, searchQuery, page]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (!user) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '32px 24px', textAlign: 'center', backgroundColor: 'var(--surface-card)', borderRadius: '12px', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--brand-blue-bg)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Clock size={28} />
        </div>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 800 }}>
          Log In to Track Your Personal Activity
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.5 }}>
          View live status timelines for your direct job applications, rental inquiries, service bookings, and local ride & delivery requests.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="btn btn-primary"
          style={{ padding: '10px 24px' }}
        >
          Sign In to LocalHub X
        </button>
      </div>
    );
  }

  const getModuleIcon = (type) => {
    switch (type) {
      case 'jobs': return Briefcase;
      case 'enquiries': return Home;
      case 'services': return Wrench;
      case 'rides': return Car;
      case 'deliveries': return Package;
      default: return Clock;
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    let bg = 'rgba(56, 189, 248, 0.12)';
    let color = 'var(--brand-electric)';
    let border = 'rgba(56, 189, 248, 0.25)';

    if (['hired', 'completed'].includes(s)) {
      bg = 'rgba(16, 185, 129, 0.12)';
      color = 'var(--status-emerald)';
      border = 'rgba(16, 185, 129, 0.25)';
    } else if (['rejected', 'withdrawn', 'cancelled', 'expired'].includes(s)) {
      bg = 'rgba(239, 68, 68, 0.12)';
      color = 'var(--status-crimson)';
      border = 'rgba(239, 68, 68, 0.25)';
    } else if (['shortlisted', 'accepted', 'in_progress', 'responded'].includes(s)) {
      bg = 'rgba(245, 158, 11, 0.12)';
      color = 'var(--status-amber)';
      border = 'rgba(245, 158, 11, 0.25)';
    }

    return (
      <span
        style={{
          padding: '3px 8px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          fontSize: '0.72rem',
          fontWeight: 700,
          textTransform: 'capitalize',
        }}
      >
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="activity-dashboard" style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              My Activity Dashboard
            </h1>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'var(--brand-blue-bg)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: 'var(--brand-electric)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {summary.total} Total
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Persistent tracking across jobs, rentals, services, rides & parcel deliveries in Deori Taluka.
          </div>
        </div>

        <button
          onClick={fetchActivity}
          className="btn btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Confirmation</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-electric)', marginTop: '2px' }}>
            {summary.pending}
          </div>
        </div>

        <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In Progress / Active</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--status-amber)', marginTop: '2px' }}>
            {summary.inProgress}
          </div>
        </div>

        <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed / Hired</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--status-emerald)', marginTop: '2px' }}>
            {summary.completed}
          </div>
        </div>

        <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cancelled / Closed</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fca5a5', marginTop: '2px' }}>
            {summary.cancelled}
          </div>
        </div>
      </div>

      {/* Module Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '16px',
        }}
      >
        {MODULE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveType(tab.id); setPage(1); }}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-full)',
                border: isActive ? '1px solid var(--brand-electric)' : '1px solid var(--surface-border)',
                backgroundColor: isActive ? 'var(--brand-blue-bg)' : 'var(--surface-card)',
                color: isActive ? 'var(--brand-electric)' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        {/* Status Dropdown */}
        <select
          value={activeStatus}
          onChange={(e) => { setActiveStatus(e.target.value); setPage(1); }}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'var(--surface-ground)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
          }}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.id} value={f.id} style={{ background: '#ffffff', color: 'var(--text-primary)' }}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Sort Order */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'var(--surface-ground)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
          }}
        >
          <option value="newest" style={{ background: '#ffffff', color: 'var(--text-primary)' }}>Newest First</option>
          <option value="oldest" style={{ background: '#ffffff', color: 'var(--text-primary)' }}>Oldest First</option>
        </select>

        {/* Search input */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search by title, reference ID, or provider..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-ground)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
            }}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: 'var(--status-crimson-bg)',
            border: '1px solid var(--status-crimson-border)',
            color: 'var(--status-crimson)',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Activity List */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your request history...
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--surface-card)',
            borderRadius: '12px',
            border: '1px solid var(--surface-border)',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-subtle)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Inbox size={26} />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 700 }}>
            No Activity Found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            {searchQuery
              ? `No requests match "${searchQuery}". Try clearing search filters.`
              : 'You have not submitted any applications, inquiries, or ride/service requests under this filter.'}
          </p>
          <button
            onClick={() => navigateToHome()}
            className="btn btn-secondary"
            style={{ padding: '8px 18px', fontSize: '0.82rem' }}
          >
            Explore Local Modules
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {items.map((item) => {
            const Icon = getModuleIcon(item.itemType);
            return (
              <div
                key={`${item.itemType}-${item.id}`}
                onClick={() => setSelectedItem(item)}
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  boxShadow: 'var(--shadow-xs)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#93c5fd';
                  e.currentTarget.style.backgroundColor = 'var(--surface-card-hover)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--surface-border)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-card)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--brand-blue-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-primary)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--brand-blue-bg)',
                          border: '1px solid #bfdbfe',
                          color: 'var(--brand-primary)',
                          fontWeight: 700,
                        }}
                      >
                        {item.referenceId}
                      </span>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {item.title}
                      </h4>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {item.counterpartyName} • {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Right side: Status, Integrity Tag & Arrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {item.listingStatus && item.listingStatus !== 'published' && (
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--status-crimson-bg)',
                        border: '1px solid var(--status-crimson-border)',
                        color: 'var(--status-crimson)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                    >
                      [Listing {item.listingStatus}]
                    </span>
                  )}

                  {getStatusBadge(item.status)}

                  <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <ActivityDetailModal
          item={selectedItem}
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={fetchActivity}
        />
      )}
    </div>
  );
}
