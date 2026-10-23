import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  Home,
  Wrench,
  Car,
  Package,
  MessageSquare,
  AlertTriangle,
  FileText,
  User,
  Phone,
  ShieldCheck,
} from 'lucide-react';

export default function ActivityDetailModal({ item, isOpen, onClose, onItemUpdated }) {
  const [detailData, setDetailData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!isOpen || !item) {
      setDetailData(null);
      setHistory([]);
      setShowCancelPrompt(false);
      setCancelReason('');
      setActionError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchDetail() {
      try {
        let res = null;
        if (item.itemType === 'jobs') {
          res = await api.getJobApplication(item.id);
          if (isMounted) {
            setDetailData(res.application);
            setHistory(res.history || []);
          }
        } else if (item.itemType === 'enquiries') {
          res = await api.getEnquiry(item.id);
          if (isMounted) {
            setDetailData(res.enquiry);
            setHistory(res.history || []);
          }
        } else if (item.itemType === 'services') {
          res = await api.getServiceRequest(item.id);
          if (isMounted) {
            setDetailData(res.serviceRequest);
            setHistory(res.history || []);
          }
        } else if (item.itemType === 'rides' || item.itemType === 'deliveries') {
          res = await api.getTransitRequest(item.id);
          if (isMounted) {
            setDetailData(res.transitRequest);
            setHistory(res.history || []);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to retrieve request details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  // Handle Cancel / Withdraw Action
  const handlePerformCancel = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      if (item.itemType === 'jobs') {
        await api.withdrawJobApplication(item.id, cancelReason);
      } else if (item.itemType === 'enquiries') {
        await api.cancelEnquiry(item.id, cancelReason);
      } else if (item.itemType === 'services') {
        await api.cancelServiceRequest(item.id, cancelReason);
      } else if (item.itemType === 'rides' || item.itemType === 'deliveries') {
        await api.cancelTransitRequest(item.id, cancelReason);
      }

      if (onItemUpdated) onItemUpdated();
      onClose();
    } catch (err) {
      setActionError(err.message || 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    let bg = 'rgba(56, 189, 248, 0.15)';
    let color = 'var(--brand-electric)';
    let border = 'rgba(56, 189, 248, 0.3)';

    if (['hired', 'completed'].includes(s)) {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = 'var(--status-emerald)';
      border = 'rgba(16, 185, 129, 0.3)';
    } else if (['rejected', 'withdrawn', 'cancelled', 'expired'].includes(s)) {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = 'var(--status-crimson)';
      border = 'rgba(239, 68, 68, 0.3)';
    } else if (['shortlisted', 'accepted', 'in_progress', 'responded'].includes(s)) {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = 'var(--status-amber)';
      border = 'rgba(245, 158, 11, 0.3)';
    }

    return (
      <span
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          fontSize: '0.78rem',
          fontWeight: 700,
          textTransform: 'capitalize',
        }}
      >
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  const canCancel = () => {
    if (!detailData) return false;
    const s = detailData.status;
    if (item.itemType === 'jobs') return ['submitted', 'shortlisted'].includes(s);
    if (item.itemType === 'enquiries') return ['sent', 'viewed'].includes(s);
    if (item.itemType === 'services') return ['pending', 'accepted'].includes(s);
    if (item.itemType === 'rides' || item.itemType === 'deliveries') return ['pending', 'accepted'].includes(s);
    return false;
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'var(--surface-bg-alt)',
                border: '1px solid var(--surface-border)',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: 'var(--brand-electric)',
                fontWeight: 700,
              }}
            >
              {item.referenceId}
            </span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Request Details & Audit
            </h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading request history...
            </div>
          ) : error ? (
            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          ) : detailData ? (
            <div>
              {/* Title & Status Summary Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-bg-alt)',
                  border: '1px solid var(--surface-border)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {detailData.jobTitle || detailData.serviceTitle || detailData.listingTitle || `${detailData.pickupAddress} → ${detailData.dropoffAddress}`}
                    </h4>
                    <div style={{ fontSize: '0.82rem', color: 'var(--brand-primary)', marginTop: '2px', fontWeight: 600 }}>
                      {detailData.businessName || detailData.providerBusinessName || 'Local Provider'}
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(detailData.status)}
                  </div>
                </div>

                {/* Listing Status / Availability Integrity Indicator */}
                {detailData.listingStatus && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--surface-border-subtle)' }}>
                    <span>Listing State:</span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: detailData.listingStatus === 'published' ? 'var(--status-emerald-bg)' : 'var(--status-crimson-bg)',
                        border: `1px solid ${detailData.listingStatus === 'published' ? 'var(--status-emerald-border)' : 'var(--status-crimson-border)'}`,
                        color: detailData.listingStatus === 'published' ? 'var(--status-emerald)' : 'var(--status-crimson)',
                        fontWeight: 600,
                      }}
                    >
                      {detailData.listingStatus === 'published' ? 'Active in Catalog' : `[Listing ${detailData.listingStatus}]`}
                    </span>
                    {detailData.listingAvailability && detailData.listingAvailability !== 'available' && (
                      <span style={{ color: 'var(--status-amber)' }}>
                        • Availability: {detailData.listingAvailability}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Module-Specific Data Display */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  boxShadow: 'var(--shadow-xs)',
                  marginBottom: '20px',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Submitted Information
                </div>

                {item.itemType === 'jobs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Candidate: </strong>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{detailData.applicantName}</span>
                    </div>
                    {detailData.qualifications && (
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Qualifications: </strong>
                        <span style={{ color: 'var(--text-primary)' }}>{detailData.qualifications}</span>
                      </div>
                    )}
                    {detailData.experienceSummary && (
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Experience: </strong>
                        <span style={{ color: 'var(--text-primary)' }}>{detailData.experienceSummary}</span>
                      </div>
                    )}
                    {detailData.coverNote && (
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Cover Note: </strong>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginTop: '2px', lineHeight: 1.4 }}>
                          {detailData.coverNote}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {item.itemType === 'enquiries' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Your Message: </strong>
                      <p style={{ color: 'var(--text-primary)', margin: '4px 0 0', lineHeight: 1.4 }}>{detailData.message}</p>
                    </div>
                    {detailData.responseMessage && (
                      <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--brand-blue-bg)', border: '1px solid #bfdbfe' }}>
                        <strong style={{ color: 'var(--brand-primary)', display: 'block', fontSize: '0.78rem' }}>
                          Provider Response ({detailData.respondedAt ? new Date(detailData.respondedAt).toLocaleDateString() : 'Recent'}):
                        </strong>
                        <p style={{ color: 'var(--text-primary)', margin: '4px 0 0', fontSize: '0.85rem', lineHeight: 1.4 }}>
                          {detailData.responseMessage}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {item.itemType === 'services' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Work Description: </strong>
                      <p style={{ color: 'var(--text-primary)', margin: '4px 0 0', lineHeight: 1.4 }}>{detailData.serviceDescription}</p>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Service Location: </strong>
                      <span style={{ color: 'var(--text-primary)' }}>{detailData.addressDetails} ({detailData.areaName})</span>
                    </div>
                    {detailData.preferredDate && (
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Scheduled Timing: </strong>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {new Date(detailData.preferredDate).toLocaleDateString()} • {detailData.preferredTimeSlot}
                        </span>
                      </div>
                    )}
                    {detailData.rejectionReason && (
                      <div style={{ color: 'var(--status-crimson)' }}>
                        <strong>Decline Reason: </strong> {detailData.rejectionReason}
                      </div>
                    )}
                  </div>
                )}

                {(item.itemType === 'rides' || item.itemType === 'deliveries') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Route: </strong>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{detailData.pickupAddress} → {detailData.dropoffAddress}</span>
                    </div>
                    {detailData.requestType === 'ride' ? (
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Passengers: </strong>
                        <span style={{ color: 'var(--text-primary)' }}>{detailData.passengerCount} Persons</span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <strong style={{ color: 'var(--text-secondary)' }}>Parcel: </strong>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {detailData.parcelDescription} ({detailData.parcelCategory})
                            {detailData.parcelWeightKg && ` • ${detailData.parcelWeightKg} kg`}
                          </span>
                        </div>
                        {detailData.recipientName && (
                          <div>
                            <strong style={{ color: 'var(--text-secondary)' }}>Recipient: </strong>
                            <span style={{ color: 'var(--text-primary)' }}>{detailData.recipientName} ({detailData.recipientPhone})</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Status Transition History Timeline */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} style={{ color: 'var(--brand-primary)' }} />
                  <span>Immutable Status Timeline</span>
                </div>

                <div style={{ paddingLeft: '8px', borderLeft: '2px solid var(--surface-border)' }}>
                  {history.map((step, idx) => (
                    <div key={step.id || idx} style={{ position: 'relative', paddingLeft: '18px', paddingBottom: idx === history.length - 1 ? '0' : '16px' }}>
                      {/* Timeline dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-6px',
                          top: '3px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: idx === history.length - 1 ? 'var(--brand-primary)' : 'var(--text-muted)',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {step.toStatus?.replace(/_/g, ' ')}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--surface-subtle)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          by {step.actorRole?.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {new Date(step.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {step.reason && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {step.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Consequential Actions (Withdraw / Cancel) */}
              {canCancel() && !showCancelPrompt && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--surface-border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#fca5a5',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {item.itemType === 'jobs' ? 'Withdraw Application' : 'Cancel Request'}
                  </button>
                </div>
              )}

              {/* Cancellation Confirmation Prompt */}
              {showCancelPrompt && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    marginTop: '16px',
                  }}
                >
                  <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fca5a5', margin: '0 0 6px' }}>
                    Confirm {item.itemType === 'jobs' ? 'Withdrawal' : 'Cancellation'}
                  </h5>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                    This action will update the request status to {item.itemType === 'jobs' ? 'withdrawn' : 'cancelled'} and record an immutable audit log.
                  </p>

                  {actionError && (
                    <div style={{ color: 'var(--status-crimson)', fontSize: '0.78rem', marginBottom: '8px' }}>
                      {actionError}
                    </div>
                  )}

                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason (optional, e.g. plans changed)"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--surface-ground)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      marginBottom: '10px',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(false)}
                      disabled={actionLoading}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePerformCancel}
                      disabled={actionLoading}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--status-crimson)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {actionLoading ? 'Processing...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
