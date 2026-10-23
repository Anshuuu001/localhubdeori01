import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Newspaper,
  Calendar,
  MapPin,
  User,
  ShieldCheck,
  AlertTriangle,
  Share2,
  Check,
  ExternalLink,
  FileText,
} from 'lucide-react';
import NewsCorrectionModal from './NewsCorrectionModal';

export default function NewsArticleDetailModal({ article, onClose, onArticleUpdated }) {
  const { user, openAuthModal } = useApp();
  const [copied, setCopied] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);

  if (!article) return null;

  const handleShare = () => {
    const url = window.location.origin + `?module=taluka-news-feed&articleId=${article.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenCorrection = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setIsCorrectionOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-container"
          style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={18} style={{ color: 'var(--brand-electric)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-electric)', textTransform: 'uppercase' }}>
                {article.category?.replace(/_/g, ' ')}
              </span>
              {article.factChecked && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-emerald)', fontWeight: 700 }}>
                  <ShieldCheck size={11} />
                  <span>Fact-Checked</span>
                </span>
              )}
            </div>
            <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {/* Correction Notice Banner if updated */}
            {article.isCorrection && (
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#eab308', marginBottom: '4px' }}>
                  <AlertTriangle size={15} />
                  <span>Correction / Update Published</span>
                </div>
                {article.correctionNotes && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {article.correctionNotes}
                  </div>
                )}
              </div>
            )}

            {/* Headline */}
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 14px', lineHeight: 1.35 }}>
              {article.title}
            </h2>

            {/* Metadata Bar: Author byline, Date, Area */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--surface-border-subtle)', marginBottom: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} style={{ color: 'var(--brand-electric)' }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{article.authorName}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({article.authorRole?.replace(/_/g, ' ')})</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} style={{ color: 'var(--brand-electric)' }} />
                <span>{formatDate(article.publishedAt || article.createdAt)}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} style={{ color: 'var(--brand-electric)' }} />
                <span>{article.areaName || 'Deori Taluka'}</span>
              </div>
            </div>

            {/* Source Attribution Box */}
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Source Attribution & Verification
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                <strong>Source:</strong> {article.sourceAttribution}
                {article.sourceType && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                    ({article.sourceType?.replace(/_/g, ' ')})
                  </span>
                )}
              </div>
              {article.referenceUrl && (
                <div style={{ marginTop: '6px' }}>
                  <a
                    href={article.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--brand-electric)', textDecoration: 'none' }}
                  >
                    <span>View Supporting Reference Link</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Article Body */}
            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px', whiteSpace: 'pre-line' }}>
              {article.content}
            </div>

            {/* Civic Disclaimer & Correction Action */}
            <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Noticed an inaccuracy in this reporting?
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Citizens can submit factual corrections for editorial review.
                </div>
              </div>

              <button
                onClick={handleOpenCorrection}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(234, 179, 8, 0.4)', color: '#eab308' }}
              >
                <AlertTriangle size={13} />
                <span>Report Correction</span>
              </button>
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '16px' }}>
              <button
                onClick={handleShare}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
              >
                {copied ? <Check size={14} style={{ color: 'var(--status-emerald)' }} /> : <Share2 size={14} />}
                <span>{copied ? 'Link Copied!' : 'Share News Report'}</span>
              </button>

              <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {isCorrectionOpen && (
        <NewsCorrectionModal
          isOpen={isCorrectionOpen}
          onClose={() => setIsCorrectionOpen(false)}
          article={article}
          onSubmitted={() => {
            if (onArticleUpdated) onArticleUpdated();
          }}
        />
      )}
    </>
  );
}
