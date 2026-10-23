import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function AdminAuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  // Filters
  const [actionSearch, setActionSearch] = useState('');
  const [entityType, setEntityType] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Expanded log row
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminAuditLogs({
        action: actionSearch,
        entityType,
        page,
        limit,
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to retrieve audit records.');
    } finally {
      setLoading(false);
    }
  }, [actionSearch, entityType, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Honest Tamper-Resistance Notice (Rule G) */}
      <div
        style={{
          background: 'var(--surface-subtle)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={18} style={{ color: 'var(--brand-electric)', flexShrink: 0 }} />
        <div>
          <strong>Append-Only Application Audit Trail:</strong> Every administrative decision, moderation action, role grant, document access, and restriction is recorded in MySQL with sanitized metadata. Ordinary application endpoints cannot edit or truncate logs. Note: Hardware-level write-once immutability is not claimed.
        </div>
      </div>

      {/* Filter Bar */}
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
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
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
            <option value="all">All Entity Types</option>
            <option value="user">User & Roles</option>
            <option value="jobs">Jobs Hub</option>
            <option value="rentals">Rentals</option>
            <option value="marketplace">Marketplace</option>
            <option value="services">Services</option>
            <option value="events">Events</option>
            <option value="news">News</option>
            <option value="govt_notices">Govt Notices</option>
            <option value="emergency_contacts">Emergency Contacts</option>
            <option value="verification_request">Verification Requests</option>
            <option value="account_restriction">Restrictions</option>
            <option value="restriction_appeal">Appeals</option>
          </select>

          <input
            type="text"
            placeholder="Filter action (e.g. moderation., admin.)..."
            value={actionSearch}
            onChange={(e) => {
              setActionSearch(e.target.value);
              setPage(1);
            }}
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

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Showing {logs.length} of {total} records (Page {page})
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'var(--status-crimson-bg)', color: '#f87171', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <span>Querying audit records...</span>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)' }}>
          No audit records matching criteria.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.82rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: 'var(--brand-electric)',
                      }}
                    >
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{log.actorName}</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'var(--surface-subtle)',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {log.actorRole}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      target: <strong>{log.entityType}</strong> {log.entityId ? `(${log.entityId.slice(0, 8)}...)` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--surface-border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      fontSize: '0.76rem',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)' }}>
                      <span>IP Address: {log.ipAddress || 'Internal / Proxy'}</span>
                      <span>User Agent: {log.userAgent ? log.userAgent.slice(0, 60) : 'Server Execution'}</span>
                    </div>

                    <div style={{ marginTop: '4px' }}>
                      <strong style={{ color: 'var(--text-secondary)' }}>Sanitized Payload:</strong>
                      <pre
                        style={{
                          background: 'var(--surface-subtle)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginTop: '4px',
                          fontFamily: 'monospace',
                          overflowX: 'auto',
                          color: '#38bdf8',
                        }}
                      >
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * limit >= total}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem', cursor: page * limit >= total ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
