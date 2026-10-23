import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  Newspaper,
  ShieldCheck,
  Send,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Building,
  Globe,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'agriculture', label: 'Agriculture & Krishi News' },
  { id: 'infrastructure', label: 'Roads & Infrastructure' },
  { id: 'civic', label: 'Civic & Gram Panchayat' },
  { id: 'youth', label: 'Youth & Education' },
  { id: 'sports', label: 'Local Sports & Tournaments' },
  { id: 'weather', label: 'Weather & Crop Advisory' },
  { id: 'cultural', label: 'Cultural & Taluka Heritage' },
  { id: 'business', label: 'Local Trade & Commerce' },
];

const SOURCE_TYPES = [
  { id: 'firsthand_reporting', label: 'First-hand On-the-ground Reporting' },
  { id: 'gram_panchayat_source', label: 'Gram Panchayat / Official Source' },
  { id: 'market_committee', label: 'APMC Market Committee Update' },
  { id: 'local_organization', label: 'Local Community Organization / Trust' },
];

export default function SubmitNewsModal({ isOpen, onClose, onSubmitted }) {
  const { user, areasList, selectedArea } = useApp();

  const [formData, setFormData] = useState({
    title: '',
    category: 'agriculture',
    content: '',
    areaId: selectedArea?.id || 'deori-hq',
    authorName: user?.fullName || '',
    authorRole: 'citizen_correspondent',
    sourceType: 'firsthand_reporting',
    sourceAttribution: '',
    contactPhone: user?.phone || '',
    referenceUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.title.trim()) {
      setErrorMessage('Please enter an article title.');
      return;
    }

    if (formData.content.trim().length < 50) {
      setErrorMessage('Please provide a substantive news report (minimum 50 characters).');
      return;
    }

    if (!formData.sourceAttribution.trim()) {
      setErrorMessage('Please provide source attribution or reference details.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitNews(formData);
      setSuccessMessage(res.message || 'News report submitted successfully for editorial review.');
      setTimeout(() => {
        if (onSubmitted) onSubmitted(res.news);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit news article.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Newspaper size={18} style={{ color: 'var(--brand-electric)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Submit Taluka News Report
            </h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Civic Integrity Safeguard */}
        <div style={{ padding: '12px 16px', background: 'rgba(56, 189, 248, 0.08)', borderBottom: '1px solid var(--surface-border-subtle)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <ShieldCheck size={18} style={{ color: 'var(--brand-electric)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <strong>Fact-Checking & Quality Standard:</strong> To combat rumors and misinformation in Deori Taluka, all news reports are reviewed and verified before publication. Source attribution is strictly required.
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          {/* Headline */}
          <div className="form-group">
            <label className="form-label">Headline / Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Chichgarh Road Culvert Repair Commences Ahead of Monsoon"
              className="form-input"
              required
            />
          </div>

          {/* Category & Locality */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Taluka Circle *</label>
              <select
                name="areaId"
                value={formData.areaId}
                onChange={handleChange}
                className="form-select"
              >
                {areasList.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* News Body */}
          <div className="form-group">
            <label className="form-label">Report Content / Story *</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={6}
              placeholder="Provide objective, accurate information describing what occurred, where, when, and who was involved..."
              className="form-textarea"
              required
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Minimum 50 characters. Rumors and unsubstantiated claims will be rejected.
            </div>
          </div>

          {/* Source Type & Attribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Source Type *</label>
              <select
                name="sourceType"
                value={formData.sourceType}
                onChange={handleChange}
                className="form-select"
              >
                {SOURCE_TYPES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Source Attribution *</label>
              <input
                type="text"
                name="sourceAttribution"
                value={formData.sourceAttribution}
                onChange={handleChange}
                placeholder="e.g. PWD Sub-Division Deori / Sarpanch Office"
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Author Name & Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Reporter / Byline Name *</label>
              <input
                type="text"
                name="authorName"
                value={formData.authorName}
                onChange={handleChange}
                placeholder="Your full name"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reporter Designation *</label>
              <select
                name="authorRole"
                value={formData.authorRole}
                onChange={handleChange}
                className="form-select"
              >
                <option value="citizen_correspondent">Citizen Correspondent</option>
                <option value="local_reporter">Local Accredited Reporter</option>
                <option value="taluka_rep">Taluka Community Representative</option>
              </select>
            </div>
          </div>

          {/* Optional Reference Link */}
          <div className="form-group">
            <label className="form-label">Reference Link / Online Source (Optional)</label>
            <input
              type="url"
              name="referenceUrl"
              value={formData.referenceUrl}
              onChange={handleChange}
              placeholder="https://... (Press note, photo evidence, or circular link)"
              className="form-input"
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '16px' }}>
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
              <span>{loading ? 'Submitting...' : 'Submit Report for Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
