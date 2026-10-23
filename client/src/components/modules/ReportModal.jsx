import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';

export default function ReportModal({ isOpen, onClose, targetType, targetId, targetTitle }) {
  const [reason, setReason] = useState('Fraud / Misleading');
  const [details, setDetails] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!details.trim() || details.trim().length < 5) {
      setErrorMessage('Please provide at least 5 characters explaining the concern.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.submitReport({
        targetType,
        targetId,
        reason,
        details: details.trim(),
        reporterName: reporterName.trim() || undefined,
        reporterContact: reporterContact.trim() || undefined,
      });

      setSuccessMessage(res.message || 'Report submitted successfully. Thank you for protecting the Deori community.');
      setTimeout(() => {
        setSuccessMessage(null);
        setDetails('');
        onClose();
      }, 2500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '90%',
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--surface-border)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--status-crimson-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--status-crimson)',
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {targetType === 'business_profile' ? 'Report Profile / Correction' : 'Report Listing'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {targetTitle || 'LocalHub X Moderation Review'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {successMessage ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: 'var(--status-emerald-bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--status-emerald)',
            }}
          >
            <CheckCircle size={32} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 600 }}>{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--status-crimson-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--status-crimson)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Primary Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="Fraud / Misleading">Fraud or Misleading Information</option>
                <option value="Incorrect Business Details">Incorrect Business / Branch Information</option>
                <option value="Wrong Category">Wrong Category or Irrelevant</option>
                <option value="Out of Date / Expired">Expired / No Longer Available</option>
                <option value="Second-Hand Item (Prohibited)">Used / Second-Hand Goods (Prohibited in Marketplace)</option>
                <option value="Offensive / Harmful Content">Offensive or Inappropriate Content</option>
                <option value="Other">Other Violation</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Explanation & Evidence *
              </label>
              <textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please describe why this item requires moderation or what correction is needed..."
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Citizen name"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Your Phone / Contact (Optional)
                </label>
                <input
                  type="text"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                  placeholder="For follow-up"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--status-crimson)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
