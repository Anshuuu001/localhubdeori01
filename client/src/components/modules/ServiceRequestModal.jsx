import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  Wrench,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Send,
  AlertCircle,
  CheckCircle2,
  Phone,
  User,
  Info,
} from 'lucide-react';

export default function ServiceRequestModal({ listing, isOpen, onClose, onRequestCreated }) {
  const { user, areasList, openAuthModal } = useApp();

  const [formData, setFormData] = useState({
    serviceDescription: '',
    serviceAreaId: 'deori-hq',
    addressDetails: '',
    preferredDate: '',
    preferredTimeSlot: 'morning',
    contactName: user?.fullName || '',
    contactPhone: user?.phone || '',
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
      const res = await api.submitServiceRequest({
        listingId: listing.id,
        serviceDescription: formData.serviceDescription,
        serviceAreaId: formData.serviceAreaId,
        addressDetails: formData.addressDetails,
        preferredDate: formData.preferredDate || null,
        preferredTimeSlot: formData.preferredTimeSlot,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
      });

      setSuccessResult(res.serviceRequest);
      if (onRequestCreated) onRequestCreated(res.serviceRequest);
    } catch (err) {
      setError(err.message || 'Failed to submit service booking. Please verify details and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
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
              <Wrench size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Request Local Service
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {listing.title} • {listing.business?.name || 'Local Service Provider'}
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
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Service Request Logged!
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px', lineHeight: 1.5 }}>
              Your service request for <strong>{listing.title}</strong> has been transmitted. The technician will confirm availability via phone.
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
              Reference: #{successResult.id?.slice(0, 8).toUpperCase()} • Status: Pending Confirmation
            </div>
            <div>
              <button onClick={onClose} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            {/* Payment & Inspection Safeguard Banner */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '0.78rem',
                color: '#fcd34d',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>No Online Payment:</strong> LocalHub X does not collect advance fees. Inspect technician credentials and agree on quotation before on-site work commences.
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
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

            {/* Description of Work */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Issue / Work Needed *
              </label>
              <textarea
                rows={3}
                required
                value={formData.serviceDescription}
                onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                placeholder="Describe the fault, machine model, pump HP, pipe leak, or electrical work required..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface-bg-alt)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Area & Location */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Taluka Circle / Area *
                </label>
                <select
                  value={formData.serviceAreaId}
                  onChange={(e) => setFormData({ ...formData, serviceAreaId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--surface-card, #ffffff)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  {areasList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.marathi_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Specific Address / Landmark *
                </label>
                <input
                  type="text"
                  required
                  value={formData.addressDetails}
                  onChange={(e) => setFormData({ ...formData, addressDetails: e.target.value })}
                  placeholder="e.g. Near Gram Panchayat, Farm Plot #3"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--surface-bg-alt)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {/* Timing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--surface-bg-alt)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Preferred Time Slot
                </label>
                <select
                  value={formData.preferredTimeSlot}
                  onChange={(e) => setFormData({ ...formData, preferredTimeSlot: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--surface-bg-alt)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="morning">Morning (9:00 AM – 1:00 PM)</option>
                  <option value="afternoon">Afternoon (1:00 PM – 5:00 PM)</option>
                  <option value="evening">Evening (5:00 PM – 8:00 PM)</option>
                  <option value="anytime">Anytime / Urgent</option>
                </select>
              </div>
            </div>

            {/* Contact Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Contact person"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--surface-bg-alt)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Mobile Number *
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
                    background: 'var(--surface-bg-alt)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
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
                  <span>Logging Request...</span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Confirm Booking Request</span>
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
