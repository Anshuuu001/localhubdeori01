import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  Briefcase,
  Building2,
  MapPin,
  ShieldCheck,
  Send,
  AlertCircle,
  CheckCircle2,
  User,
  Phone,
  Mail,
  FileText,
  Clock,
  Info,
} from 'lucide-react';

export default function JobApplicationModal({ listing, isOpen, onClose, onApplied }) {
  const { user, openAuthModal } = useApp();

  const [formData, setFormData] = useState({
    applicantName: user?.fullName || '',
    applicantPhone: user?.phone || '',
    applicantEmail: user?.email || '',
    coverNote: '',
    experienceSummary: '',
    qualifications: '',
    resumeUrl: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  if (!isOpen || !listing) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.applyForJob({
        listingId: listing.id,
        applicantName: formData.applicantName,
        applicantPhone: formData.applicantPhone,
        applicantEmail: formData.applicantEmail,
        coverNote: formData.coverNote,
        experienceSummary: formData.experienceSummary,
        qualifications: formData.qualifications,
        resumeUrl: formData.resumeUrl,
      });

      setSuccessResult(res.application);
      if (onApplied) onApplied(res.application);
    } catch (err) {
      setError(err.message || 'Failed to submit application. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-electric)',
              }}
            >
              <Briefcase size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Apply for Position
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {listing.title} • {listing.business?.name || 'Deori Employer'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Success State */}
        {successResult ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--status-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Application Successfully Submitted!
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px', lineHeight: 1.5 }}>
              Your application for <strong>{listing.title}</strong> has been transmitted to {listing.business?.name}. You can track the status in <strong>My Activity</strong>.
            </p>
            <div
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--surface-bg-alt)',
                border: '1px solid var(--surface-border)',
                fontSize: '0.82rem',
                color: 'var(--brand-electric)',
                fontWeight: 600,
                marginBottom: '24px',
              }}
            >
              Application Ref: #{successResult.id?.slice(0, 8).toUpperCase()} • Status: Submitted
            </div>
            <div>
              <button onClick={onClose} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            {/* Safeguard Notice */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <ShieldCheck size={16} style={{ color: 'var(--status-emerald)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Zero Fee Policy:</strong> Employers in Deori Taluka are prohibited from charging application or interview fees. Your contact details remain confidential.
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#b91c1c',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Applicant Contact Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="Enter your full name"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      background: 'var(--surface-ground, #f8fafc)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Mobile Number *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                    <input
                      type="tel"
                      required
                      value={formData.applicantPhone}
                      onChange={(e) => setFormData({ ...formData, applicantPhone: e.target.value })}
                      placeholder="10-digit mobile"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        background: 'var(--surface-ground, #f8fafc)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      value={formData.applicantEmail}
                      onChange={(e) => setFormData({ ...formData, applicantEmail: e.target.value })}
                      placeholder="Optional"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        background: 'var(--surface-ground, #f8fafc)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Qualifications & Experience */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Educational / ITI Qualification
                </label>
                <input
                  type="text"
                  value={formData.qualifications}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  placeholder="e.g. 10th Pass, ITI, B.Com"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--surface-ground, #f8fafc)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Relevant Experience
                </label>
                <input
                  type="text"
                  value={formData.experienceSummary}
                  onChange={(e) => setFormData({ ...formData, experienceSummary: e.target.value })}
                  placeholder="e.g. 2 years at shop/garage"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--surface-ground, #f8fafc)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {/* Cover Note / Message to Employer */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Message to Employer / Brief Background
              </label>
              <textarea
                rows={3}
                value={formData.coverNote}
                onChange={(e) => setFormData({ ...formData, coverNote: e.target.value })}
                placeholder="Describe your availability, village location, or skills relevant to this opening..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--surface-ground, #f8fafc)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={submitting}
                style={{ padding: '9px 18px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{
                  padding: '9px 20px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting ? (
                  <span>Submitting Application...</span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
