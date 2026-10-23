import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  X,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

export default function AdminReportsTab({ onActionTaken }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [targetType, setTargetType] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [search, setSearch] = useState('');

  // Triage modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [newStatus, setNewStatus] = useState('under_review');
  const [newPriority, setNewPriority] = useState('normal');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [triageError, setTriageError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminReportsQueue({
        targetType,
        status,
        priority,
        search,
      });
      setReports(res.reports || []);
    } catch (err) {
      setError(err.message || 'Failed to load reports queue.');
    } finally {
      setLoading(false);
    }
  }, [targetType, status, priority, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openTriageModal = (rep) => {
    setSelectedReport(rep);
    setNewStatus(rep.status === 'received' || rep.status === 'submitted' ? 'under_review' : rep.status);
    setNewPriority(rep.priority || 'normal');
    setAdminNotes(rep.adminNotes || '');
    setResolutionNotes(rep.resolutionNotes || '');
    setTriageError(null);
  };

  const handleTriageSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    setSubmitting(true);
    setTriageError(null);

    try {
      await api.reviewAdminReport(selectedReport.id, {
        sourceQueue: selectedReport.sourceQueue,
        status: newStatus,
        priority: newPriority,
        adminNotes,
        resolutionNotes,
      });

      setSelectedReport(null);
      fetchReports();
      if (onActionTaken) onActionTaken();
    } catch (err) {
      setTriageError(err.message || 'Failed to update report triage.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters Bar */}
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
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
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
            <option value="all">All Targets (Listings, Emergency, News)</option>
            <option value="emergency_contact">Emergency Contacts (Urgent Safety)</option>
            <option value="listing">Marketplace & Jobs Listings</option>
            <option value="news">Taluka News Articles</option>
            <option value="business_profile">Business Profiles</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
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
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent Priority (Safety / Helpline)</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal Priority</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
            <option value="all">All Statuses</option>
            <option value="submitted">Received / New</option>
            <option value="under_review">Under Investigation</option>
            <option value="action_taken">Action Taken</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed / Inaccurate</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Search target or reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'var(--surface-subtle)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            minWidth: '220px',
          }}
        />
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'var(--status-crimson-bg)', color: '#f87171', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <span>Loading community reports...</span>
        </div>
      ) : reports.length === 0 ? (
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
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>No Active Reports</h4>
          <p style={{ fontSize: '0.82rem' }}>All community corrections and safety flags are resolved.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map((r) => {
            const isUrgent = r.priority === 'urgent' || r.targetType === 'emergency_contact';
            return (
              <div
                key={`${r.sourceQueue}-${r.id}`}
                style={{
                  background: 'var(--surface-card)',
                  border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.4)' : 'var(--surface-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '650px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isUrgent ? 'var(--status-crimson)' : 'var(--status-amber)',
                      }}
                    >
                      {isUrgent ? 'URGENT SAFETY' : `${r.priority || 'NORMAL'} PRIORITY`}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--surface-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {r.targetType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: r.status === 'resolved' ? 'var(--status-emerald)' : 'var(--text-muted)',
                      }}
                    >
                      Status: {r.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {r.targetTitle}
                  </div>

                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <strong>Reason:</strong> {r.reason} — {r.details}
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                    <span>Reported: {new Date(r.createdAt).toLocaleDateString()}</span>
                    {r.assignedReviewer && <span>Reviewer: {r.assignedReviewer}</span>}
                    {r.resolutionNotes && <span style={{ color: 'var(--status-emerald)' }}>Resolved</span>}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => openTriageModal(r)}
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      background: isUrgent ? 'var(--status-crimson)' : 'var(--brand-primary)',
                    }}
                  >
                    <span>Triage & Resolve</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Triage & Resolution Modal */}
      {selectedReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
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
              maxWidth: '680px',
              width: '100%',
              padding: '28px',
              position: 'relative',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <button
              onClick={() => setSelectedReport(null)}
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

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--status-crimson)', fontWeight: 700, textTransform: 'uppercase' }}>
                Report Resolution Desk
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {selectedReport.targetTitle}
              </h3>
            </div>

            <div
              style={{
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginBottom: '16px',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div><strong>Category:</strong> {selectedReport.reason}</div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong>Details:</strong> {selectedReport.details}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Note: Reporter identities and sensitive detection heuristics are protected and redacted by design.
              </div>
            </div>

            <form onSubmit={handleTriageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                    Triage Status:
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <option value="under_review">Under Investigation</option>
                    <option value="action_taken">Action Taken (Listing Held/Edited)</option>
                    <option value="resolved">Resolved (Correction Applied)</option>
                    <option value="dismissed">Dismissed (No Violation Found)</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                    Priority Level:
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <option value="urgent">Urgent (Safety / Helpline)</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Resolution Summary (Documented action taken):
                </label>
                <textarea
                  rows={2}
                  placeholder="Summarize investigation findings and action taken..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Internal Reviewer Notes:
                </label>
                <input
                  type="text"
                  placeholder="Optional internal remarks..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              {triageError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '8px', background: 'var(--status-crimson-bg)', borderRadius: '6px' }}>
                  {triageError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Updating...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
