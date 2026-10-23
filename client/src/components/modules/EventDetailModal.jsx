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
  Share2,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ThumbsUp,
  UserCheck,
  ExternalLink,
} from 'lucide-react';

export default function EventDetailModal({ event: initialEvent, onClose, onEventUpdated }) {
  const { user, openAuthModal } = useApp();
  const [event, setEvent] = useState(initialEvent);
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!event) return null;

  const handleShare = () => {
    const url = window.location.origin + `?module=events-desk&eventId=${event.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleResponse = async (type) => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    setLoadingAction(true);
    setErrorMessage(null);
    try {
      // If clicking same response again, toggle off
      const nextType = event.userResponse === type ? null : type;
      await api.respondToEvent(event.id, nextType);

      // Re-fetch event to sync exact counts
      const res = await api.getEvent(event.id);
      setEvent(res.event);
      if (onEventUpdated) onEventUpdated(res.event);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record response.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelEvent = async () => {
    setLoadingAction(true);
    setErrorMessage(null);
    try {
      await api.cancelEvent(event.id, cancelReason);
      const res = await api.getEvent(event.id);
      setEvent(res.event);
      setShowCancelDialog(false);
      if (onEventUpdated) onEventUpdated(res.event);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to cancel event.');
    } finally {
      setLoadingAction(false);
    }
  };

  const isCancelled = event.status === 'cancelled';

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
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-electric)', textTransform: 'uppercase' }}>
              {event.category?.replace(/_/g, ' ')}
            </span>
            {event.isPast && (
              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-muted)', fontWeight: 600 }}>
                Past Event
              </span>
            )}
            {isCancelled && (
              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-crimson)', fontWeight: 700 }}>
                Cancelled
              </span>
            )}
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {errorMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--status-crimson)', fontSize: '0.82rem', marginBottom: '16px' }}>
              {errorMessage}
            </div>
          )}

          {isCancelled && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '18px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-crimson)', marginBottom: '4px' }}>
                Notice: This event has been cancelled by the organizer.
              </div>
              {event.cancellationReason && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Reason: <em>"{event.cancellationReason}"</em>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px', lineHeight: 1.35 }}>
            {event.title}
          </h2>

          {/* Quick Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <Clock size={13} style={{ color: 'var(--brand-electric)' }} />
                <span>Date & Schedule</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {new Date(event.startDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                {event.startDate !== event.endDate && ` – ${new Date(event.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {event.startTime} to {event.endTime}
              </div>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <MapPin size={13} style={{ color: 'var(--brand-electric)' }} />
                <span>Venue & Location</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {event.venue}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {event.areaName || 'Deori Taluka'}
                {event.addressDetails && ` • ${event.addressDetails}`}
              </div>
            </div>
          </div>

          {/* Full Description */}
          <div style={{ marginBottom: '22px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              About This Event
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {event.description}
            </p>
          </div>

          {/* Organizer Info & Contact */}
          <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--surface-subtle)', border: '1px solid var(--surface-border)', marginBottom: '22px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Organizer Details
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <User size={15} style={{ color: 'var(--brand-electric)' }} />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{event.organizerName}</strong>
              {event.businessName && event.businessName !== 'Independent Organizer' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({event.businessName})</span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '10px' }}>
              {event.organizerContactPhone && (
                <a
                  href={`tel:${event.organizerContactPhone}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--brand-electric)', textDecoration: 'none' }}
                >
                  <Phone size={14} />
                  <span>{event.organizerContactPhone}</span>
                </a>
              )}
              {event.organizerContactEmail && (
                <a
                  href={`mailto:${event.organizerContactEmail}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--brand-electric)', textDecoration: 'none' }}
                >
                  <Mail size={14} />
                  <span>{event.organizerContactEmail}</span>
                </a>
              )}
              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--brand-electric)', textDecoration: 'none' }}
                >
                  <Globe size={14} />
                  <span>Official Reference Link</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          {/* Response Actions (Interested / Going) */}
          {!isCancelled && !event.isPast && (
            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Will you be attending?
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {event.goingCount} going • {event.interestedCount} interested
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleResponse('interested')}
                  disabled={loadingAction}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: event.userResponse === 'interested' ? '1px solid var(--brand-electric)' : '1px solid var(--surface-border)',
                    backgroundColor: event.userResponse === 'interested' ? 'var(--brand-blue-bg)' : 'var(--surface-card)',
                    color: event.userResponse === 'interested' ? 'var(--brand-electric)' : 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <ThumbsUp size={14} />
                  <span>{event.userResponse === 'interested' ? 'Interested ✓' : 'Interested'}</span>
                </button>

                <button
                  onClick={() => handleResponse('going')}
                  disabled={loadingAction}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: event.userResponse === 'going' ? '1px solid var(--status-emerald)' : '1px solid var(--surface-border)',
                    backgroundColor: event.userResponse === 'going' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-card)',
                    color: event.userResponse === 'going' ? 'var(--status-emerald)' : 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <UserCheck size={14} />
                  <span>{event.userResponse === 'going' ? 'Going ✓' : 'Going'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Organizer Cancellation Dialog */}
          {event.isCreator && !isCancelled && !event.isPast && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '16px' }}>
              {!showCancelDialog ? (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--status-crimson)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                >
                  Cancel this event as organizer...
                </button>
              ) : (
                <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--status-crimson)', marginBottom: '8px' }}>
                    Confirm Event Cancellation
                  </div>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Enter reason (e.g., Postponed due to heavy rain)"
                    className="form-input"
                    style={{ marginBottom: '10px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowCancelDialog(false)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                      Keep Event
                    </button>
                    <button onClick={handleCancelEvent} disabled={loadingAction} className="btn" style={{ padding: '6px 12px', fontSize: '0.78rem', backgroundColor: 'var(--status-crimson)', color: '#fff' }}>
                      {loadingAction ? 'Cancelling...' : 'Confirm Cancellation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '20px', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '14px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--status-emerald)', flexShrink: 0 }} />
            <span>{event.disclaimer || 'Event details are published following administrative review. LocalHub X does not guarantee external venue safety.'}</span>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px' }}>
            <button
              onClick={handleShare}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              {copied ? <Check size={14} style={{ color: 'var(--status-emerald)' }} /> : <Share2 size={14} />}
              <span>{copied ? 'Link Copied!' : 'Share Public Event'}</span>
            </button>

            <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
