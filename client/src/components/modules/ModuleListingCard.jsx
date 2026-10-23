import React from 'react';
import {
  MapPin,
  ShieldCheck,
  Phone,
  MessageCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  Tag,
  Clock,
  Briefcase,
  Home,
  ShoppingBag,
  Wheat,
  Wrench,
  Sparkles,
} from 'lucide-react';

export default function ModuleListingCard({ listing, onSelect, onReport }) {
  const {
    id,
    module,
    title,
    category,
    price,
    price_period,
    is_price_negotiable,
    availability_status,
    area_name,
    photos,
    business,
    is_contact_hidden,
    contact_phone,
    contact_whatsapp,
    // Module specific fields
    job_type,
    experience_required,
    property_type,
    deposit_amount,
    furnishing_status,
    warranty_info,
    is_condition_new,
    krishi_type,
    crop_quantity,
    crop_unit,
    equipment_type,
    equipment_mode,
    rental_rate_unit,
    service_mode,
    pricing_type,
  } = listing;

  const photoUrl = photos && photos.length > 0 ? photos[0] : null;

  // Format price display
  const renderPrice = () => {
    if (price === null || price === undefined) {
      if (module === 'services' && pricing_type === 'quote_on_inspection') {
        return 'Quote on inspection';
      }
      return 'Price on request';
    }

    const formatted = Number(price).toLocaleString('en-IN');

    if (module === 'rentals') {
      return `₹${formatted} / ${price_period || 'month'}`;
    }
    if (module === 'jobs') {
      return `₹${formatted} / ${price_period || 'month'}`;
    }
    if (module === 'krishi_equipment' || equipment_mode === 'rental') {
      return `₹${formatted} / ${(rental_rate_unit || 'hour').replace('_', ' ')}`;
    }
    if (module === 'krishi_products' && crop_unit) {
      return `₹${formatted} / ${crop_unit}`;
    }
    return `₹${formatted}`;
  };

  // Availability badge styling
  const getAvailabilityBadge = () => {
    switch (availability_status) {
      case 'available':
      case 'in_stock':
      case 'available_now':
        return {
          label: availability_status === 'in_stock' ? 'In Stock' : 'Available',
          bg: 'var(--status-emerald-bg)',
          color: 'var(--status-emerald)',
          border: 'rgba(16, 185, 129, 0.3)',
        };
      case 'rented':
      case 'out_of_stock':
      case 'sold_out':
      case 'booked':
        return {
          label:
            availability_status === 'rented'
              ? 'Rented'
              : availability_status === 'out_of_stock'
              ? 'Out of Stock'
              : availability_status === 'sold_out'
              ? 'Sold Out'
              : 'Booked',
          bg: 'var(--status-crimson-bg)',
          color: 'var(--status-crimson)',
          border: 'rgba(239, 68, 68, 0.3)',
        };
      case 'temporarily_unavailable':
      case 'busy':
      case 'harvesting_soon':
      case 'maintenance':
        return {
          label:
            availability_status === 'busy'
              ? 'Busy'
              : availability_status === 'harvesting_soon'
              ? 'Harvesting Soon'
              : 'Temporarily Unavailable',
          bg: 'var(--status-amber-bg)',
          color: 'var(--status-amber)',
          border: 'rgba(245, 158, 11, 0.3)',
        };
      default:
        return {
          label: availability_status,
          bg: 'var(--surface-subtle)',
          color: 'var(--text-secondary)',
          border: 'var(--surface-border)',
        };
    }
  };

  const availBadge = getAvailabilityBadge();

  return (
    <div
      className="listing-card"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--surface-border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all var(--transition-normal)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Photo / Thumbnail or Fallback Pattern */}
      <div
        style={{
          height: '180px',
          width: '100%',
          backgroundColor: 'var(--surface-subtle)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: 'var(--text-muted)',
              gap: '6px',
            }}
          >
            {module === 'jobs' && <Briefcase size={36} />}
            {module === 'rentals' && <Home size={36} />}
            {module === 'marketplace' && <ShoppingBag size={36} />}
            {(module === 'krishi_products' || module === 'krishi_equipment') && <Wheat size={36} />}
            {module === 'services' && <Wrench size={36} />}
            <span style={{ fontSize: '0.75rem' }}>LocalHub X {category}</span>
          </div>
        )}

        {/* Top Floating Badges */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(7, 9, 14, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '0.72rem',
              fontWeight: 600,
            }}
          >
            {category}
          </span>

          <span
            style={{
              padding: '3px 9px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: availBadge.bg,
              border: `1px solid ${availBadge.border}`,
              color: availBadge.color,
              fontSize: '0.72rem',
              fontWeight: 700,
              backdropFilter: 'blur(4px)',
            }}
          >
            {availBadge.label}
          </span>
        </div>

        {/* Marketplace: Strictly Brand New Badge */}
        {module === 'marketplace' && is_condition_new && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '10px',
              backgroundColor: 'rgba(37, 99, 235, 0.9)',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={12} />
            <span>Brand New Retail Product</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
        {/* Title & Business / Area */}
        <div>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.35,
              marginBottom: '6px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.78rem' }}>
            {business?.name ? (
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {business.name}
                {business.isVerified && (
                  <span
                    title="Verified Deori Establishment"
                    style={{
                      color: 'var(--status-emerald)',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <ShieldCheck size={14} />
                  </span>
                )}
              </span>
            ) : null}

            {area_name && (
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <MapPin size={12} />
                {area_name}
              </span>
            )}
          </div>
        </div>

        {/* Module Specific Spec Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem' }}>
          {module === 'jobs' && (
            <>
              {job_type && (
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)' }}>
                  {job_type}
                </span>
              )}
              {experience_required && (
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)' }}>
                  Exp: {experience_required}
                </span>
              )}
            </>
          )}

          {module === 'rentals' && (
            <>
              {property_type && (
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {property_type}
                </span>
              )}
              {furnishing_status && (
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {furnishing_status.replace('_', ' ')}
                </span>
              )}
              {deposit_amount > 0 && (
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-muted)' }}>
                  Deposit: ₹{Number(deposit_amount).toLocaleString('en-IN')}
                </span>
              )}
            </>
          )}

          {module === 'marketplace' && warranty_info && (
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)' }}>
              Warranty: {warranty_info}
            </span>
          )}

          {(module === 'krishi_products' || module === 'krishi_equipment') && (
            <>
              {crop_quantity && crop_unit && (
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)' }}>
                  Qty: {crop_quantity} {crop_unit}
                </span>
              )}
              {equipment_type && (
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)' }}>
                  {equipment_type}
                </span>
              )}
              {equipment_mode && (
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--brand-electric)', textTransform: 'capitalize' }}>
                  For {equipment_mode}
                </span>
              )}
            </>
          )}

          {module === 'services' && (
            <>
              {service_mode && (
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)' }}>
                  Mode: {service_mode.replace(/_/g, ' ')}
                </span>
              )}
            </>
          )}
        </div>

        {/* Price & Primary Contextual Actions */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid var(--surface-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-electric)' }}>
              {renderPrice()}
            </div>
            {is_price_negotiable && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Negotiable</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Quick Contact Button (Only if allowed & visible) */}
            {!is_contact_hidden && contact_phone ? (
              <a
                href={`tel:${contact_phone}`}
                onClick={(e) => e.stopPropagation()}
                title={`Call ${contact_phone}`}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--status-emerald-bg)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'var(--status-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Phone size={13} />
                <span>Call</span>
              </a>
            ) : null}

            {/* View Details Button */}
            <button
              onClick={() => onSelect(listing)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <Eye size={13} />
              <span>Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
