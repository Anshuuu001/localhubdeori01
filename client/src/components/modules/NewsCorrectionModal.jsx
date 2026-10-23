import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  AlertTriangle,
  Send,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

const REASON_OPTIONS = [
  { id: 'factual_error', label: 'Factual Error in Details / Numbers' },
  { id: 'outdated_information', label: 'Information Outdated or Superseded' },
  { id: 'misspelling', label: 'Spelling / Location Name Error' },
  { id: 'misattributed_quote', label: 'Misattributed Quote / Source' },
  { id: 'other', label: 'Other Inaccuracy' },
];

export default function NewsCorrectionModal({ isOpen, onClose, article, onSubmitted }) {
  const { user } = useApp();

  const [formData, setFormData] = useState({
    reason: 'factual_error',
    details: '',
    suggestedText: '',
    sourceUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen || !article) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (formData.details.trim().length < 20) {
      setErrorMessage('Please provide specific details explaining the correction (minimum 20 characters).');
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitNewsCorrection(article.id, formData);
      setSuccessMessage(res.message || 'Correction submitted for editor review.');
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit correction request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} style={{ color: '#eab308' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Submit News Correction
            </h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Article Subject */}
        <div style={{ padding: '12px 18px', background: 'var(--surface-subtle)', borderBottom: '1px solid var(--surface-border-subtle)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
            Regarding Article:
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {article.title}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--status-crimson)', fontSize: '0.82rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--status-emerald)', fontSize: '0.82rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <CheckCircle2 size={15} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Reason */}
          <div className="form-group">
            <label className="form-label">Nature of Correction *</label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="form-select"
            >
              {REASON_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Details */}
          <div className="form-group">
            <label className="form-label">What is inaccurate in this report? *</label>
            <textarea
              name="details"
              value={formData.details}
              onChange={handleChange}
              rows={4}
              placeholder="State the exact sentence or statement that needs correction and why it is erroneous..."
              className="form-textarea"
              required
            />
          </div>

          {/* Suggested Text */}
          <div className="form-group">
            <label className="form-label">Suggested Accurate Text (Optional)</label>
            <textarea
              name="suggestedText"
              value={formData.suggestedText}
              onChange={handleChange}
              rows={3}
              placeholder="Provide the corrected wording or facts..."
              className="form-textarea"
            />
          </div>

          {/* Verifiable Reference */}
          <div className="form-group">
            <label className="form-label">Verifiable Source / Reference Link (Optional)</label>
            <input
              type="url"
              name="sourceUrl"
              value={formData.sourceUrl}
              onChange={handleChange}
              placeholder="https://... (Supporting document or link)"
              className="form-input"
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '14px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={15} />
              <span>{loading ? 'Submitting...' : 'Send Correction to Editor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
