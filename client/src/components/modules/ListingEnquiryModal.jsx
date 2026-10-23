import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  MessageSquare,
  Building2,
  MapPin,
  ShieldCheck,
  Send,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  MessageCircle,
} from 'lucide-react';

export default function ListingEnquiryModal({ listing, isOpen, onClose, onEnquirySent }) {
  const { user, openAuthModal } = useApp();

  const [formData, setFormData] = useState({
    message: '',
    preferredContactMethod: 'phone',
    contactPhone: user?.phone || '',
    contactEmail: user?.email || '',
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
      const res = await api.submitEnquiry({
        listingId: listing.id,
        message: formData.message,
        preferredContactMethod: formData.preferredContactMethod,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
      });

      setSuccessResult(res.enquiry);
      if (onEnquirySent) onEnquirySent(res.enquiry);
    } catch (err) {
      setError(err.message || 'Failed to submit enquiry. Please check your message and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
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
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Send In-Platform Enquiry
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Regarding: {listing.title}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Success View */}
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
              Enquiry Transmitted Securely!
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px', lineHeight: 1.5 }}>
              Your inquiry regarding <strong>{listing.title}</strong> has been forwarded to the listing owner. You will be notified in <strong>My Activity</strong> when they respond.
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
              Reference: #{successResult.id?.slice(0, 8).toUpperCase()} • Status: Sent
            </div>
            <div>
              <button onClick={onClose} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            {/* Direct provider connection safeguard */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <ShieldCheck size={16} style={{ color: 'var(--brand-electric)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Direct Enquiry:</strong> Connects directly with {listing.business?.name || 'the listing provider'}. No middlemen or commission deductions.
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

            {/* Preferred Contact Method */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Preferred Response Channel *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: 'phone', label: 'Phone Call', icon: Phone },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                  { id: 'in_app', label: 'In-Platform', icon: MessageSquare },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = formData.preferredContactMethod === m.id;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setFormData({ ...formData, preferredContactMethod: m.id })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: isSelected
                          ? '1px solid var(--brand-electric)'
                          : '1px solid var(--surface-border)',
                        backgroundColor: isSelected ? 'var(--brand-blue-bg)' : 'var(--surface-bg-alt)',
                        color: isSelected ? 'var(--brand-electric)' : 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 700 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={14} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Your Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="10-digit mobile"
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
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="Optional"
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

            {/* Message Body */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Your Message / Specific Question *
              </label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Ask about availability, inspection timing, deposit terms, or delivery to your village..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface-ground, #f8fafc)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {formData.message.length} / 2000 chars
              </div>
            </div>

            {/* Actions */}
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
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Enquiry</span>
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
