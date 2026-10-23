import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Building,
  User,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  Send,
  ShieldCheck,
  Globe,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'haat_bazaar', label: 'Weekly Haat Bazaar' },
  { id: 'yatra_festival', label: 'Village Yatra / Religious Festival' },
  { id: 'agri_fair', label: 'Agricultural Fair & Exhibition' },
  { id: 'health_camp', label: 'Health & Blood Donation Camp' },
  { id: 'sports_tournament', label: 'Sports Tournament / Cricket Meet' },
  { id: 'cultural_meet', label: 'Cultural Gathering / Community Meet' },
  { id: 'civic_meeting', label: 'Civic / Gram Sabha Consultation' },
  { id: 'other', label: 'Other Public Event' },
];

export default function SubmitEventModal({ isOpen, onClose, onSubmitted }) {
  const { user, areasList, selectedArea } = useApp();

  const [formData, setFormData] = useState({
    title: '',
    category: 'haat_bazaar',
    description: '',
    startDate: '',
    startTime: '09:00 AM',
    endDate: '',
    endTime: '06:00 PM',
    venue: '',
    areaId: selectedArea?.id || 'deori-hq',
    addressDetails: '',
    organizerName: user?.fullName || '',
    organizerContactPhone: user?.phone || '',
    organizerContactEmail: user?.email || '',
    permitContactOptions: 'phone',
    sourceUrl: '',
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
      setErrorMessage('Please enter an event title.');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setErrorMessage('Please select start and end dates.');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setErrorMessage('End date cannot be earlier than start date.');
      return;
    }

    if (!formData.venue.trim()) {
      setErrorMessage('Please specify the event venue or ground.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitEvent(formData);
      setSuccessMessage(res.message || 'Event submitted successfully for review.');
      setTimeout(() => {
        if (onSubmitted) onSubmitted(res.event);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit event.');
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
            <Calendar size={18} style={{ color: 'var(--brand-electric)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Submit Community Event
            </h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Civic Integrity Notice */}
        <div style={{ padding: '12px 16px', background: 'rgba(56, 189, 248, 0.08)', borderBottom: '1px solid var(--surface-border-subtle)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <ShieldCheck size={18} style={{ color: 'var(--brand-electric)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <strong>Editorial Review Gate:</strong> To keep Deori Taluka citizens safe from fake gatherings, all submissions enter Pending Review and are checked by authorized civic editors before public publication.
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

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Event Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Mando Devi Annual Yatra & Haat Fair 2026"
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

          {/* Dates & Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="text"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                placeholder="e.g. 09:00 AM"
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="text"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                placeholder="e.g. 08:00 PM"
                className="form-input"
              />
            </div>
          </div>

          {/* Venue & Address */}
          <div className="form-group">
            <label className="form-label">Venue / Ground Name *</label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              placeholder="e.g. Subhash Ground, Near Bus Stand, Deori"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Address / Landmarks</label>
            <input
              type="text"
              name="addressDetails"
              value={formData.addressDetails}
              onChange={handleChange}
              placeholder="e.g. National Highway 53 bypass road entrance"
              className="form-input"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Event Description & Program Details *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Provide event schedule, stalls info, parking arrangements, and entry details..."
              className="form-textarea"
              required
            />
          </div>

          {/* Organizer Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Organizer Name / Body *</label>
              <input
                type="text"
                name="organizerName"
                value={formData.organizerName}
                onChange={handleChange}
                placeholder="e.g. Deori Gram Utsav Samiti"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="tel"
                name="organizerContactPhone"
                value={formData.organizerContactPhone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="form-input"
              />
            </div>
          </div>

          {/* Source / Reference URL */}
          <div className="form-group">
            <label className="form-label">Official Circular / Reference Link (Optional)</label>
            <input
              type="url"
              name="sourceUrl"
              value={formData.sourceUrl}
              onChange={handleChange}
              placeholder="https://... (Website or official social notice)"
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
              <span>{loading ? 'Submitting...' : 'Submit for Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
