import React, { useState } from 'react';
import {
  X,
  Building2,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Share2,
  Check,
  ExternalLink,
  FileText,
  Download,
} from 'lucide-react';

export default function GovtNoticeDetailModal({ notice, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!notice) return null;

  const handleShare = () => {
    const url = window.location.origin + `?module=taluka-news-feed&tab=notices&noticeId=${notice.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = notice.isDeadlinePassed || (notice.deadlineDate && new Date(notice.deadlineDate) < new Date());

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} style={{ color: 'var(--brand-electric)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-electric)', textTransform: 'uppercase' }}>
              {notice.category?.replace(/_/g, ' ')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-emerald)', fontWeight: 700 }}>
              <ShieldCheck size={11} />
              <span>Official Department Notice</span>
            </span>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Department Header Banner */}
          <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', marginBottom: '18px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Issuing Government Authority
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {notice.issuingAuthority}
            </div>
            {notice.noticeNumber && (
              <div style={{ fontSize: '0.78rem', color: 'var(--brand-electric)', marginTop: '4px', fontWeight: 600 }}>
                Circular / Order No: {notice.noticeNumber}
              </div>
            )}
          </div>

          {/* Deadline / Status Banner */}
          {notice.deadlineDate && (
            <div style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.1)',
              border: isExpired ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
              color: isExpired ? 'var(--status-crimson)' : 'var(--brand-electric)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
            }}>
              {isExpired ? <AlertCircle size={15} /> : <Clock size={15} />}
              <span>
                {isExpired
                  ? `Application / Compliance Deadline Ended on ${formatDate(notice.deadlineDate)}`
                  : `Application / Compliance Deadline: ${formatDate(notice.deadlineDate)}`}
              </span>
            </div>
          )}

          {/* Notice Title */}
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px', lineHeight: 1.35 }}>
            {notice.title}
          </h2>

          {/* Dates & Locality */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--surface-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} style={{ color: 'var(--brand-electric)' }} />
              <span>Issued: {formatDate(notice.effectiveDate)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} style={{ color: 'var(--brand-electric)' }} />
              <span>{notice.areaName || 'Deori Taluka'}</span>
            </div>
          </div>

          {/* Official Summary */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Summary & Citizen Guidance
            </h4>
            <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
              {notice.officialSummary}
            </div>
          </div>

          {/* Verification Portal & PDF Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', borderRadius: '10px', background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', marginBottom: '22px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Authentic Sources & Downloads
            </div>

            {notice.sourceVerificationUrl && (
              <a
                href={notice.sourceVerificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--brand-electric)',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ExternalLink size={15} />
                  <span>View Official Gazette / Department Portal</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Official Link ↗</span>
              </a>
            )}

            {notice.attachmentUrl && (
              <a
                href={notice.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--status-emerald)',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={15} />
                  <span>Download / View Official Circular PDF</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PDF ↗</span>
              </a>
            )}
          </div>

          {/* Official Disclaimer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '14px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--status-emerald)', flexShrink: 0 }} />
            <span>Notices published on LocalHub X are cross-referenced with official Maharashtra State / Gondia District government releases. Always refer to original department circulars for legal compliance.</span>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px' }}>
            <button
              onClick={handleShare}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              {copied ? <Check size={14} style={{ color: 'var(--status-emerald)' }} /> : <Share2 size={14} />}
              <span>{copied ? 'Link Copied!' : 'Share Official Notice'}</span>
            </button>

            <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
