import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import {
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  X,
  FileText,
  Building,
  User,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

const MODULE_OPTIONS = [
  { value: 'all', label: 'All Modules (10 Core Queues)' },
  { value: 'jobs', label: 'Jobs Hub' },
  { value: 'rentals', label: 'Rentals & PG' },
  { value: 'marketplace', label: 'Marketplace (New Only)' },
  { value: 'krishi_products', label: 'Krishi Produce' },
  { value: 'krishi_equipment', label: 'Krishi Equipment Rental' },
  { value: 'services', label: 'Local Services' },
  { value: 'events', label: 'Events Desk' },
  { value: 'news', label: 'Taluka News Feed' },
  { value: 'govt_notices', label: 'Government Notices' },
  { value: 'emergency_contacts', label: 'Emergency Contacts' },
];

const STATUS_OPTIONS = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'under_review', label: 'Hold / Under Review' },
  { value: 'action_needed', label: 'Action Needed' },
  { value: 'published', label: 'Published / Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'removed', label: 'Removed / Withdrawn' },
  { value: 'all', label: 'All Statuses' },
];

export default function AdminModerationTab({ onActionTaken }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('pending_review');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Inspection modal state
  const [inspectingItem, setInspectingItem] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [decision, setDecision] = useState('approve_publish');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminModerationQueue({
        module: selectedModule,
        status: selectedStatus,
        search: searchQuery,
        page,
        limit: 20,
      });
      setItems(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load moderation queue.');
    } finally {
      setLoading(false);
    }
  }, [selectedModule, selectedStatus, searchQuery, page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleInspect = async (item) => {
    setInspectingItem(null);
    setInspectLoading(true);
    setDecisionError(null);
    setDecision('approve_publish');
    setDecisionReason('');
    setDecisionNotes('');

    try {
      const res = await api.getAdminModerationDetail(item.module, item.id);
      setInspectingItem({
        ...item,
        fullDetails: res.item,
        history: res.history || [],
      });
    } catch (err) {
      alert(`Error loading inspection details: ${err.message}`);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleRecordDecision = async (e) => {
    e.preventDefault();
    if (!inspectingItem) return;

    if (decision !== 'approve_publish' && (!decisionReason || decisionReason.trim().length < 5)) {
      setDecisionError('A clear, documented reason (minimum 5 characters) is required for rejections, holds, or removals.');
      return;
    }

    setSubmittingDecision(true);
    setDecisionError(null);

    try {
      await api.recordAdminModerationDecision({
        module: inspectingItem.module,
        id: inspectingItem.id,
        decision,
        reason: decisionReason,
        notes: decisionNotes,
      });

      setInspectingItem(null);
      fetchQueue();
      if (onActionTaken) onActionTaken();
    } catch (err) {
      setDecisionError(err.message || 'Failed to record moderation decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Filter Controls */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Module Selector */}
          <select
            value={selectedModule}
            onChange={(e) => {
              setSelectedModule(e.target.value);
              setPage(1);
            }}
            className="input-select"
            style={{
              background: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-border)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {MODULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="input-select"
            style={{
              background: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-border)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 30px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
            }}
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--status-crimson-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.82rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Queue Items List */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <span>Loading queue items...</span>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
          }}
        >
          <CheckCircle2 size={36} style={{ color: 'var(--status-emerald)', margin: '0 auto 12px' }} />
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontSize: '1rem' }}>Queue Cleared</h4>
          <p style={{ fontSize: '0.82rem' }}>
            No submissions found matching criteria ({selectedModule}, {selectedStatus}).
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item) => (
            <div
              key={`${item.module}-${item.id}`}
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '650px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: 'var(--brand-electric)',
                    }}
                  >
                    {item.module.replace('_', ' ')}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background:
                        item.status === 'published'
                          ? 'var(--status-emerald-bg)'
                          : item.status === 'rejected'
                          ? 'var(--status-crimson-bg)'
                          : 'var(--status-amber-bg)',
                      color:
                        item.status === 'published'
                          ? 'var(--status-emerald)'
                          : item.status === 'rejected'
                          ? 'var(--status-crimson)'
                          : 'var(--status-amber)',
                    }}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                  {item.category && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      • {item.category}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.title}
                </div>

                {item.summary && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {item.summary}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '14px', fontSize: '0.74rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  {item.submitterName && <span>Submitter: {item.submitterName}</span>}
                  {item.businessName && <span>Business: {item.businessName}</span>}
                  <span>Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleInspect(item)}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <Eye size={15} />
                  <span>Inspect & Review</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Inspection & Decision Modal */}
      {inspectingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setInspectingItem(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--brand-electric)', fontWeight: 700, textTransform: 'uppercase' }}>
                Inspection Console • {inspectingItem.module}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {inspectingItem.title}
              </h3>
            </div>

            {/* Content Details Block */}
            <div
              style={{
                background: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div>
                <strong>Current Status:</strong>{' '}
                <span style={{ color: 'var(--brand-electric)' }}>{inspectingItem.status}</span>
              </div>
              {inspectingItem.fullDetails?.description && (
                <div>
                  <strong>Description:</strong>
                  <div style={{ marginTop: '4px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {inspectingItem.fullDetails.description}
                  </div>
                </div>
              )}
              {inspectingItem.fullDetails?.price && (
                <div>
                  <strong>Price / Tariff:</strong> ₹{Number(inspectingItem.fullDetails.price).toLocaleString()} / {inspectingItem.fullDetails.price_period || 'unit'}
                </div>
              )}
              {inspectingItem.fullDetails?.contact_phone && (
                <div>
                  <strong>Contact Phone:</strong> {inspectingItem.fullDetails.contact_phone}
                </div>
              )}
              {inspectingItem.fullDetails?.moderation_notes && (
                <div style={{ color: 'var(--status-amber)' }}>
                  <strong>Prior Moderation Notes:</strong> {inspectingItem.fullDetails.moderation_notes}
                </div>
              )}
            </div>

            {/* Decision Form */}
            <form onSubmit={handleRecordDecision} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Consequential Moderation Decision:
                </label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="approve_publish">Approve & Publish to Public Directory</option>
                  <option value="request_changes">Request Changes (Action Needed by Submitter)</option>
                  <option value="hold_review">Hold for Further Investigation</option>
                  <option value="reject">Reject Submission</option>
                  <option value="remove_unpublish">Remove / Unpublish from Public View</option>
                </select>
              </div>

              {decision !== 'approve_publish' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Reason for {decision.replace('_', ' ').toUpperCase()} (Required, Min 5 characters):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific, lawful, and meaningful justification explaining this decision..."
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      resize: 'vertical',
                    }}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Internal Reviewer Notes (Audit trail only):
                </label>
                <input
                  type="text"
                  placeholder="Optional internal reviewer remarks..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              {decisionError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '8px 12px', background: 'var(--status-crimson-bg)', borderRadius: 'var(--radius-md)' }}>
                  {decisionError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision}
                  className="btn-primary"
                  style={{
                    padding: '10px 22px',
                    fontSize: '0.85rem',
                    cursor: submittingDecision ? 'not-allowed' : 'pointer',
                    background:
                      decision === 'approve_publish'
                        ? 'var(--brand-primary)'
                        : decision === 'reject' || decision === 'remove_unpublish'
                        ? 'var(--status-crimson)'
                        : 'var(--status-amber)',
                  }}
                >
                  {submittingDecision ? 'Recording on Server...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
