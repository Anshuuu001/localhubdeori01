import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, Phone, AlertTriangle, CheckCircle2, ShieldCheck, ExternalLink, ArrowRight } from 'lucide-react';

export default function EmergencySection() {
  const { navigateToModule } = useApp();

  return (
    <section id="emergency-section" className="emergency-shortcut-card" aria-label="Emergency Services">
      {/* Top Header Row */}
      <div className="emergency-top-row">
        <div className="emergency-title-group">
          <div className="emergency-icon-container">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="emergency-title">
              <span>Emergency Services & Helplines</span>
              <span className="emergency-status-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: 'var(--status-emerald)' }}>
                <ShieldCheck size={12} />
                <span>Phase 5 Verified Directory Live</span>
              </span>
            </div>
            <p className="emergency-subline">
              Guaranteed immediate access for Deori Taluka. Never hidden by personalization filters.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigateToModule('emergency-contacts')}
          className="header-btn"
          style={{
            width: 'auto',
            padding: '6px 14px',
            fontSize: '0.8rem',
            gap: '6px',
            background: 'var(--status-crimson-bg)',
            border: '1px solid var(--status-crimson-border)',
            color: 'var(--status-crimson)',
            fontWeight: 700,
          }}
        >
          <span>Open Full Directory</span>
          <ArrowRight size={13} style={{ color: 'var(--status-crimson)' }} />
        </button>
      </div>

      {/* National Verified Helplines (Safe, Standard Public Emergency Numbers) */}
      <div className="emergency-quick-actions">
        <div className="emergency-call-card">
          <div className="emergency-call-info">
            <h4>Police & Unified Emergency</h4>
            <p>National 24x7 Emergency Response (ERSS)</p>
          </div>
          <a
            href="tel:112"
            className="emergency-dial-btn"
            title="Dial 112 Unified Emergency"
            aria-label="Dial 112"
          >
            <Phone size={14} />
            <span>112</span>
          </a>
        </div>

        <div className="emergency-call-card">
          <div className="emergency-call-info">
            <h4>Medical Emergency / Ambulance</h4>
            <p>Maharashtra Govt 108 Emergency Service</p>
          </div>
          <a
            href="tel:108"
            className="emergency-dial-btn"
            title="Dial 108 Ambulance"
            aria-label="Dial 108"
          >
            <Phone size={14} />
            <span>108</span>
          </a>
        </div>
      </div>

      {/* Honest Local Directory Notice */}
      <div className="emergency-disclaimer-note" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
        <ShieldCheck size={15} style={{ color: 'var(--status-emerald)', flexShrink: 0 }} />
        <span>
          <strong>Verified Civic Directory:</strong> Deori Police Station, Rural Hospital Casualty, MSEDCL Electricity Breakdowns, and Women Helpline numbers are active in the verified emergency directory. Citizens can report outdated numbers directly for investigation.
        </span>
      </div>
    </section>
  );
}
