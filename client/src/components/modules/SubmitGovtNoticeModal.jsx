import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  FileText,
  ShieldCheck,
  Send,
  AlertCircle,
  CheckCircle2,
  Building2,
  Calendar,
  Globe,
  Link2,
} from 'lucide-react';

const NOTICE_CATEGORIES = [
  { id: 'administrative', label: 'Administrative / Revenue Order' },
  { id: 'agriculture_scheme', label: 'Agriculture Subsidy / DBT Scheme' },
  { id: 'public_health', label: 'Public Health & Vaccination Notice' },
  { id: 'power_water_supply', label: 'MSEDCL Power / Water Supply Advisory' },
  { id: 'exam_recruitment', label: 'Local Government Recruitment / Exam' },
  { id: 'disaster_alert', label: 'Weather / Flood / Disaster Warning' },
  { id: 'tribal_welfare', label: 'Tribal Development & Scholarship' },
];

const COMMON_AUTHORITIES = [
  'Tahsildar & Executive Magistrate Office, Deori',
  'Panchayat Samiti Deori (BDO Office)',
  'MSEDCL (Mahavitaran) Deori Sub-Division',
  'Taluka Health Office / Rural Hospital Deori',
  'Taluka Agriculture Office (Krishi Vibhag), Deori',
  'Forest Department / Social Forestry Range Deori',
  'Integrated Tribal Development Project (ITDP), Deori Circle',
  'District Collectorate, Gondia (Deori Sub-Division)',
  'Other Official Department',
];

export default function SubmitGovtNoticeModal({ isOpen, onClose, onSubmitted }) {
  const { user, areasList, selectedArea } = useApp();

  const [formData, setFormData] = useState({
    title: '',
    category: 'administrative',
    issuingAuthority: COMMON_AUTHORITIES[0],
    customAuthority: '',
    noticeNumber: '',
    officialSummary: '',
    areaId: selectedArea?.id || 'deori-hq',
    sourceVerificationUrl: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    deadlineDate: '',
    attachmentUrl: '',
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

    const authority = formData.issuingAuthority === 'Other Official Department'
      ? formData.customAuthority.trim()
      : formData.issuingAuthority;

    if (!authority) {
      setErrorMessage('Please specify the issuing government department.');
      return;
    }

    if (!formData.title.trim()) {
      setErrorMessage('Please enter the notice title.');
      return;
    }

    if (formData.officialSummary.trim().length < 30) {
      setErrorMessage('Please provide an official summary (minimum 30 characters).');
      return;
    }

    if (!formData.sourceVerificationUrl.trim()) {
      setErrorMessage('Official source verification URL or portal link is mandatory for government notices.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        issuingAuthority: authority,
      };

      const res = await api.submitGovtNotice(payload);
      setSuccessMessage(res.message || 'Official notice submitted for administrative verification.');
      setTimeout(() => {
        if (onSubmitted) onSubmitted(res.notice);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit government notice.');
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
            <Building2 size={18} style={{ color: 'var(--brand-electric)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Submit Official Circular / Notice
            </h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Civic Integrity Safeguard */}
        <div style={{ padding: '12px 16px', background: 'rgba(234, 179, 8, 0.08)', borderBottom: '1px solid rgba(234, 179, 8, 0.2)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <ShieldCheck size={18} style={{ color: '#eab308', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <strong>Authenticity Mandate:</strong> Only notices issued by genuine government departments (Tahsildar, Panchayat Samiti, MSEDCL, Health Dept, etc.) with a verifiable official link or gazette reference are accepted.
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

          {/* Issuing Authority */}
          <div className="form-group">
            <label className="form-label">Issuing Government Authority / Department *</label>
            <select
              name="issuingAuthority"
              value={formData.issuingAuthority}
              onChange={handleChange}
              className="form-select"
            >
              {COMMON_AUTHORITIES.map((auth, idx) => (
                <option key={idx} value={auth}>{auth}</option>
              ))}
            </select>
          </div>

          {formData.issuingAuthority === 'Other Official Department' && (
            <div className="form-group">
              <label className="form-label">Specify Department Name *</label>
              <input
                type="text"
                name="customAuthority"
                value={formData.customAuthority}
                onChange={handleChange}
                placeholder="e.g. District Registrar Office, Gondia"
                className="form-input"
                required
              />
            </div>
          )}

          {/* Title & Circular Number */}
          <div className="form-group">
            <label className="form-label">Notice Title / Subject *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. DBT Subsidy Registration for Drip Irrigation Equipment"
              className="form-input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
              >
                {NOTICE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Official Circular / Outward No. (Optional)</label>
              <input
                type="text"
                name="noticeNumber"
                value={formData.noticeNumber}
                onChange={handleChange}
                placeholder="e.g. CR-104/2026/AGRI"
                className="form-input"
              />
            </div>
          </div>

          {/* Official Summary */}
          <div className="form-group">
            <label className="form-label">Summary & Citizen Action Required *</label>
            <textarea
              name="officialSummary"
              value={formData.officialSummary}
              onChange={handleChange}
              rows={5}
              placeholder="Explain the purpose of this notice, who is eligible, required documents, and steps to apply or comply..."
              className="form-textarea"
              required
            />
          </div>

          {/* Effective Date & Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Effective / Issue Date *</label>
              <input
                type="date"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Application Deadline (If Applicable)</label>
              <input
                type="date"
                name="deadlineDate"
                value={formData.deadlineDate}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          {/* Mandatory Verification Source URL */}
          <div className="form-group">
            <label className="form-label">Official Source Verification Link (Portal / Gazette) *</label>
            <input
              type="url"
              name="sourceVerificationUrl"
              value={formData.sourceVerificationUrl}
              onChange={handleChange}
              placeholder="https://gondia.gov.in/... or mahadbt.maharashtra.gov.in/..."
              className="form-input"
              required
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Must be a valid official government or department link.
            </div>
          </div>

          {/* Optional PDF / Attachment Link */}
          <div className="form-group">
            <label className="form-label">Official PDF Circular Link (Optional)</label>
            <input
              type="url"
              name="attachmentUrl"
              value={formData.attachmentUrl}
              onChange={handleChange}
              placeholder="https://... (Direct link to official PDF circular)"
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
              <span>{loading ? 'Submitting...' : 'Submit for Verification'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
