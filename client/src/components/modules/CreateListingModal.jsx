import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Building2,
  User,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

const RENTAL_AMENITIES_OPTIONS = [
  '24x7 Water Supply',
  'Attached Bathroom',
  'Separate Electricity Meter',
  'Two-Wheeler Parking',
  'Car Parking',
  'CCTV Security',
  'Power Backup / Inverter',
  'Ceiling Fan & Lights',
  'Main Road Facing (NH-53)',
  'Commercial Shutter',
];

export default function CreateListingModal({
  isOpen,
  onClose,
  defaultModule = 'jobs',
  onListingCreated,
}) {
  const { user, userBusinesses, areasList, openAuthModal } = useApp();

  const [module, setModule] = useState(defaultModule);
  const [providerType, setProviderType] = useState('business');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branches, setBranches] = useState([]);

  // Shared Core Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [talukaAreaId, setTalukaAreaId] = useState('deori-hq');
  const [price, setPrice] = useState('');
  const [pricePeriod, setPricePeriod] = useState('month');
  const [isPriceNegotiable, setIsPriceNegotiable] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState('available');

  // Contact Preferences
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isContactHidden, setIsContactHidden] = useState(false);

  // Photos
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Jobs Module Fields
  const [jobType, setJobType] = useState('Full-time');
  const [qualifications, setQualifications] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('Fresher Welcome');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [vacanciesCount, setVacanciesCount] = useState(1);
  const [applicationMethod, setApplicationMethod] = useState('direct_call');
  const [howToApply, setHowToApply] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Rentals Module Fields
  const [propertyType, setPropertyType] = useState('room');
  const [depositAmount, setDepositAmount] = useState('');
  const [furnishingStatus, setFurnishingStatus] = useState('unfurnished');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [rentalAddress, setRentalAddress] = useState('');

  // Marketplace Module Fields (Strictly New Products Only)
  const [isConditionNew, setIsConditionNew] = useState(true);
  const [warrantyInfo, setWarrantyInfo] = useState('Shop Warranty');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');

  // Krishi Module Fields
  const [krishiType, setKrishiType] = useState('product'); // 'product' | 'equipment'
  const [cropName, setCropName] = useState('');
  const [cropQuantity, setCropQuantity] = useState('');
  const [cropUnit, setCropUnit] = useState('Quintal');
  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentType, setEquipmentType] = useState('Tractor');
  const [listingMode, setListingMode] = useState('rental'); // 'sale' | 'rental'
  const [rentalRateUnit, setRentalRateUnit] = useState('per_hour');
  const [rentalTerms, setRentalTerms] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');

  // Services Module Fields
  const [serviceMode, setServiceMode] = useState('both');
  const [pricingType, setPricingType] = useState('quote_on_inspection');
  const [serviceHours, setServiceHours] = useState('Mon - Sat 9:00 AM - 7:00 PM');
  const [experienceYears, setExperienceYears] = useState('3');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  // Sync default module when modal opens
  useEffect(() => {
    if (defaultModule) {
      setModule(defaultModule);
      if (defaultModule === 'krishi-bazaar' || defaultModule === 'krishi') {
        setModule('krishi_products');
      } else if (defaultModule === 'rentals-pg' || defaultModule === 'rentals') {
        setModule('rentals');
      } else if (defaultModule === 'jobs-hub' || defaultModule === 'jobs') {
        setModule('jobs');
      } else if (defaultModule === 'local-services' || defaultModule === 'services') {
        setModule('services');
      } else if (defaultModule === 'marketplace') {
        setModule('marketplace');
      }
    }
  }, [defaultModule, isOpen]);

  // Set default business
  useEffect(() => {
    if (userBusinesses && userBusinesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(userBusinesses[0].id);
    }
  }, [userBusinesses, selectedBusinessId]);

  // Fetch branches when selected business changes
  useEffect(() => {
    if (selectedBusinessId) {
      api.listBranches(selectedBusinessId)
        .then((res) => {
          setBranches(res.branches || []);
        })
        .catch(() => setBranches([]));
    } else {
      setBranches([]);
    }
  }, [selectedBusinessId]);

  // Pre-fill contact if available from user
  useEffect(() => {
    if (user) {
      if (!contactPhone && user.phone) setContactPhone(user.phone);
      if (!contactEmail && user.email) setContactEmail(user.email);
    }
  }, [user]);

  if (!isOpen) return null;

  const currentBusiness = userBusinesses?.find((b) => b.id === selectedBusinessId);
  const isBusinessVerified = currentBusiness?.verification_status === 'verified';

  // Handle Image Upload
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMessage(null);

    const formData = new FormData();
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      formData.append('images', files[i]);
    }

    try {
      const res = await api.uploadImages(formData);
      if (res.urls) {
        setUploadedPhotos((prev) => [...prev, ...res.urls].slice(0, 5));
      }
    } catch (err) {
      setErrorMessage('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = (index) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage('Please provide a descriptive title (at least 3 characters).');
      return;
    }

    if (!category.trim()) {
      setErrorMessage('Please select or specify a category.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage('Please provide a detailed description (at least 10 characters).');
      return;
    }

    // Marketplace rule: Strictly brand new products
    if (module === 'marketplace' && !isConditionNew) {
      setErrorMessage('Marketplace only permits brand-new retail products. Second-hand items are prohibited in Phase 3.');
      return;
    }

    // Business listing requires business profile
    if (providerType === 'business' && !selectedBusinessId) {
      setErrorMessage('Please select a business profile to publish under, or register a business first.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        module: module === 'krishi_products' && krishiType === 'equipment' ? 'krishi_equipment' : module,
        providerType,
        businessProfileId: providerType === 'business' ? selectedBusinessId : null,
        businessBranchId: providerType === 'business' && selectedBranchId ? selectedBranchId : null,
        talukaAreaId,
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        price: price ? Number(price) : null,
        pricePeriod: pricePeriod || null,
        isPriceNegotiable,
        availabilityStatus,
        contactPhone: contactPhone || null,
        contactWhatsapp: contactWhatsapp || null,
        contactEmail: contactEmail || null,
        isContactHidden,
        photos: uploadedPhotos,
      };

      // Module specific additions
      if (module === 'jobs') {
        payload.jobType = jobType;
        payload.qualifications = qualifications || null;
        payload.experienceRequired = experienceRequired || null;
        payload.salaryMin = salaryMin ? Number(salaryMin) : null;
        payload.salaryMax = salaryMax ? Number(salaryMax) : null;
        payload.salaryPeriod = pricePeriod || 'monthly';
        payload.isSalaryNegotiable = isPriceNegotiable;
        payload.vacanciesCount = vacanciesCount || 1;
        payload.applicationMethod = applicationMethod;
        payload.howToApply = howToApply || null;
        payload.expiresAt = expiresAt || null;
      } else if (module === 'rentals') {
        payload.propertyType = propertyType;
        payload.depositAmount = depositAmount ? Number(depositAmount) : 0;
        payload.furnishingStatus = furnishingStatus;
        payload.amenities = selectedAmenities;
        payload.addressDetails = rentalAddress || null;
      } else if (module === 'marketplace') {
        payload.isConditionNew = true;
        payload.warrantyInfo = warrantyInfo || null;
        payload.brand = brand || null;
        payload.sku = sku || null;
      } else if (module === 'krishi_products' || module === 'krishi_equipment') {
        payload.krishiType = krishiType;
        if (krishiType === 'product') {
          payload.cropName = cropName || title;
          payload.quantity = cropQuantity ? Number(cropQuantity) : null;
          payload.unit = cropUnit || 'Quintal';
        } else {
          payload.equipmentName = equipmentName || title;
          payload.equipmentType = equipmentType || category;
          payload.listingMode = listingMode;
          payload.rentalRateUnit = rentalRateUnit;
          payload.rentalTerms = rentalTerms || null;
          payload.securityDeposit = securityDeposit ? Number(securityDeposit) : null;
        }
      } else if (module === 'services') {
        payload.serviceMode = serviceMode;
        payload.pricingType = pricingType;
        payload.serviceHours = serviceHours || null;
        payload.experienceYears = experienceYears ? parseInt(experienceYears, 10) : null;
      }

      const res = await api.createListing(payload);

      setSuccessNotice({
        message: res.message,
        notice: res.publicationNotice,
        isPublished: res.isPublished,
      });

      if (onListingCreated) {
        onListingCreated(res);
      }

      setTimeout(() => {
        setSuccessNotice(null);
        onClose();
      }, 2500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
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
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Create New Listing
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Publish verified commerce, housing, employment, or services across Deori Taluka
            </p>
          </div>
          <button onClick={onClose} style={{ padding: '6px', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {successNotice ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: successNotice.isPublished ? 'var(--status-emerald-bg)' : 'var(--status-amber-bg)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${successNotice.isPublished ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              color: successNotice.isPublished ? 'var(--status-emerald)' : 'var(--status-amber)',
            }}
          >
            <CheckCircle2 size={36} style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              {successNotice.isPublished ? 'Listing Published!' : 'Submitted for Moderation Review'}
            </h4>
            <p style={{ fontSize: '0.88rem' }}>{successNotice.notice}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--status-crimson-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--status-crimson)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Module Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Listing Module *
              </label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="jobs">Jobs Hub (Local Employment & Labor)</option>
                <option value="rentals">Rentals & PG (Rooms, Flats, Houses, Shops)</option>
                <option value="marketplace">Marketplace (New Retail Goods Only)</option>
                <option value="krishi_products">Krishi Bazaar (Agri Produce & Equipment)</option>
                <option value="services">Local Services (Technicians & Skilled Providers)</option>
              </select>
            </div>

            {/* 2. Provider Type & Business Association */}
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border)',
              }}
            >
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Posting Identity *
              </label>

              <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="providerType"
                    value="business"
                    checked={providerType === 'business'}
                    onChange={() => setProviderType('business')}
                  />
                  <span>Under Business Profile</span>
                </label>

                {(module === 'services' || module === 'rentals') && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="providerType"
                      value="individual"
                      checked={providerType === 'individual'}
                      onChange={() => setProviderType('individual')}
                    />
                    <span>As Individual Provider / Landlord</span>
                  </label>
                )}
              </div>

              {providerType === 'business' ? (
                <>
                  {userBusinesses && userBusinesses.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          Select Business Profile *
                        </label>
                        <select
                          value={selectedBusinessId}
                          onChange={(e) => setSelectedBusinessId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            backgroundColor: 'var(--surface-card)',
                            border: '1px solid var(--surface-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {userBusinesses.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.verification_status})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          Select Branch (Optional)
                        </label>
                        <select
                          value={selectedBranchId}
                          onChange={(e) => setSelectedBranchId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            backgroundColor: 'var(--surface-card)',
                            border: '1px solid var(--surface-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <option value="">Headquarters / Primary Branch</option>
                          {branches.map((br) => (
                            <option key={br.id} value={br.id}>
                              {br.branch_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: 'var(--status-amber)' }}>
                      You have not created a business profile yet. Please go to Business Workspace to set up your business first.
                    </div>
                  )}

                  {/* Verification Policy Banner */}
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isBusinessVerified ? 'var(--status-emerald-bg)' : 'var(--status-amber-bg)',
                      border: `1px solid ${isBusinessVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: isBusinessVerified ? 'var(--status-emerald)' : 'var(--status-amber)',
                    }}
                  >
                    {isBusinessVerified ? (
                      <>
                        <ShieldCheck size={16} />
                        <span>Verified Business: Eligible for direct immediate publication.</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={16} />
                        <span>Unverified Business: Listing will be submitted as Pending Review for moderation before public display.</span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={14} />
                  <span>Posting under personal account. Individual listings require moderation review.</span>
                </div>
              )}
            </div>

            {/* 3. Title, Category & Taluka Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Listing Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    module === 'jobs'
                      ? 'e.g. Accountant for Hardware Store'
                      : module === 'rentals'
                      ? 'e.g. 1BHK Flat near Deori Bus Stand'
                      : module === 'marketplace'
                      ? 'e.g. Submersible Solar Pump 5HP'
                      : module === 'krishi_products'
                      ? 'e.g. Certified Shriram Paddy Seed'
                      : 'e.g. Certified Electrician & House Wiring'
                  }
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Category *
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Retail, Retail Shop, Paddy, Wiring"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            {/* Taluka Locality & Commercial Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Taluka Area *
                </label>
                <select
                  value={talukaAreaId}
                  onChange={(e) => setTalukaAreaId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  {areasList && areasList.length > 0 ? (
                    areasList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))
                  ) : (
                    <option value="deori-hq">Deori Town (HQ)</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {module === 'jobs' ? 'Monthly Salary (₹)' : module === 'rentals' ? 'Rent Amount (₹)' : 'Price (₹)'}
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 15000"
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isPriceNegotiable}
                    onChange={(e) => setIsPriceNegotiable(e.target.checked)}
                  />
                  <span>Negotiable</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Detailed Description *
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide accurate specifications, requirements, location landmarks, and working terms..."
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* 4. Dynamic Module-Specific Specifications */}

            {/* MODULE 1: JOBS */}
            {module === 'jobs' && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Job Requirements & Application Mode
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Job Type
                    </label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Daily Wage">Daily Wage</option>
                      <option value="Contract">Contract</option>
                      <option value="Apprenticeship">Apprenticeship</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Vacancies Count
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={vacanciesCount}
                      onChange={(e) => setVacanciesCount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Application Method
                    </label>
                    <select
                      value={applicationMethod}
                      onChange={(e) => setApplicationMethod(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value="direct_call">Direct Call</option>
                      <option value="walk_in">Walk-in Interview</option>
                      <option value="whatsapp">WhatsApp Message</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Qualifications
                    </label>
                    <input
                      type="text"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="e.g. 10th Pass, B.Com, ITI Electrician"
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Experience Required
                    </label>
                    <input
                      type="text"
                      value={experienceRequired}
                      onChange={(e) => setExperienceRequired(e.target.value)}
                      placeholder="e.g. Fresher, 1-2 years"
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 2: RENTALS & PG */}
            {module === 'rentals' && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Property Details & Amenities
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Property Type
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value="room">Single Room</option>
                      <option value="pg">Student / Working PG</option>
                      <option value="flat">Apartment / Flat</option>
                      <option value="house">Independent House</option>
                      <option value="shop">Commercial Retail Shop</option>
                      <option value="commercial_space">Office / Godown Space</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Security Deposit (₹)
                    </label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Furnishing Status
                    </label>
                    <select
                      value={furnishingStatus}
                      onChange={(e) => setFurnishingStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value="unfurnished">Unfurnished</option>
                      <option value="semi_furnished">Semi-Furnished</option>
                      <option value="fully_furnished">Fully-Furnished</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Amenities Available:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {RENTAL_AMENITIES_OPTIONS.map((am) => (
                      <label key={am} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedAmenities.includes(am)}
                          onChange={() => toggleAmenity(am)}
                        />
                        <span>{am}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 3: MARKETPLACE (STRICTLY NEW ONLY) */}
            {module === 'marketplace' && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Retail Product Information
                  </h4>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(37, 99, 235, 0.2)',
                      color: 'var(--brand-electric)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    New Products Only Policy
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Brand / Manufacturer
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Havells, Kirloskar, Samsung"
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Warranty Coverage
                    </label>
                    <input
                      type="text"
                      value={warrantyInfo}
                      onChange={(e) => setWarrantyInfo(e.target.value)}
                      placeholder="e.g. 1 Year Brand Warranty, 6 Months Shop"
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 4: KRISHI BAZAAR */}
            {(module === 'krishi_products' || module === 'krishi_equipment') && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="krishiSubtype"
                      value="product"
                      checked={krishiType === 'product'}
                      onChange={() => setKrishiType('product')}
                    />
                    <span>Crop / Harvest Produce</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="krishiSubtype"
                      value="equipment"
                      checked={krishiType === 'equipment'}
                      onChange={() => setKrishiType('equipment')}
                    />
                    <span>Farm Equipment & Machinery</span>
                  </label>
                </div>

                {krishiType === 'product' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Crop / Grain Variety
                      </label>
                      <input
                        type="text"
                        value={cropName}
                        onChange={(e) => setCropName(e.target.value)}
                        placeholder="e.g. 1010 Paddy, HMT Rice, Chana"
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'var(--surface-card)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Batch Quantity & Unit
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="number"
                          value={cropQuantity}
                          onChange={(e) => setCropQuantity(e.target.value)}
                          placeholder="e.g. 50"
                          style={{
                            width: '60%',
                            padding: '8px',
                            backgroundColor: 'var(--surface-card)',
                            border: '1px solid var(--surface-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                          }}
                        />
                        <select
                          value={cropUnit}
                          onChange={(e) => setCropUnit(e.target.value)}
                          style={{
                            width: '40%',
                            padding: '8px',
                            backgroundColor: 'var(--surface-card)',
                            border: '1px solid var(--surface-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <option value="Quintal">Quintal</option>
                          <option value="Kg">Kg</option>
                          <option value="Ton">Ton</option>
                          <option value="Bag">Bag</option>
                          <option value="Litre">Litre</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Equipment Type
                      </label>
                      <input
                        type="text"
                        value={equipmentType}
                        onChange={(e) => setEquipmentType(e.target.value)}
                        placeholder="e.g. Tractor 45HP, Harvester, Rotavator"
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'var(--surface-card)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Listing Mode
                      </label>
                      <select
                        value={listingMode}
                        onChange={(e) => setListingMode(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'var(--surface-card)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <option value="rental">For Rent / Hourly</option>
                        <option value="sale">Outright Sale</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Rate Unit
                      </label>
                      <select
                        value={rentalRateUnit}
                        onChange={(e) => setRentalRateUnit(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'var(--surface-card)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <option value="per_hour">Per Hour</option>
                        <option value="per_acre">Per Acre</option>
                        <option value="per_day">Per Day</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODULE 5: LOCAL SERVICES */}
            {module === 'services' && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--surface-border)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Service Mode
                  </label>
                  <select
                    value={serviceMode}
                    onChange={(e) => setServiceMode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="both">Both (Workshop & Customer Home)</option>
                    <option value="at_customer_location">At Customer Location</option>
                    <option value="at_provider_location">At Workshop / Shop Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Pricing Model
                  </label>
                  <select
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="quote_on_inspection">Quote on Inspection</option>
                    <option value="fixed">Fixed Rate</option>
                    <option value="starting_at">Starting At Base Rate</option>
                    <option value="hourly">Hourly Labor Charge</option>
                  </select>
                </div>
              </div>
            )}

            {/* 5. Photos Upload */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Photos (Up to 5 images, Max 5MB each)
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                {uploadedPhotos.map((url, i) => (
                  <div
                    key={i}
                    style={{
                      width: '80px',
                      height: '70px',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid var(--surface-border)',
                    }}
                  >
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'var(--status-crimson)',
                        borderRadius: 'var(--radius-full)',
                        padding: '3px',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {uploadedPhotos.length < 5 && (
                  <label
                    style={{
                      width: '80px',
                      height: '70px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--surface-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: uploadingImage ? 'not-allowed' : 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      gap: '4px',
                    }}
                  >
                    <Upload size={18} />
                    <span>{uploadingImage ? '...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      disabled={uploadingImage}
                      style={{ display: 'none' }}
                      multiple
                    />
                  </label>
                )}
              </div>
            </div>

            {/* 6. Contact & Privacy Settings */}
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--surface-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Contact & Inquiries Visibility
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. 9822000000"
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    placeholder="e.g. 9822000000"
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isContactHidden}
                  onChange={(e) => setIsContactHidden(e.target.checked)}
                />
                <span>Hide phone number from public visitors (direct contact will be masked)</span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.88rem',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '9px 24px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Submitting Listing...' : isBusinessVerified ? 'Publish Listing' : 'Submit for Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
