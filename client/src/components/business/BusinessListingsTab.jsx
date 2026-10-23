import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Clock,
  ShieldCheck,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  Archive,
  Trash2,
  Edit,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Store,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import CreateListingModal from '../modules/CreateListingModal';

export default function BusinessListingsTab({ businessId, isOwner, userRole, permissions = [] }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canCreate = isOwner || permissions.includes('listings.create');
  const canManage = isOwner || permissions.includes('listings.manage');

  const fetchListings = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.getBusinessListings(businessId);
      setListings(res.listings || []);
    } catch (err) {
      setError(err.message || 'Failed to load business listings.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Update availability status
  const handleAvailabilityChange = async (listingId, newStatus) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.updateListingAvailability(listingId, newStatus);
      setActionSuccess(`Availability updated to ${newStatus.replace(/_/g, ' ')}.`);
      fetchListings();
    } catch (err) {
      setError(err.message || 'Failed to update availability.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update status (pause / publish / archive)
  const handleStatusChange = async (listingId, newStatus) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.updateListingStatus(listingId, newStatus);
      setActionSuccess(`Listing status updated to ${newStatus}.`);
      fetchListings();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Archive / Delete listing
  const handleDelete = async (listingId) => {
    if (!window.confirm('Are you sure you want to archive this listing?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.deleteListing(listingId);
      setActionSuccess('Listing archived successfully.');
      fetchListings();
    } catch (err) {
      setError(err.message || 'Failed to archive listing.');
    } finally {
      setActionLoading(false);
    }
  };

  // Module specific availability options
  const getAvailabilityOptions = (mod) => {
    switch (mod) {
      case 'rentals':
        return [
          { val: 'available', label: 'Available' },
          { val: 'rented', label: 'Rented' },
          { val: 'temporarily_unavailable', label: 'Unavailable' },
        ];
      case 'marketplace':
        return [
          { val: 'in_stock', label: 'In Stock' },
          { val: 'out_of_stock', label: 'Out of Stock' },
          { val: 'made_to_order', label: 'Made to Order' },
        ];
      case 'krishi_products':
        return [
          { val: 'available', label: 'Available' },
          { val: 'sold_out', label: 'Sold Out' },
          { val: 'harvesting_soon', label: 'Harvesting Soon' },
        ];
      case 'krishi_equipment':
        return [
          { val: 'available', label: 'Available' },
          { val: 'booked', label: 'Booked' },
          { val: 'maintenance', label: 'In Maintenance' },
        ];
      case 'services':
        return [
          { val: 'available_now', label: 'Available' },
          { val: 'busy', label: 'Busy' },
          { val: 'unavailable', label: 'Unavailable' },
        ];
      default:
        return [
          { val: 'available', label: 'Available' },
          { val: 'unavailable', label: 'Unavailable' },
        ];
    }
  };

  const publishedCount = listings.filter((l) => l.status === 'published').length;
  const pendingCount = listings.filter((l) => l.status === 'pending_review').length;
  const pausedCount = listings.filter((l) => l.status === 'paused').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Controls & Metrics */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Total Listings</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{listings.length}</strong>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Published Live</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--status-emerald)' }}>{publishedCount}</strong>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Pending Review</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--status-amber)' }}>{pendingCount}</strong>
          </div>
          {pausedCount > 0 && (
            <div style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--surface-border)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Paused</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>{pausedCount}</strong>
            </div>
          )}
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} />
            <span>Post New Listing</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--status-crimson-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--status-crimson)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--status-emerald-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--status-emerald)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Listings Table / Cards */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock size={28} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
          <p>Loading business listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--surface-card)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
          <Store size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            No listings created under this business
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>
            Add your job openings, rental vacancies, retail inventory, agricultural produce, or local services.
          </p>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Post First Listing
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {listings.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div style={{ flex: '1 1 260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--brand-electric)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.module?.replace(/_/g, ' ')}
                  </span>

                  {/* Status Badge */}
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor:
                        item.status === 'published'
                          ? 'var(--status-emerald-bg)'
                          : item.status === 'pending_review'
                          ? 'var(--status-amber-bg)'
                          : 'rgba(255, 255, 255, 0.08)',
                      color:
                        item.status === 'published'
                          ? 'var(--status-emerald)'
                          : item.status === 'pending_review'
                          ? 'var(--status-amber)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {item.status === 'published'
                      ? 'Live on Public Portal'
                      : item.status === 'pending_review'
                      ? 'Pending Moderation Review'
                      : item.status}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {item.title}
                </h4>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Category: {item.category} • Area: {item.area_name || 'Deori'}
                  {item.price && ` • ₹${Number(item.price).toLocaleString('en-IN')}`}
                </div>
              </div>

              {/* Management Controls */}
              {canManage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Availability Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      Availability
                    </label>
                    <select
                      value={item.availability_status}
                      disabled={actionLoading}
                      onChange={(e) => handleAvailabilityChange(item.id, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {getAvailabilityOptions(item.module).map((opt) => (
                        <option key={opt.val} value={opt.val}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Toggle Button (Pause / Resume) */}
                  {item.status === 'published' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(item.id, 'paused')}
                      title="Temporarily pause visibility"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <PauseCircle size={14} />
                      <span>Pause</span>
                    </button>
                  )}

                  {item.status === 'paused' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(item.id, 'published')}
                      title="Resume live publication"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--status-emerald-bg)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: 'var(--status-emerald)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <PlayCircle size={14} />
                      <span>Publish</span>
                    </button>
                  )}

                  {/* Archive Button */}
                  {item.status !== 'archived' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDelete(item.id)}
                      title="Archive listing"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--status-crimson)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Archive size={14} />
                      <span>Archive</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultModule="jobs"
        onListingCreated={() => {
          fetchListings();
        }}
      />
    </div>
  );
}
