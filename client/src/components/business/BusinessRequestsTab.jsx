import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import {
  Inbox,
  Briefcase,
  Home,
  Wrench,
  Car,
  Package,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  User,
  AlertCircle,
  RefreshCw,
  Send,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';

export default function BusinessRequestsTab({ businessProfileId, businessRole }) {
  const [activeType, setActiveType] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ total: 0, unhandled: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status Action Modal State
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    item: null,
    targetStatus: '',
    title: '',
    reason: '',
    notes: '',
    responseMessage: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchRequests = useCallback(async () => {
    if (!businessProfileId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.getBusinessRequests(businessProfileId, {
        type: activeType,
        status: activeStatus,
        page,
        limit: 12,
      });

      setItems(res.items || []);
      setPagination(res.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
      setSummary(res.summary || { total: 0, unhandled: 0, active: 0, completed: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load business requests.');
    } finally {
      setLoading(false);
    }
  }, [businessProfileId, activeType, activeStatus, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openActionModal = (item, targetStatus, title) => {
    setActionModal({
      isOpen: true,
      item,
      targetStatus,
      title,
      reason: '',
      notes: '',
      responseMessage: '',
    });
    setActionError(null);
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      item: null,
      targetStatus: '',
      title: '',
      reason: '',
      notes: '',
      responseMessage: '',
    });
    setActionError(null);
  };

  const handleExecuteStatusUpdate = async (e) => {
    e.preventDefault();
    const { item, targetStatus, reason, notes, responseMessage } = actionModal;
    if (!item) return;

    setActionLoading(true);
    setActionError(null);

    try {
      if (item.itemType === 'jobs') {
        await api.updateJobApplicationStatus(item.id, {
          status: targetStatus,
          reason,
          notes,
        });
      } else if (item.itemType === 'enquiries') {
        if (targetStatus === 'responded') {
          await api.respondToEnquiry(item.id, responseMessage);
        } else if (targetStatus === 'closed') {
          await api.closeEnquiry(item.id, reason);
        } else if (targetStatus === 'viewed') {
          await api.markEnquiryViewed(item.id);
        }
      } else if (item.itemType === 'services') {
        await api.updateServiceRequestStatus(item.id, {
          status: targetStatus,
          reason,
          notes,
        });
      } else if (item.itemType === 'rides' || item.itemType === 'deliveries') {
        await api.updateTransitRequestStatus(item.id, {
          status: targetStatus,
          reason,
          businessId: businessProfileId,
        });
      }

      closeActionModal();
      fetchRequests();
    } catch (err) {
      setActionError(err.message || 'Failed to execute status update. Please try again.');
    } finally {
      setActionLoading(false);
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
    } else if (['rejected', 'withdrawn', 'cancelled', 'closed'].includes(s)) {
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
    <div className="business-requests-tab" style={{ paddingBottom: '32px' }}>
      {/* Top Counters Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'var(--surface-bg-alt)', border: '1px solid var(--surface-border)' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Incoming / Unhandled</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-electric)', marginTop: '2px' }}>
            {summary.unhandled}
          </div>
        </div>

        <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'var(--surface-bg-alt)', border: '1px solid var(--surface-border)' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>In Review / Active</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--status-amber)', marginTop: '2px' }}>
            {summary.active}
          </div>
        </div>

        <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Completed / Concluded</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--status-emerald)', marginTop: '2px' }}>
            {summary.completed}
          </div>
        </div>

        <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Records</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            {summary.total}
          </div>
        </div>
      </div>

      {/* Module Type Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px' }}>
        {[
          { id: 'all', label: 'All Requests' },
          { id: 'jobs', label: 'Job Applications' },
          { id: 'enquiries', label: 'Inquiries' },
          { id: 'services', label: 'Service Bookings' },
          { id: 'transit', label: 'Ride & Delivery' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveType(tab.id); setPage(1); }}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: activeType === tab.id ? '1px solid var(--brand-primary)' : '1px solid var(--surface-border)',
              backgroundColor: activeType === tab.id ? 'var(--brand-blue-bg)' : 'var(--surface-card)',
              color: activeType === tab.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: activeType === tab.id ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading customer requests...
        </div>
      ) : error ? (
        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--status-crimson-bg)', border: '1px solid var(--status-crimson-border)', color: 'var(--status-crimson)', fontSize: '0.85rem' }}>
          {error}
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--surface-subtle)', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
          <Inbox size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '6px', fontWeight: 700 }}>No Customer Requests Found</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Incoming job applications, rental enquiries, service requests, and transit calls will populate here in real time.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {items.map((item) => (
            <div
              key={`${item.itemType}-${item.id}`}
              style={{
                padding: '16px 20px',
                borderRadius: '10px',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--brand-blue-bg)', border: '1px solid #bfdbfe', color: 'var(--brand-primary)', fontWeight: 700 }}>
                      {item.referenceId}
                    </span>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {item.title}
                    </h4>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Received: {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  {getStatusBadge(item.status)}
                </div>
              </div>

              {/* Customer Info & Message */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border-subtle)',
                  fontSize: '0.84rem',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    <User size={14} style={{ color: 'var(--brand-primary)' }} />
                    <strong>{item.customerName || 'Customer'}</strong>
                  </div>
                  {item.customerPhone && (
                    <a
                      href={`tel:${item.customerPhone}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-emerald)', textDecoration: 'none', fontWeight: 600 }}
                    >
                      <Phone size={14} />
                      <span>{item.customerPhone}</span>
                    </a>
                  )}
                  {item.customerEmail && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {item.customerEmail}
                    </span>
                  )}
                </div>

                {item.customerMessage && (
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    "{item.customerMessage}"
                  </p>
                )}
              </div>

              {/* Action Buttons based on item type and current status */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                {/* Job Application Actions */}
                {item.itemType === 'jobs' && (
                  <>
                    {item.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => openActionModal(item, 'shortlisted', 'Shortlist Candidate')}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--status-amber)' }}
                        >
                          Shortlist
                        </button>
                        <button
                          onClick={() => openActionModal(item, 'rejected', 'Decline Application')}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--status-crimson)' }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {item.status === 'shortlisted' && (
                      <>
                        <button
                          onClick={() => openActionModal(item, 'hired', 'Confirm Hire')}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                        >
                          Confirm Hire
                        </button>
                        <button
                          onClick={() => openActionModal(item, 'rejected', 'Decline Application')}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--status-crimson)' }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Enquiry Actions */}
                {item.itemType === 'enquiries' && (
                  <>
                    {item.status === 'sent' && (
                      <button
                        onClick={() => openActionModal(item, 'viewed', 'Mark as Viewed')}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        Mark Viewed
                      </button>
                    )}
                    {['sent', 'viewed'].includes(item.status) && (
                      <button
                        onClick={() => openActionModal(item, 'responded', 'Respond to Customer')}
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        Send Response
                      </button>
                    )}
                    {['sent', 'viewed', 'responded'].includes(item.status) && (
                      <button
                        onClick={() => openActionModal(item, 'closed', 'Close Enquiry')}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        Close
                      </button>
                    )}
                  </>
                )}

                {/* Service Request Actions */}
                {item.itemType === 'services' && (
                  <>
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openActionModal(item, 'accepted', 'Accept Service Booking')}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                        >
                          Accept Booking
                        </button>
                        <button
                          onClick={() => openActionModal(item, 'rejected', 'Decline Service Request')}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--status-crimson)' }}
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {item.status === 'accepted' && (
                      <button
                        onClick={() => openActionModal(item, 'in_progress', 'Start Service Work')}
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        Mark In Progress
                      </button>
                    )}
                    {item.status === 'in_progress' && (
                      <button
                        onClick={() => openActionModal(item, 'completed', 'Mark Service Completed')}
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem', backgroundColor: 'var(--status-emerald)', borderColor: 'var(--status-emerald)' }}
                      >
                        Mark Completed
                      </button>
                    )}
                  </>
                )}

                {/* Transit Request Actions */}
                {(item.itemType === 'rides' || item.itemType === 'deliveries') && (
                  <>
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openActionModal(item, 'accepted', `Accept ${item.itemType === 'rides' ? 'Ride' : 'Delivery'}`)}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                        >
                          Accept Request
                        </button>
                        <button
                          onClick={() => openActionModal(item, 'rejected', 'Decline Transit Request')}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--status-crimson)' }}
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {item.status === 'accepted' && (
                      <button
                        onClick={() => openActionModal(item, 'in_progress', `Mark ${item.itemType === 'rides' ? 'Ride' : 'Delivery'} In Progress`)}
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        En Route
                      </button>
                    )}
                    {item.status === 'in_progress' && (
                      <button
                        onClick={() => openActionModal(item, 'completed', 'Mark Completed')}
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem', backgroundColor: 'var(--status-emerald)', borderColor: 'var(--status-emerald)' }}
                      >
                        Complete Run
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
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

      {/* Status Action Dialog Modal */}
      {actionModal.isOpen && (
        <div className="modal-overlay" onClick={closeActionModal} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface-border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {actionModal.title}
              </h3>
              <button onClick={closeActionModal} className="modal-close-btn"><X size={18} /></button>
            </div>

            <form onSubmit={handleExecuteStatusUpdate} style={{ padding: '20px' }}>
              {actionError && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '14px' }}>
                  {actionError}
                </div>
              )}

              {/* Response Message input for Enquiries */}
              {actionModal.targetStatus === 'responded' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Response Message to Customer *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={actionModal.responseMessage}
                    onChange={(e) => setActionModal({ ...actionModal, responseMessage: e.target.value })}
                    placeholder="Provide details, visiting hours, or next steps..."
                    style={{ width: '100%', padding: '10px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              {/* Rejection / Decline Reason input */}
              {actionModal.targetStatus === 'rejected' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Reason for Declining *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={actionModal.reason}
                    onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
                    placeholder="e.g. Position filled, outside service territory, or fully booked..."
                    style={{ width: '100%', padding: '10px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              {/* Optional Notes for Shortlist / Hire / Accept */}
              {['shortlisted', 'hired', 'accepted', 'in_progress', 'completed', 'closed'].includes(actionModal.targetStatus) && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Internal Note / Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={actionModal.notes || actionModal.reason}
                    onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value, reason: e.target.value })}
                    placeholder="e.g. Candidate invited for trial, job completed with warranty"
                    style={{ width: '100%', padding: '10px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={closeActionModal} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.82rem',
                    backgroundColor: actionModal.targetStatus === 'rejected' ? 'var(--status-crimson)' : 'var(--brand-electric)',
                    borderColor: actionModal.targetStatus === 'rejected' ? 'var(--status-crimson)' : 'var(--brand-electric)',
                  }}
                >
                  {actionLoading ? 'Updating...' : 'Confirm Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
