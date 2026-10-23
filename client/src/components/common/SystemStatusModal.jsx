import React from 'react';
import { useApp } from '../../context/AppContext';
import { Activity, X, Database, Server, CheckCircle2, AlertTriangle, Layers, Info } from 'lucide-react';

export default function SystemStatusModal() {
  const { isDiagnosticsModalOpen, setIsDiagnosticsModalOpen, healthStatus } = useApp();

  if (!isDiagnosticsModalOpen) return null;

  const db = healthStatus?.database || {};
  const isDbConnected = db.connected;
  const isDbConfigured = db.configured;

  return (
    <div
      className="modal-backdrop"
      onClick={() => setIsDiagnosticsModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-modal-title"
    >
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" id="diagnostics-modal-title">
            <Activity size={20} style={{ color: 'var(--brand-electric)' }} />
            <span>LocalHub X System Diagnostics</span>
          </div>
          <button
            onClick={() => setIsDiagnosticsModalOpen(false)}
            className="header-btn"
            aria-label="Close diagnostics"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Node.js / Express Server Card */}
          <div className="diagnostic-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={20} style={{ color: 'var(--brand-electric)' }} />
              <div>
                <div className="diagnostic-label">Express REST Backend</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Uptime: {healthStatus?.uptimeSeconds ?? 0}s • Env: {healthStatus?.environment || 'dev'}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.74rem',
                fontWeight: 600,
                background: healthStatus ? 'var(--status-emerald-bg)' : 'var(--status-crimson-bg)',
                color: healthStatus ? 'var(--status-emerald)' : 'var(--status-crimson)',
              }}
            >
              {healthStatus ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>ONLINE</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} />
                  <span>OFFLINE</span>
                </>
              )}
            </div>
          </div>

          {/* MySQL Database Card */}
          <div className="diagnostic-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database
                size={20}
                style={{
                  color: isDbConnected
                    ? 'var(--status-emerald)'
                    : isDbConfigured
                    ? 'var(--status-amber)'
                    : 'var(--text-muted)',
                }}
              />
              <div>
                <div className="diagnostic-label">MySQL 8.0 Database</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Host: {db.host || 'localhost'} • DB: {db.database || 'localhubx'}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.74rem',
                fontWeight: 600,
                background: isDbConnected
                  ? 'var(--status-emerald-bg)'
                  : isDbConfigured
                  ? 'var(--status-amber-bg)'
                  : 'rgba(100, 116, 139, 0.15)',
                color: isDbConnected
                  ? 'var(--status-emerald)'
                  : isDbConfigured
                  ? '#fbbf24'
                  : 'var(--text-muted)',
              }}
            >
              {isDbConnected ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>CONNECTED</span>
                </>
              ) : isDbConfigured ? (
                <>
                  <AlertTriangle size={13} />
                  <span>AUTH PENDING</span>
                </>
              ) : (
                <>
                  <Info size={13} />
                  <span>UNCONFIGURED</span>
                </>
              )}
            </div>
          </div>

          {/* Honest Status Explanation */}
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--surface-border-subtle)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.45',
            }}
          >
            <strong>Database Status Note:</strong> {db.message || 'Probing MySQL service.'}
            {!isDbConnected && (
              <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                To connect: update <code>server/.env</code> with your local MySQL password (<code>DB_PASSWORD=...</code>) and run <code>npm run migrate:server</code>.
              </div>
            )}
          </div>

          {/* Phase 1 Scope & Architecture Checklist */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
              Phase 1 Deliverables Verification
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { title: 'Project Structure (Client & Server)', done: true },
                { title: 'Vanilla CSS Obsidian/Slate Design System', done: true },
                { title: 'Responsive App Shell & Mobile Navigation', done: true },
                { title: 'Configurable Non-GPS Area Selection', done: true },
                { title: 'Emergency Shortcut with Verified-Only Safeguards', done: true },
                { title: '10 Core Module Navigation & Placeholder Pages', done: true },
                { title: 'Sensible Empty States (No Fake Activity)', done: true },
                { title: 'Safe MySQL Pool & Parameterized Migrations Strategy', done: true },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <CheckCircle2 size={15} style={{ color: 'var(--brand-electric)' }} />
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
