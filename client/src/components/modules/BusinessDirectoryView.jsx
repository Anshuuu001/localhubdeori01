import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  Globe,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  X,
  Store,
  Layers,
  Sparkles,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import ReportModal from './ReportModal';

export default function BusinessDirectoryView() {
  const { user, areasList, setAppMode, openAuthModal } = useApp();

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  // Detail Modal State
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedAreaId !== 'all') params.areaId = selectedAreaId;
      if (verificationFilter !== 'all') params.verificationStatus = verificationFilter;
      params.page = pagination.page;

      const res = await api.getDirectory(params);
      setBusinesses(res.businesses || []);
      if (res.pagination) {
        setPagination((prev) => ({ ...prev, total: res.pagination.total, totalPages: res.pagination.totalPages }));
      }
    } catch (err) {
      console.error('[BusinessDirectory] Load failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedAreaId, verificationFilter, pagination.page]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleOpenDetail = async (biz) => {
    setLoadingDetail(true);
    try {
      const res = await api.getDirectoryBusiness(biz.id);
      setSelectedBusiness(res.business);
    } catch (err) {
      setSelectedBusiness(biz);
    } finally {
      setLoadingDetail(false);
    }
  };

  const categories = [
    'All',
    'Retail & General Stores',
    'Agriculture & Seeds',
    'Hardware & Electrical',
    'Automotive & Tractor Workshop',
    'Healthcare & Chemist',
    'Textiles & Garments',
    'Hospitality & Dining',
    'Construction & Building Materials',
  ];

  return (
    <div className="business-directory-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Directory Hero */}
      <div
        className="directory-hero"
        style={{
          padding: '28px 24px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(13, 18, 29, 0.95) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-blue-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-electric)',
              }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Deori Taluka Business Directory
              </h1>
              <div style={{ fontSize: '0.82rem', color: 'var(--brand-electric)', fontWeight: 600 }}>
                स्थानिक व्यवसाय आणि व्यापार निर्देशिका
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '640px' }}>
            Discover registered enterprises, retail shops, agro-dealers, and local services across Deori Taluka. Read genuine verification credentials and branch contacts directly.
          </p>
        </div>

        {/* Claim / Manage Business Button */}
        <button
          onClick={() => {
            if (!user) {
              openAuthModal('login');
            } else {
              setAppMode('business');
            }
          }}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--brand-primary)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Store size={18} />
          <span>Manage My Business Profile</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, trade, or products..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          {/* Area Filter */}
          <select
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            style={{
              padding: '9px 12px',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          >
            <option value="all">All Deori Taluka Circles</option>
            {areasList?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Verification Status Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          >
            <option value="all">All Verification States</option>
            <option value="verified">Verified Businesses Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>

        {/* Categories Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                backgroundColor: selectedCategory === cat ? 'var(--brand-primary)' : 'var(--surface-subtle)',
                color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                border: `1px solid ${selectedCategory === cat ? 'var(--brand-primary)' : 'var(--surface-border)'}`,
                transition: 'all var(--transition-fast)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
          <p>Loading Deori Taluka Business Directory entries...</p>
        </div>
      ) : businesses.length === 0 ? (
        <div
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--surface-border)',
          }}
        >
          <Building2 size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No registered businesses found
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto' }}>
            No business profiles match the current filter criteria. Clear filters or add your shop to the Deori Taluka directory.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {businesses.map((biz) => (
            <div
              key={biz.id}
              onClick={() => handleOpenDetail(biz)}
              style={{
                backgroundColor: 'var(--surface-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--surface-border)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-electric)',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {biz.logo_url ? (
                      <img src={biz.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Building2 size={22} />
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {biz.name}
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{biz.category}</span>
                  </div>
                </div>

                {/* Verification Badge */}
                {biz.isVerified ? (
                  <span
                    title="Verified Deori Enterprise"
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--status-emerald-bg)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--status-emerald)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={13} />
                    Verified
                  </span>
                ) : (
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '0.7rem',
                      border: '1px solid var(--surface-border)',
                      flexShrink: 0,
                    }}
                  >
                    Unverified
                  </span>
                )}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {biz.description || 'Registered commercial enterprise in Deori Taluka.'}
              </p>

              {/* Locality & Branch Stats */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {biz.area_name && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={12} />
                    {biz.area_name}
                  </span>
                )}
                {biz.active_branches_count > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Layers size={12} />
                    {biz.active_branches_count} {biz.active_branches_count === 1 ? 'Branch' : 'Branches'}
                  </span>
                )}
                {biz.published_listings_count > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--brand-electric)' }}>
                    <Store size={12} />
                    {biz.published_listings_count} Active Listings
                  </span>
                )}
              </div>

              {/* Card Footer Action */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--surface-border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  {biz.is_phone_public && biz.phone ? `Call: ${biz.phone}` : 'Contact in details'}
                </span>

                <span style={{ color: 'var(--brand-electric)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <span>View Profile</span>
                  <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Business Detail Modal */}
      {selectedBusiness && (
        <div className="modal-backdrop" onClick={() => setSelectedBusiness(null)} style={{ zIndex: 1020 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '720px',
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
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-electric)',
                    overflow: 'hidden',
                  }}
                >
                  {selectedBusiness.logo_url ? (
                    <img src={selectedBusiness.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Building2 size={28} />
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {selectedBusiness.name}
                    </h2>
                    {selectedBusiness.isVerified ? (
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--status-emerald-bg)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: 'var(--status-emerald)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShieldCheck size={14} />
                        Verified Business
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--surface-subtle)',
                          color: 'var(--text-muted)',
                          fontSize: '0.72rem',
                        }}
                      >
                        Pending Verification
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--brand-electric)' }}>
                    {selectedBusiness.business_type} • {selectedBusiness.category}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedBusiness(null)}
                style={{ padding: '6px', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Address & Operating Hours */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Physical Location</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {selectedBusiness.address_line1 || 'Deori Town, Maharashtra'}
                </strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {selectedBusiness.area_name}
                </div>
              </div>

              {selectedBusiness.operating_hours && (
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Business Hours</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedBusiness.operating_hours}</strong>
                </div>
              )}
            </div>

            {/* Direct Contact Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {selectedBusiness.is_phone_public && selectedBusiness.phone && (
                <a
                  href={`tel:${selectedBusiness.phone}`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--status-emerald)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                  }}
                >
                  <Phone size={15} />
                  <span>Call {selectedBusiness.phone}</span>
                </a>
              )}

              {selectedBusiness.whatsapp_number && (
                <a
                  href={`https://wa.me/${selectedBusiness.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                  }}
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp</span>
                </a>
              )}

              {selectedBusiness.website && (
                <a
                  href={selectedBusiness.website.startsWith('http') ? selectedBusiness.website : `https://${selectedBusiness.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--brand-electric)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                  }}
                >
                  <Globe size={15} />
                  <span>Website</span>
                </a>
              )}
            </div>

            {/* Business Branches List */}
            {selectedBusiness.branches && selectedBusiness.branches.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Branch Locations ({selectedBusiness.branches.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {selectedBusiness.branches.map((br) => (
                    <div
                      key={br.id}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-border)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {br.branch_name} {br.is_headquarters ? '(HQ)' : ''}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{br.address}</div>
                      {br.phone && <div style={{ color: 'var(--text-muted)' }}>Phone: {br.phone}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Published Catalog Listings by this Business */}
            {selectedBusiness.listings && selectedBusiness.listings.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Current Offerings & Listings ({selectedBusiness.listings.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedBusiness.listings.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.module?.replace(/_/g, ' ')} • {item.category}
                        </div>
                      </div>
                      {item.price && (
                        <div style={{ fontWeight: 700, color: 'var(--brand-electric)', fontSize: '0.9rem' }}>
                          ₹{Number(item.price).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Honest Verification Disclaimer */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} style={{ color: 'var(--brand-electric)', flexShrink: 0 }} />
              <span>{selectedBusiness.verificationDisclaimer}</span>
            </div>

            {/* Report Profile Correction */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <button
                onClick={() => setIsReportOpen(true)}
                style={{
                  color: 'var(--status-crimson)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ShieldAlert size={14} />
                <span>Suggest Profile Correction / Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBusiness && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          targetType="business_profile"
          targetId={selectedBusiness.id}
          targetTitle={selectedBusiness.name}
        />
      )}
    </div>
  );
}
