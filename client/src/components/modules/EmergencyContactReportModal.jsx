import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  AlertTriangle,
  Send,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Phone,
} from 'lucide-react';

const REPORT_REASONS = [
  { id: 'outdated_number', label: 'Number is Outdated / Switched Off' },
  { id: 'wrong_number', label: 'Wrong Number / Not the Claimed Office' },
  { id: 'unresponsive', label: 'Repeatedly Unresponsive During Emergency' },
  { id: 'service_moved', label: 'Facility / Office Shifted Location' },
  { id: 'other', label: 'Other Issue with this Contact' },
];

export default function EmergencyContactReportModal({ isOpen, onClose, contact, onSubmitted }) {
  const { user } = useApp();

  const [formData, setFormData] = useState({
    reason: 'outdated_number',
    details: '',
    suggestedNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen || !contact) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (formData.details.trim().length < 15) {
      setErrorMessage('Please provide details explaining the issue with this number (min 15 characters).');
      return;
    }

    setLoading(true);
    try {
      const res = await api.reportEmergencyContact(contact.id, formData);
      setSuccessMessage(res.message || 'Report received. Our moderation team will verify immediately.');
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit emergency report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} style={{ color: 'var(--status-crimson)' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Report Emergency Contact Issue
            </h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Target Contact Summary */}
        <div style={{ padding: '12px 18px', background: 'var(--surface-subtle)', borderBottom: '1px solid var(--surface-border-subtle)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
            Reporting Contact:
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {contact.serviceName}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--brand-electric)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Phone size={13} />
            <span>{contact.phoneNumber}</span>
          </div>
        </div>

        {/* Safeguard Notice */}
        <div style={{ padding: '10px 16px', background: 'rgba(56, 189, 248, 0.08)', borderBottom: '1px solid var(--surface-border-subtle)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ShieldCheck size={15} style={{ color: 'var(--brand-electric)', flexShrink: 0 }} />
          <span>Reports are reviewed by local administrators. To prevent denial-of-service, reporting does not automatically remove verified numbers.</span>
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
            <label className="form-label">Issue Encountered *</label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="form-select"
            >
              {REPORT_REASONS.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Details */}
          <div className="form-group">
            <label className="form-label">Details / Observations *</label>
            <textarea
              name="details"
              value={formData.details}
              onChange={handleChange}
              rows={4}
              placeholder="e.g. Called this morning, number is switched off or disconnected..."
              className="form-textarea"
              required
            />
          </div>

          {/* Suggested Replacement Number */}
          <div className="form-group">
            <label className="form-label">Correct / Replacement Number (If known)</label>
            <input
              type="tel"
              name="suggestedNumber"
              value={formData.suggestedNumber}
              onChange={handleChange}
              placeholder="e.g. 07185-xxxxxx or 10-digit mobile"
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
              <span>{loading ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
