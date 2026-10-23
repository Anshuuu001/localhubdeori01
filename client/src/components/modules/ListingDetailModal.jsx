import React, { useState } from 'react';
import {
  X,
  MapPin,
  ShieldCheck,
  Phone,
  MessageCircle,
  Mail,
  AlertTriangle,
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Info,
  Briefcase,
  Wrench,
  MessageSquare,
  Send,
} from 'lucide-react';
import ReportModal from './ReportModal';
import JobApplicationModal from './JobApplicationModal';
import ListingEnquiryModal from './ListingEnquiryModal';
import ServiceRequestModal from './ServiceRequestModal';

export default function ListingDetailModal({ listing, isOpen, onClose }) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isJobApplyOpen, setIsJobApplyOpen] = useState(false);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [isServiceRequestOpen, setIsServiceRequestOpen] = useState(false);

  if (!isOpen || !listing) return null;

  const {
    id,
    module,
    title,
    category,
    description,
    price,
    price_period,
    is_price_negotiable,
    availability_status,
    area_name,
    area_marathi_name,
    created_at,
    updated_at,
    photos = [],
    amenities = [],
    business,
    is_contact_hidden,
    contact_phone,
    contact_email,
    contact_whatsapp,
    provider_name,
    // Jobs
    job_type,
    qualifications,
    experience_required,
    salary_min,
    salary_max,
    vacancies_count,
    application_method,
    how_to_apply,
    job_expires_at,
    // Rentals
    property_type,
    deposit_amount,
    furnishing_status,
    rental_address,
    // Marketplace
    is_condition_new,
    warranty_info,
    brand,
    sku,
    // Krishi
    krishi_type,
    crop_name,
    crop_quantity,
    crop_unit,
    equipment_name,
    equipment_type,
    equipment_mode,
    rental_rate_unit,
    rental_terms,
    equipment_deposit,
    // Services
    service_mode,
    pricing_type,
    service_hours,
    experience_years,
  } = listing;

  const validPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];

  const renderPrice = () => {
    if (price === null || price === undefined) {
      if (module === 'services' && pricing_type === 'quote_on_inspection') {
        return 'Quote on inspection';
      }
      return 'Price on request';
    }
    const formatted = Number(price).toLocaleString('en-IN');
    if (module === 'rentals' || module === 'jobs') {
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

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '780px',
            width: '92%',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: 'var(--surface-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--surface-border)',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Header & Close */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--brand-blue-bg)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: 'var(--brand-electric)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {category}
                </span>

                {area_name && (
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--surface-subtle)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <MapPin size={12} />
                    {area_name} {area_marathi_name ? `(${area_marathi_name})` : ''}
                  </span>
                )}

                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--surface-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    textTransform: 'capitalize',
                  }}
                >
                  Status: {availability_status?.replace(/_/g, ' ')}
                </span>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {title}
              </h2>
            </div>

            <button
              onClick={onClose}
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Photo Gallery (if photos exist) */}
          {validPhotos.length > 0 && (
            <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '320px',
                  width: '100%',
                  backgroundColor: 'var(--surface-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={validPhotos[activePhotoIdx]}
                  alt={title}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              {validPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : validPhotos.length - 1))}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(7, 9, 14, 0.75)',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    onClick={() => setActivePhotoIdx((prev) => (prev < validPhotos.length - 1 ? prev + 1 : 0))}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(7, 9, 14, 0.75)',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {validPhotos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setActivePhotoIdx(i)}
                        style={{
                          width: '60px',
                          height: '50px',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          border: activePhotoIdx === i ? '2px solid var(--brand-electric)' : '1px solid var(--surface-border)',
                          flexShrink: 0,
                        }}
                      >
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Price & Commercial Terms Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                {module === 'jobs' ? 'Offered Compensation' : module === 'rentals' ? 'Rental Terms' : 'Listed Price'}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-electric)' }}>
                {renderPrice()}
              </div>
              {is_price_negotiable && (
                <span style={{ fontSize: '0.75rem', color: 'var(--status-emerald)' }}>
                  Price is negotiable upon discussion
                </span>
              )}
            </div>

            {/* In-Platform Primary Action & Direct Contact Actions */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              {/* In-Platform Primary Action Button */}
              {module === 'jobs' && (
                <button
                  type="button"
                  onClick={() => setIsJobApplyOpen(true)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--brand-electric)',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Briefcase size={16} />
                  <span>Apply for Position</span>
                </button>
              )}

              {module === 'services' && (
                <button
                  type="button"
                  onClick={() => setIsServiceRequestOpen(true)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--brand-electric)',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Wrench size={16} />
                  <span>Book Local Service</span>
                </button>
              )}

              {['rentals', 'marketplace', 'krishi_products', 'krishi_equipment'].includes(module) && (
                <button
                  type="button"
                  onClick={() => setIsEnquiryOpen(true)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--brand-electric)',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <MessageSquare size={16} />
                  <span>Send In-Platform Enquiry</span>
                </button>
              )}

              {is_contact_hidden ? (
                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--surface-border)',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  Direct phone hidden
                </div>
              ) : (
                <>
                  {contact_phone && (
                    <a
                      href={`tel:${contact_phone}`}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--status-emerald)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                      }}
                    >
                      <Phone size={16} />
                      <span>Call {contact_phone}</span>
                    </a>
                  )}

                  {contact_whatsapp && (
                    <a
                      href={`https://wa.me/${contact_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#25D366',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Module-Specific Technical Specifications */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
            }}
          >
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Listing Specifications & Criteria
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
              {module === 'jobs' && (
                <>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Job Type</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{job_type || 'Full-time'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Vacancies</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{vacancies_count || 1} Openings</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Required Experience</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{experience_required || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Qualifications</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{qualifications || 'Any eligible candidate'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Application Method</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{application_method?.replace(/_/g, ' ') || 'Direct Contact'}</strong>
                  </div>
                  {job_expires_at && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Closing Date</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{new Date(job_expires_at).toLocaleDateString()}</strong>
                    </div>
                  )}
                </>
              )}

              {module === 'rentals' && (
                <>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Property Type</span>
                    <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{property_type}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Security Deposit</span>
                    <strong style={{ color: 'var(--text-primary)' }}>₹{Number(deposit_amount || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Furnishing State</span>
                    <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{furnishing_status?.replace(/_/g, ' ') || 'Unfurnished'}</strong>
                  </div>
                  {rental_address && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Specific Locality</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{rental_address}</strong>
                    </div>
                  )}
                </>
              )}

              {module === 'marketplace' && (
                <>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Condition</span>
                    <strong style={{ color: 'var(--status-emerald)' }}>Brand New (Retail Inventory)</strong>
                  </div>
                  {warranty_info && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Warranty Coverage</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{warranty_info}</strong>
                    </div>
                  )}
                  {brand && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Brand / Manufacturer</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{brand}</strong>
                    </div>
                  )}
                  {sku && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Model / SKU</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{sku}</strong>
                    </div>
                  )}
                </>
              )}

              {(module === 'krishi_products' || module === 'krishi_equipment') && (
                <>
                  {crop_name && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Crop / Variety</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{crop_name}</strong>
                    </div>
                  )}
                  {crop_quantity && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Batch Quantity</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{crop_quantity} {crop_unit}</strong>
                    </div>
                  )}
                  {equipment_type && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Equipment Type</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{equipment_type}</strong>
                    </div>
                  )}
                  {equipment_mode && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Listing Mode</span>
                      <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>For {equipment_mode}</strong>
                    </div>
                  )}
                  {equipment_deposit > 0 && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Security Deposit</span>
                      <strong style={{ color: 'var(--text-primary)' }}>₹{Number(equipment_deposit).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                </>
              )}

              {module === 'services' && (
                <>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Service Mode</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{service_mode?.replace(/_/g, ' ')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Pricing Model</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{pricing_type?.replace(/_/g, ' ')}</strong>
                  </div>
                  {service_hours && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Operating Hours</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{service_hours}</strong>
                    </div>
                  )}
                  {experience_years > 0 && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Experience</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{experience_years}+ Years</strong>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Rentals Amenities */}
            {module === 'rentals' && amenities.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--surface-border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', marginBottom: '8px' }}>
                  Provided Amenities:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {amenities.map((amenity, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={13} style={{ color: 'var(--status-emerald)' }} />
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* How to Apply / Terms text */}
            {how_to_apply && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--surface-border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>
                  How to Apply / Candidate Instructions:
                </span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{how_to_apply}</p>
              </div>
            )}

            {rental_terms && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--surface-border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>
                  Rental Terms & Conditions:
                </span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{rental_terms}</p>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Description & Overview
            </h4>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {description}
            </p>
          </div>

          {/* Seller / Business Profile & Branch Info */}
          {business && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building2 size={24} style={{ color: 'var(--brand-electric)' }} />
                  <div>
                    <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {business.name}
                    </h5>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {business.address || 'Deori Taluka, Maharashtra'}
                    </div>
                  </div>
                </div>

                {business.isVerified ? (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--status-emerald-bg)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--status-emerald)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ShieldCheck size={14} />
                    Verified Local Business
                  </span>
                ) : (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--status-amber-bg)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: 'var(--status-amber)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    Pending Verification
                  </span>
                )}
              </div>

              {business.branch && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '34px' }}>
                  <strong>Branch:</strong> {business.branch.name} • {business.branch.address}
                </div>
              )}
            </div>
          )}

          {/* Module Integrity Safeguard Disclaimers */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <Info size={16} style={{ color: 'var(--brand-electric)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              {module === 'rentals' && (
                <span>
                  <strong>Property Safeguard:</strong> Account verification does not prove legal property ownership or authorization to rent. Never transfer advance rent or deposits without physically inspecting the premises in Deori.
                </span>
              )}
              {module === 'marketplace' && (
                <span>
                  <strong>Marketplace Policy:</strong> LocalHub X strictly features brand-new retail products from Deori businesses. No second-hand listings. Verify warranty cards upon store pickup.
                </span>
              )}
              {module === 'krishi_products' && (
                <span>
                  <strong>Agricultural Declaration:</strong> Mandi rates and quality declarations are provided directly by the seller. Official APMC rates require verification at the local market yard.
                </span>
              )}
              {module === 'krishi_equipment' && (
                <span>
                  <strong>Equipment Safeguard:</strong> Inspect machinery condition, diesel terms, and operator inclusion before finalizing bookings.
                </span>
              )}
              {module === 'services' && (
                <span>
                  <strong>Service Advisory:</strong> Provider verification confirms identity and locality in Deori Taluka, but does not guarantee trade skill or workmanship. Agree on quotation before work commences.
                </span>
              )}
              {module === 'jobs' && (
                <span>
                  <strong>Employment Safeguard:</strong> Genuine Deori employers do not charge application fees or registration charges. Report any suspicious fee requests immediately.
                </span>
              )}
            </div>
          </div>

          {/* Footer Actions: Last Updated & Report */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '1px solid var(--surface-border-subtle)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              Listed: {new Date(created_at).toLocaleDateString()}
              {updated_at && updated_at !== created_at && ` • Updated: ${new Date(updated_at).toLocaleDateString()}`}
            </div>

            <button
              onClick={() => setIsReportOpen(true)}
              style={{
                color: 'var(--status-crimson)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <ShieldAlert size={14} />
              <span>Report Listing / Inaccurate Details</span>
            </button>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="listing"
        targetId={id}
        targetTitle={title}
      />

      {module === 'jobs' && (
        <JobApplicationModal
          listing={listing}
          isOpen={isJobApplyOpen}
          onClose={() => setIsJobApplyOpen(false)}
        />
      )}

      {['rentals', 'marketplace', 'krishi_products', 'krishi_equipment'].includes(module) && (
        <ListingEnquiryModal
          listing={listing}
          isOpen={isEnquiryOpen}
          onClose={() => setIsEnquiryOpen(false)}
        />
      )}

      {module === 'services' && (
        <ServiceRequestModal
          listing={listing}
          isOpen={isServiceRequestOpen}
          onClose={() => setIsServiceRequestOpen(false)}
        />
      )}
    </>
  );
}
