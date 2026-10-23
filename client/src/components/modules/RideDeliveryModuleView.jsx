import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Truck,
  Car,
  Package,
  MapPin,
  Calendar,
  Clock,
  Users,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Info,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function RideDeliveryModuleView() {
  const { user, areasList, openAuthModal, navigateToModule } = useApp();

  const [activeTab, setActiveTab] = useState('ride'); // 'ride' | 'delivery'

  // Ride Form State
  const [rideForm, setRideForm] = useState({
    pickupAreaId: 'deori-hq',
    pickupAddress: '',
    dropoffAreaId: 'chichgarh',
    dropoffAddress: '',
    scheduledDate: '',
    scheduledTime: '',
    passengerCount: 1,
    contactName: user?.fullName || '',
    contactPhone: user?.phone || '',
    contactPreference: 'phone',
    notes: '',
  });

  // Delivery Form State
  const [deliveryForm, setDeliveryForm] = useState({
    pickupAreaId: 'deori-hq',
    pickupAddress: '',
    dropoffAreaId: 'soundad',
    dropoffAddress: '',
    scheduledDate: '',
    scheduledTime: '',
    parcelCategory: 'produce_agri',
    parcelWeightKg: '',
    parcelDescription: '',
    recipientName: '',
    recipientPhone: '',
    contactName: user?.fullName || '',
    contactPhone: user?.phone || '',
    contactPreference: 'phone',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const handleRideSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.submitTransitRequest({
        requestType: 'ride',
        pickupAreaId: rideForm.pickupAreaId,
        pickupAddress: rideForm.pickupAddress,
        dropoffAreaId: rideForm.dropoffAreaId,
        dropoffAddress: rideForm.dropoffAddress,
        scheduledDate: rideForm.scheduledDate || null,
        scheduledTime: rideForm.scheduledTime || null,
        passengerCount: parseInt(rideForm.passengerCount, 10) || 1,
        contactName: rideForm.contactName,
        contactPhone: rideForm.contactPhone,
        contactPreference: rideForm.contactPreference,
        notes: rideForm.notes,
      });

      setSuccessResult({
        type: 'ride',
        ...res.transitRequest,
      });
    } catch (err) {
      setError(err.message || 'Failed to submit ride request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.submitTransitRequest({
        requestType: 'delivery',
        pickupAreaId: deliveryForm.pickupAreaId,
        pickupAddress: deliveryForm.pickupAddress,
        dropoffAreaId: deliveryForm.dropoffAreaId,
        dropoffAddress: deliveryForm.dropoffAddress,
        scheduledDate: deliveryForm.scheduledDate || null,
        scheduledTime: deliveryForm.scheduledTime || null,
        parcelCategory: deliveryForm.parcelCategory,
        parcelWeightKg: deliveryForm.parcelWeightKg ? parseFloat(deliveryForm.parcelWeightKg) : null,
        parcelDescription: deliveryForm.parcelDescription,
        recipientName: deliveryForm.recipientName,
        recipientPhone: deliveryForm.recipientPhone,
        contactName: deliveryForm.contactName,
        contactPhone: deliveryForm.contactPhone,
        contactPreference: deliveryForm.contactPreference,
        notes: deliveryForm.notes,
      });

      setSuccessResult({
        type: 'delivery',
        ...res.transitRequest,
      });
    } catch (err) {
      setError(err.message || 'Failed to submit delivery request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ride-delivery-module" style={{ maxWidth: '920px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Hero Header */}
      <div
        style={{
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-electric)',
              }}
            >
              <Truck size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Ride & Local Delivery
                </h1>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--brand-blue-bg)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: 'var(--brand-electric)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  Phase 4 Live
                </span>
              </div>
              <div style={{ color: 'var(--brand-electric)', fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>
                प्रवास आणि पार्सल • Deori Taluka Inter-Village Transit & Goods
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '14px 0 0', lineHeight: 1.5 }}>
          Coordinate scheduled auto-rickshaws, shared jeeps, and rural parcel delivery runs between Deori Town, Chichgarh, Soundad, Kohmara, and surrounding rural circles.
        </p>
      </div>

      {/* Honest Operational & Safety Safeguard Notice */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          color: '#fcd34d',
          fontSize: '0.8rem',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          marginBottom: '24px',
          lineHeight: 1.5,
        }}
      >
        <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--status-amber)' }} />
        <div>
          <strong>Safety & Operational Guidelines for Rural Transit:</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: '18px', opacity: 0.95 }}>
            <li><strong>No GPS Tracking:</strong> Rides and deliveries operate via direct driver phone coordination and registered stand dispatch, not continuous live telemetry.</li>
            <li><strong>No Online Payments or Metered Fares:</strong> Standard stand rates apply. Verify fare directly with the driver prior to departure. Never transfer advance fare online.</li>
            <li><strong>Emergency Helpline:</strong> Dial 112 / 108 immediately in case of emergency on NH-53 or rural taluka routes.</li>
          </ul>
        </div>
      </div>

      {/* Mode Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '1px solid var(--surface-border)',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => { setActiveTab('ride'); setSuccessResult(null); setError(null); }}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'ride' ? '2px solid var(--brand-electric)' : '2px solid transparent',
            color: activeTab === 'ride' ? 'var(--brand-electric)' : 'var(--text-muted)',
            fontWeight: activeTab === 'ride' ? 700 : 500,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Car size={18} />
          <span>Book a Local Ride (प्रवासी प्रवास)</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('delivery'); setSuccessResult(null); setError(null); }}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'delivery' ? '2px solid var(--brand-electric)' : '2px solid transparent',
            color: activeTab === 'delivery' ? 'var(--brand-electric)' : 'var(--text-muted)',
            fontWeight: activeTab === 'delivery' ? 700 : 500,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Package size={18} />
          <span>Local Parcel & Delivery (स्थानिक पार्सल)</span>
        </button>
      </div>

      {/* Success Notification */}
      {successResult && (
        <div
          style={{
            padding: '28px 24px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--surface-card)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--status-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <CheckCircle2 size={30} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            {successResult.type === 'ride' ? 'Ride Request Registered!' : 'Delivery Request Dispatched!'}
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 16px', lineHeight: 1.5 }}>
            Your request from <strong>{successResult.pickupAddress}</strong> to <strong>{successResult.dropoffAddress}</strong> has been logged. Available local operators will contact your mobile directly to coordinate.
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
              marginBottom: '20px',
            }}
          >
            Ref: #{successResult.id?.slice(0, 8).toUpperCase()} • Valid for 24 Hours
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => setSuccessResult(null)}
              className="btn btn-secondary"
              style={{ padding: '9px 18px' }}
            >
              Book Another
            </button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#fca5a5',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* RIDE FORM */}
      {activeTab === 'ride' && !successResult && (
        <form
          onSubmit={handleRideSubmit}
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Passenger Journey Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Pickup Circle / Village *
              </label>
              <select
                value={rideForm.pickupAreaId}
                onChange={(e) => setRideForm({ ...rideForm, pickupAreaId: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
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
                Pickup Landmark / Stop *
              </label>
              <input
                type="text"
                required
                value={rideForm.pickupAddress}
                onChange={(e) => setRideForm({ ...rideForm, pickupAddress: e.target.value })}
                placeholder="e.g. Shivaji Chowk, Bus Stand, Main Market"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Destination Circle / Village *
              </label>
              <select
                value={rideForm.dropoffAreaId}
                onChange={(e) => setRideForm({ ...rideForm, dropoffAreaId: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
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
                Destination Address / Stop *
              </label>
              <input
                type="text"
                required
                value={rideForm.dropoffAddress}
                onChange={(e) => setRideForm({ ...rideForm, dropoffAddress: e.target.value })}
                placeholder="e.g. Chichgarh PHC, Soundad Station, Mandir"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Travel Date
              </label>
              <input
                type="date"
                value={rideForm.scheduledDate}
                onChange={(e) => setRideForm({ ...rideForm, scheduledDate: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Approximate Time
              </label>
              <input
                type="text"
                value={rideForm.scheduledTime}
                onChange={(e) => setRideForm({ ...rideForm, scheduledTime: e.target.value })}
                placeholder="e.g. 10:00 AM, Immediate"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Passengers (1–10) *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={rideForm.passengerCount}
                onChange={(e) => setRideForm({ ...rideForm, passengerCount: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Your Name *
              </label>
              <input
                type="text"
                required
                value={rideForm.contactName}
                onChange={(e) => setRideForm({ ...rideForm, contactName: e.target.value })}
                placeholder="Passenger contact"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={rideForm.contactPhone}
                onChange={(e) => setRideForm({ ...rideForm, contactPhone: e.target.value })}
                placeholder="10-digit mobile"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Special Notes / Luggage Details
            </label>
            <input
              type="text"
              value={rideForm.notes}
              onChange={(e) => setRideForm({ ...rideForm, notes: e.target.value })}
              placeholder="e.g. 2 sacks of grain, elderly passenger needing seat near door"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '11px 26px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {submitting ? (
                <span>Registering Ride...</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Ride Request to Local Stand</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* DELIVERY FORM */}
      {activeTab === 'delivery' && !successResult && (
        <form
          onSubmit={handleDeliverySubmit}
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Parcel & Courier Specifications
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Pickup Circle / Village *
              </label>
              <select
                value={deliveryForm.pickupAreaId}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, pickupAreaId: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
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
                Pickup Address / Shop Landmark *
              </label>
              <input
                type="text"
                required
                value={deliveryForm.pickupAddress}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, pickupAddress: e.target.value })}
                placeholder="e.g. Kisan Seva Kendra, NH-53 Deori"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Delivery Destination Circle *
              </label>
              <select
                value={deliveryForm.dropoffAreaId}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, dropoffAreaId: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
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
                Delivery Drop-off Address *
              </label>
              <input
                type="text"
                required
                value={deliveryForm.dropoffAddress}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, dropoffAddress: e.target.value })}
                placeholder="e.g. Near Soundad Station, Shop #5"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Parcel Category *
              </label>
              <select
                value={deliveryForm.parcelCategory}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, parcelCategory: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                <option value="produce_agri">Agri Seeds & Farm Produce</option>
                <option value="documents">Official Documents / Papers</option>
                <option value="retail_goods">Store Goods & Groceries</option>
                <option value="spare_parts">Machinery & Auto Spare Parts</option>
                <option value="medicines">Pharmacy & Medical Supplies</option>
                <option value="personal_luggage">Personal Luggage</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Estimated Weight (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={deliveryForm.parcelWeightKg}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, parcelWeightKg: e.target.value })}
                placeholder="e.g. 5.5"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Package Description *
            </label>
            <input
              type="text"
              required
              value={deliveryForm.parcelDescription}
              onChange={(e) => setDeliveryForm({ ...deliveryForm, parcelDescription: e.target.value })}
              placeholder="e.g. Sealed bag of paddy seeds with invoice"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>

          {/* Recipient Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Recipient Name
              </label>
              <input
                type="text"
                value={deliveryForm.recipientName}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, recipientName: e.target.value })}
                placeholder="Person receiving parcel"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Recipient Mobile Phone
              </label>
              <input
                type="tel"
                value={deliveryForm.recipientPhone}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, recipientPhone: e.target.value })}
                placeholder="10-digit mobile"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Sender Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Sender Contact Name *
              </label>
              <input
                type="text"
                required
                value={deliveryForm.contactName}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, contactName: e.target.value })}
                placeholder="Your name"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Sender Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={deliveryForm.contactPhone}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, contactPhone: e.target.value })}
                placeholder="10-digit mobile"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '11px 26px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {submitting ? (
                <span>Registering Parcel Run...</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>Request Local Parcel Delivery</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
