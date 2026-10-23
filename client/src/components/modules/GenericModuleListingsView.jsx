import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  MapPin,
  Filter,
  Plus,
  Briefcase,
  Home,
  ShoppingBag,
  Wheat,
  Wrench,
  Sparkles,
  ShieldCheck,
  Clock,
  AlertCircle,
  Tag,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import ModuleListingCard from './ModuleListingCard';
import ListingDetailModal from './ListingDetailModal';
import CreateListingModal from './CreateListingModal';
import ReportModal from './ReportModal';

export default function GenericModuleListingsView({
  moduleKey, // 'jobs' | 'rentals' | 'marketplace' | 'krishi_products' | 'services'
  title,
  marathiTitle,
  tagline,
  description,
  icon: IconComponent = Sparkles,
}) {
  const { user, areasList, openAuthModal } = useApp();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Module-specific active sub-filters
  const [propertyType, setPropertyType] = useState('');
  const [jobType, setJobType] = useState('');
  const [krishiSubtype, setKrishiSubtype] = useState('all'); // 'all' | 'product' | 'equipment'
  const [equipmentMode, setEquipmentMode] = useState('');
  const [serviceMode, setServiceMode] = useState('');

  // Modals
  const [selectedListing, setSelectedListing] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  // Fetch Listings from backend MySQL API
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        sort,
        page,
        limit: 20,
      };

      // Set module
      if (moduleKey === 'krishi') {
        if (krishiSubtype === 'equipment') {
          params.module = 'krishi_equipment';
        } else if (krishiSubtype === 'product') {
          params.module = 'krishi_products';
        } else {
          // Both krishi products and equipment
          params.module = 'krishi_products';
        }
      } else {
        params.module = moduleKey;
      }

      if (search.trim()) params.search = search.trim();
      if (selectedAreaId !== 'all') params.areaId = selectedAreaId;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedAvailability !== 'all') params.availability = selectedAvailability;

      // Module-specific query params
      if (moduleKey === 'rentals' && propertyType) params.propertyType = propertyType;
      if (moduleKey === 'jobs' && jobType) params.jobType = jobType;
      if (moduleKey === 'krishi' && equipmentMode) params.equipmentMode = equipmentMode;
      if (moduleKey === 'services' && serviceMode) params.serviceMode = serviceMode;

      const res = await api.getListings(params);
      setListings(res.listings || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('[GenericModuleListingsView] Load failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [
    moduleKey,
    search,
    selectedAreaId,
    selectedCategory,
    selectedAvailability,
    sort,
    page,
    propertyType,
    jobType,
    krishiSubtype,
    equipmentMode,
    serviceMode,
  ]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleOpenDetail = (listing) => {
    setSelectedListing(listing);
    setIsDetailOpen(true);
  };

  const handleOpenReport = (listing) => {
    setReportTarget(listing);
  };

  const getPostButtonLabel = () => {
    switch (moduleKey) {
      case 'jobs':
        return 'Post a Job Opening';
      case 'rentals':
        return 'List Rental / PG Space';
      case 'marketplace':
        return 'List New Product';
      case 'krishi':
        return 'Post Agri / Equipment Listing';
      case 'services':
        return 'Offer Local Service';
      default:
        return 'Create Listing';
    }
  };

  // Predefined Categories per Module
  const getCategoryChips = () => {
    switch (moduleKey) {
      case 'jobs':
        return ['All', 'Retail & Shop Assistant', 'Accounts & Billing', 'Drivers & Transit', 'Farm Hands & Labor', 'Security & Housekeeping', 'Tailoring & Craft'];
      case 'rentals':
        return ['All', 'Single Room', 'Family Flat', 'Independent House', 'Student PG', 'Commercial Shop', 'Godown / Storage'];
      case 'marketplace':
        return ['All', 'Electronics & Mobile', 'Solar & Irrigation', 'Hardware & Tools', 'Cement & Steel', 'Apparel & Uniforms', 'Paints & Sanitary'];
      case 'krishi':
        return ['All', 'Paddy & Rice', 'Pulses & Chana', 'Organic Fertilizers', 'Pesticides & Sprayers', 'Tractors & Tillage', 'Harvesters'];
      case 'services':
        return ['All', 'Electrician', 'Plumber', 'Carpenter & Woodwork', 'Mechanic & Welder', 'Mason / Construction', 'Appliance Repair'];
      default:
        return ['All'];
    }
  };

  return (
    <div className="module-listings-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Module Hero Banner */}
      <div
        className="module-hero-banner"
        style={{
          padding: '24px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--brand-blue-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-electric)',
            }}
          >
            <IconComponent size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {title}
              </h1>
              <span style={{ fontSize: '0.85rem', color: 'var(--brand-electric)', fontWeight: 600 }}>
                {marathiTitle}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {tagline}
            </p>
          </div>
        </div>

        {/* Action Button: Post Listing */}
        <button
          onClick={() => {
            if (!user) {
              openAuthModal('login');
            } else {
              setIsCreateOpen(true);
            }
          }}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--brand-primary)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Plus size={16} />
          <span>{getPostButtonLabel()}</span>
        </button>
      </div>

      {/* Module Integrity Policy Notice */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(56, 189, 248, 0.04)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Sparkles size={15} style={{ color: 'var(--brand-electric)', flexShrink: 0 }} />
        <div>
          {moduleKey === 'marketplace' && (
            <span>
              <strong>Marketplace Integrity:</strong> LocalHub X strictly features brand-new retail merchandise from registered Deori Taluka shops. Second-hand products are prohibited in Phase 3.
            </span>
          )}
          {moduleKey === 'krishi' && (
            <span>
              <strong>Agricultural Transparency:</strong> Mandi APMC rates and crop condition declarations are provided directly by producers. Physical inspection is advised before transactions.
            </span>
          )}
          {moduleKey === 'rentals' && (
            <span>
              <strong>Tenancy Safeguard:</strong> Verification verifies user presence in Deori Taluka, not legal property title. Never pay advance rent without visiting the premises.
            </span>
          )}
          {moduleKey === 'jobs' && (
            <span>
              <strong>Direct Hiring:</strong> Zero intermediary commission fees. Genuine employers never charge application or training fees.
            </span>
          )}
          {moduleKey === 'services' && (
            <span>
              <strong>Technician Registry:</strong> Direct phone connection with local skilled providers across Deori Taluka. Confirm expected quotation before start of work.
            </span>
          )}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Top Filters Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search
              size={17}
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
              placeholder={`Search ${title.toLowerCase()}...`}
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

          {/* Sorting */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              padding: '9px 12px',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          {/* Module-Specific Secondary Filters */}
          {moduleKey === 'rentals' && (
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              style={{
                padding: '9px 12px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Property Types</option>
              <option value="room">Rooms</option>
              <option value="pg">PG Rooms</option>
              <option value="flat">Flats / Apartments</option>
              <option value="house">Houses</option>
              <option value="shop">Commercial Shops</option>
            </select>
          )}

          {moduleKey === 'jobs' && (
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              style={{
                padding: '9px 12px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Job Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Daily Wage">Daily Wage</option>
              <option value="Contract">Contract</option>
            </select>
          )}

          {moduleKey === 'krishi' && (
            <select
              value={krishiSubtype}
              onChange={(e) => setKrishiSubtype(e.target.value)}
              style={{
                padding: '9px 12px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="all">Produce & Machinery</option>
              <option value="product">Crops / Grains Only</option>
              <option value="equipment">Farm Equipment Only</option>
            </select>
          )}
        </div>

        {/* Category Chips Bar */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {getCategoryChips().map((cat) => (
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

      {/* Listings Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
          <p>Loading {title} listings from Deori Taluka database...</p>
        </div>
      ) : listings.length === 0 ? (
        <div
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--surface-border)',
          }}
        >
          <IconComponent size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No listings found
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px' }}>
            No published listings match your current filters in Deori Taluka. Be the first verified establishment to list in this category.
          </p>
          <button
            onClick={() => {
              if (!user) {
                openAuthModal('login');
              } else {
                setIsCreateOpen(true);
              }
            }}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {getPostButtonLabel()}
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '16px',
            }}
          >
            {listings.map((item) => (
              <ModuleListingCard
                key={item.id}
                listing={item}
                onSelect={handleOpenDetail}
                onReport={handleOpenReport}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                marginTop: '16px',
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.82rem',
                }}
              >
                Previous
              </button>

              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  color: page >= pagination.totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.82rem',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedListing(null);
          }}
        />
      )}

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultModule={moduleKey}
        onListingCreated={() => {
          fetchListings();
        }}
      />

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          targetType="listing"
          targetId={reportTarget.id}
          targetTitle={reportTarget.title}
        />
      )}
    </div>
  );
}
