import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Building2,
  Plus,
  Users,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  KeyRound,
  Trash2,
  Edit3,
  GitBranch,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react';
import BusinessListingsTab from './BusinessListingsTab';
import BusinessRequestsTab from './BusinessRequestsTab';

export default function BusinessWorkspace() {


  const {
    user,
    userBusinesses,
    activeBusiness,
    setActiveBusiness,
    refreshBusinesses,
    areasList,
    toggleAppMode,
  } = useApp();

  // Tabs: 'overview' | 'branches' | 'team' | 'transfer'
  const [activeTab, setActiveTab] = useState('overview');

  // Business Detail / Edit state
  const [businessData, setBusinessData] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    businessType: '',
    category: '',
    description: '',
    email: '',
    phone: '',
    addressLine1: '',
    talukaAreaId: '',
  });

  // Branches state
  const [branches, setBranches] = useState([]);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({
    branchName: '',
    talukaAreaId: '',
    address: '',
    phone: '',
    isHeadquarters: false,
  });

  // Team state
  const [teamMembers, setTeamMembers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    inviteeIdentifier: '',
    roleId: 'listings_staff',
  });

  // Create Business Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    businessType: 'Retail & Commerce',
    category: 'Marketplace',
    description: '',
    email: '',
    phone: '',
    addressLine1: '',
    talukaAreaId: 'deori-hq',
  });

  // Ownership Transfer state
  const [transferProposedId, setTransferProposedId] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Alerts
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load active business details
  useEffect(() => {
    if (activeBusiness?.id) {
      loadBusinessDetails(activeBusiness.id);
    }
  }, [activeBusiness?.id]);

  const loadBusinessDetails = async (businessId) => {
    setLoadingBusiness(true);
    setError(null);
    try {
      const [bizRes, branchesRes, teamRes, rolesRes, invitesRes] = await Promise.all([
        api.getBusiness(businessId),
        api.listBranches(businessId).catch(() => ({ branches: [] })),
        api.listTeamMembers(businessId).catch(() => ({ members: [] })),
        api.listRoles(businessId).catch(() => ({ roles: [] })),
        api.listBusinessInvitations(businessId).catch(() => ({ invitations: [] })),
      ]);

      const biz = bizRes.business;
      setBusinessData(biz);
      setBranches(branchesRes.branches || []);
      setTeamMembers(teamRes.members || []);
      setAvailableRoles(rolesRes.roles || []);
      setInvitations(invitesRes.invitations || []);

      setEditForm({
        name: biz.name || '',
        businessType: biz.business_type || '',
        category: biz.category || '',
        description: biz.description || '',
        email: biz.email || '',
        phone: biz.phone || '',
        addressLine1: biz.address_line1 || '',
        talukaAreaId: biz.taluka_area_id || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load business details.');
    } finally {
      setLoadingBusiness(false);
    }
  };

  // Create Business
  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.createBusiness(createForm);
      setSuccess(res.message);
      setShowCreateModal(false);
      await refreshBusinesses();
      setActiveBusiness(res.business);
      setCreateForm({
        name: '',
        businessType: 'Retail & Commerce',
        category: 'Marketplace',
        description: '',
        email: '',
        phone: '',
        addressLine1: '',
        talukaAreaId: 'deori-hq',
      });
    } catch (err) {
      setError(err.message || 'Failed to register business.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Business
  const handleUpdateBusiness = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await api.updateBusiness(businessData.id, editForm);
      setSuccess('Business profile updated successfully.');
      setIsEditing(false);
      loadBusinessDetails(businessData.id);
      refreshBusinesses();
    } catch (err) {
      setError(err.message || 'Failed to update business profile.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Branch
  const handleAddBranch = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await api.createBranch(businessData.id, newBranch);
      setSuccess('Branch location added.');
      setShowAddBranch(false);
      setNewBranch({
        branchName: '',
        talukaAreaId: '',
        address: '',
        phone: '',
        isHeadquarters: false,
      });
      loadBusinessDetails(businessData.id);
    } catch (err) {
      setError(err.message || 'Failed to add branch.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Branch
  const handleDeleteBranch = async (branchId) => {
    if (!window.confirm('Are you sure you want to remove this branch?')) return;
    try {
      await api.deleteBranch(businessData.id, branchId);
      setSuccess('Branch removed.');
      loadBusinessDetails(businessData.id);
    } catch (err) {
      setError(err.message || 'Failed to delete branch.');
    }
  };

  // Invite Team Member
  const handleInviteMember = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.inviteTeamMember(businessData.id, inviteForm);
      setSuccess(res.message);
      setShowInviteModal(false);
      setInviteForm({ inviteeIdentifier: '', roleId: 'listings_staff' });
      loadBusinessDetails(businessData.id);
    } catch (err) {
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Member Role
  const handleUpdateRole = async (memberId, roleId) => {
    try {
      await api.updateMemberRole(businessData.id, memberId, { roleId });
      setSuccess('Role updated successfully.');
      loadBusinessDetails(businessData.id);
    } catch (err) {
      setError(err.message || 'Failed to change role.');
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this person from your business team?')) return;
    try {
      await api.removeTeamMember(businessData.id, memberId);
      setSuccess('Team member removed.');
      loadBusinessDetails(businessData.id);
    } catch (err) {
      setError(err.message || 'Failed to remove member.');
    }
  };

  // Revoke Invitation
  const handleRevokeInvitation = async (invitationId) => {
    try {
      await api.revokeInvitation(businessData.id, invitationId);
      setSuccess('Invitation revoked.');
      loadBusinessDetails(businessData.id);
    } catch (err) {
      setError(err.message || 'Failed to revoke invitation.');
    }
  };

  // Initiate Ownership Transfer
  const handleTransferOwnership = async (e) => {
    e.preventDefault();
    if (!window.confirm('CRITICAL ACTION: Transferring ownership will make the selected team member the primary owner and demote you to Manager. Continue?')) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      // 1. Re-authenticate owner
      await api.reauth({ password: transferPassword });

      // 2. Initiate transfer
      const res = await api.initiateOwnershipTransfer(businessData.id, {
        proposedOwnerId: transferProposedId,
        notes: transferNotes,
      });

      setSuccess(res.message);
      setTransferPassword('');
      setTransferNotes('');
      loadBusinessDetails(businessData.id);
    } catch (err) {
      setError(err.message || 'Ownership transfer initiation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // If user has 0 businesses, show empty state
  if (userBusinesses.length === 0) {
    return (
      <div className="business-workspace-container" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: 'var(--surface-card)', borderRadius: '12px', padding: '40px 24px', textAlign: 'center', border: '1px solid var(--surface-border-subtle)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--brand-electric)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Building2 size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 800 }}>
            Register Your Business in Deori Taluka
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 24px', lineHeight: '1.5' }}>
            LocalHub X empowers shops, agricultural enterprises, rental providers, and local trades in Deori, Chichgarh, Soundad, and nearby circles.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
            >
              <Plus size={18} />
              Register New Business Profile
            </button>
            <button
              onClick={toggleAppMode}
              className="btn btn-secondary"
              style={{ padding: '12px 20px' }}
            >
              Switch to Personal Mode
            </button>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && renderCreateModal()}
      </div>
    );
  }

  function renderCreateModal() {
    return (
      <div className="modal-overlay" onClick={() => setShowCreateModal(false)} role="dialog" aria-modal="true">
        <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%' }}>
          <div className="modal-header">
            <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>Register New Business Profile</h2>
            <button onClick={() => setShowCreateModal(false)} className="modal-close-btn"><X size={18} /></button>
          </div>
          <form onSubmit={handleCreateBusiness} style={{ padding: '20px' }}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Business / Shop Name *</label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Deori Kisan Seva Kendra"
                style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Business Type *</label>
                <select
                  value={createForm.businessType}
                  onChange={(e) => setCreateForm({ ...createForm, businessType: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                >
                  <option value="Agriculture & Fertilizer">Agriculture & Fertilizer</option>
                  <option value="Retail & Grocery">Retail & Grocery</option>
                  <option value="Logistics & Transport">Logistics & Transport</option>
                  <option value="Local Services & Repairs">Local Services & Repairs</option>
                  <option value="Healthcare & Pharmacy">Healthcare & Pharmacy</option>
                  <option value="Hospitality & Rentals">Hospitality & Rentals</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Category *</label>
                <input
                  type="text"
                  required
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  placeholder="e.g. Krishi Bazaar"
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Locality within Deori Taluka (Non-GPS)</label>
              <select
                value={createForm.talukaAreaId}
                onChange={(e) => setCreateForm({ ...createForm, talukaAreaId: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                {areasList.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.marathi || a.taluka})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Street / Location Address</label>
              <input
                type="text"
                value={createForm.addressLine1}
                onChange={(e) => setCreateForm({ ...createForm, addressLine1: e.target.value })}
                placeholder="Shop No., Market Yard, Highway Road..."
                style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Business Contact Phone</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="07184-XXXXXX"
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Business Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="contact@shop.local"
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={actionLoading} className="btn btn-primary">
                {actionLoading ? 'Creating...' : 'Register Business'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const isOwner = businessData?.isOwner;
  const userRole = businessData?.userRole || 'member';

  return (
    <div className="business-workspace-container" style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Workspace Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', background: 'var(--surface-card)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--surface-border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--brand-electric)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Business Workspace • Mode: Active
            </div>
            {/* Business Dropdown Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <select
                value={activeBusiness?.id || ''}
                onChange={(e) => {
                  const b = userBusinesses.find(x => x.id === e.target.value);
                  if (b) setActiveBusiness(b);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {userBusinesses.map(b => (
                  <option key={b.id} value={b.id} style={{ background: '#ffffff', color: 'var(--text-primary)' }}>
                    {b.name} ({b.user_role === 'owner' ? 'Owner' : 'Team'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Add Another Business
          </button>
          <button
            onClick={toggleAppMode}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
          >
            Switch to Personal
          </button>
        </div>
      </div>

      {/* Honest Business Verification Safeguard Banner */}
      <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#fcd34d', fontSize: '0.8rem', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Status: Unverified Profile (Legitimate Verification Safeguard)</strong>
          <p style={{ margin: '4px 0 0', opacity: 0.9, lineHeight: '1.4' }}>
            Registering a business creates an administrative workspace for Deori Taluka. In compliance with security standards, <strong>no business is displayed as verified</strong> until official government registration credentials undergo administrative review in Phase 6.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="auth-alert error" style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '16px' }}>
          <ShieldAlert size={16} />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="auth-alert success" style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#6ee7b7', fontSize: '0.82rem', marginBottom: '16px' }}>
          <CheckCircle2 size={16} />
          <div>{success}</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border-subtle)', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Business Profile' },
          { id: 'listings', label: 'Listings Management' },
          { id: 'requests', label: 'Requests & Enquiries' },
          { id: 'branches', label: `Branches (${branches.length})` },
          { id: 'team', label: `Team & Permissions (${teamMembers.length})` },
          ...(isOwner ? [{ id: 'transfer', label: 'Ownership Transfer' }] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setError(null); setSuccess(null); }}
            style={{
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--brand-electric)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--brand-electric)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: REQUESTS & ENQUIRIES */}
      {activeTab === 'requests' && businessData && (
        <BusinessRequestsTab
          businessProfileId={businessData.id}
          businessRole={userRole}
        />
      )}

      {/* TAB: LISTINGS MANAGEMENT */}
      {activeTab === 'listings' && businessData && (
        <BusinessListingsTab
          businessId={businessData.id}
          isOwner={isOwner}
          userRole={userRole}
          permissions={businessData.permissions || []}
        />
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && businessData && (

        <div style={{ background: 'var(--surface-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 800 }}>{businessData.name}</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--brand-blue-bg)', color: 'var(--brand-primary)', fontWeight: 600 }}>
                  {businessData.business_type}
                </span>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--surface-subtle)', color: 'var(--text-muted)', border: '1px solid var(--surface-border-subtle)' }}>
                  Category: {businessData.category}
                </span>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--status-amber-bg)', color: 'var(--status-amber)', border: '1px solid var(--status-amber-border)', fontWeight: 600 }}>
                  Your Role: {userRole.toUpperCase()}
                </span>
              </div>
            </div>

            {!isEditing && (businessData.permissions?.includes('business.edit') || isOwner) && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Edit3 size={14} />
                Edit Profile
              </button>
            )}
          </div>

          {!isEditing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--surface-border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Locality / Area</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {businessData.area_name || 'Deori Taluka Center'}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--surface-border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Street Address</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {businessData.address_line1 || 'Not specified'}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--surface-border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Official Contact</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {businessData.phone || businessData.email || 'None registered'}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--surface-border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Primary Owner</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {businessData.owner_name}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateBusiness}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Business Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Type</label>
                  <input
                    type="text"
                    required
                    value={editForm.businessType}
                    onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Category</label>
                  <input
                    type="text"
                    required
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Address</label>
                <input
                  type="text"
                  value={editForm.addressLine1}
                  onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '8px 16px' }}>
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '8px 14px' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Module-level permissions granted to current member */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--surface-border-subtle)' }}>
            <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Your Active Permissions in this Workspace:
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {businessData.permissions?.map(p => (
                <span key={p} style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  ✓ {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRANCHES */}
      {activeTab === 'branches' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>Business Branch Locations</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scoped physical presences in Deori Taluka circles.</p>
            </div>
            {(businessData?.permissions?.includes('branches.manage') || isOwner) && (
              <button
                onClick={() => setShowAddBranch(!showAddBranch)}
                className="btn btn-primary"
                style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} />
                Add Branch
              </button>
            )}
          </div>

          {showAddBranch && (
            <form onSubmit={handleAddBranch} style={{ background: 'var(--surface-card)', padding: '16px', borderRadius: '10px', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '10px', fontWeight: 700 }}>Add Branch</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  required
                  placeholder="Branch Name (e.g. Chichgarh Depot)"
                  value={newBranch.branchName}
                  onChange={(e) => setNewBranch({ ...newBranch, branchName: e.target.value })}
                  style={{ padding: '8px 10px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                />
                <select
                  value={newBranch.talukaAreaId}
                  onChange={(e) => setNewBranch({ ...newBranch, talukaAreaId: e.target.value })}
                  style={{ padding: '8px 10px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                >
                  <option value="">Select Area Circle</option>
                  {areasList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                  {actionLoading ? 'Saving...' : 'Add Location'}
                </button>
                <button type="button" onClick={() => setShowAddBranch(false)} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {branches.map(b => (
              <div
                key={b.id}
                style={{
                  padding: '14px',
                  background: 'var(--surface-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--surface-border)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} style={{ color: 'var(--brand-primary)' }} />
                    {b.branch_name}
                    {b.is_headquarters && (
                      <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--brand-blue-bg)', color: 'var(--brand-primary)', border: '1px solid #bfdbfe', fontWeight: 700 }}>
                        Headquarters
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {b.address || 'Address not listed'} • Locality: {b.area_name || 'Deori'}
                  </div>
                </div>

                {!b.is_headquarters && (businessData?.permissions?.includes('branches.manage') || isOwner) && (
                  <button
                    onClick={() => handleDeleteBranch(b.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TEAM & ROLES */}
      {activeTab === 'team' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>Team Members & Scoped Roles</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Granular permissions: Manager, Listings Staff, Enquiry Handler. Members only access this profile.
              </p>
            </div>
            {(businessData?.permissions?.includes('team.invite') || isOwner) && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="btn btn-primary"
                style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <UserPlus size={14} />
                Invite Team Member
              </button>
            )}
          </div>

          {/* Members list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {teamMembers.map(m => (
              <div
                key={m.membership_id}
                style={{
                  padding: '14px',
                  background: 'var(--surface-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--surface-border)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {m.full_name} {m.is_owner ? ' (Owner)' : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {m.email || m.phone || 'Citizen ID: ' + m.user_id.slice(0, 8)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {m.is_owner ? (
                    <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'var(--status-amber-bg)', color: 'var(--status-amber)', border: '1px solid var(--status-amber-border)', fontWeight: 700 }}>
                      Owner
                    </span>
                  ) : (businessData?.permissions?.includes('team.manage_roles') || isOwner) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        value={m.role_id}
                        onChange={(e) => handleUpdateRole(m.membership_id, e.target.value)}
                        style={{ padding: '4px 8px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.75rem' }}
                      >
                        {availableRoles.filter(r => r.id !== 'owner').map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveMember(m.membership_id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 600 }}>{m.role_name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pending Invitations list */}
          {invitations.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Pending Invitations</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invitations.map(inv => (
                  <div key={inv.id} style={{ padding: '10px 14px', background: 'var(--surface-subtle)', border: '1px solid var(--surface-border-subtle)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{inv.invitee_identifier}</strong> — Role: {inv.role_name}
                    </div>
                    {(businessData?.permissions?.includes('team.invite') || isOwner) && (
                      <button
                        onClick={() => handleRevokeInvitation(inv.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite Modal */}
          {showInviteModal && (
            <div className="modal-overlay" onClick={() => setShowInviteModal(false)} role="dialog" aria-modal="true">
              <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '100%' }}>
                <div className="modal-header">
                  <h3 className="modal-title" style={{ fontSize: '1.05rem' }}>Invite Business Team Member</h3>
                  <button onClick={() => setShowInviteModal(false)} className="modal-close-btn"><X size={18} /></button>
                </div>
                <form onSubmit={handleInviteMember} style={{ padding: '20px' }}>
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Member's Email or Phone Number</label>
                    <input
                      type="text"
                      required
                      value={inviteForm.inviteeIdentifier}
                      onChange={(e) => setInviteForm({ ...inviteForm, inviteeIdentifier: e.target.value })}
                      placeholder="phone or email"
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Assign Role Template</label>
                    <select
                      value={inviteForm.roleId}
                      onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    >
                      <option value="manager">Manager (Info, Branches, Team, Enquiries)</option>
                      <option value="listings_staff">Listings Staff (Catalog & Listings)</option>
                      <option value="enquiry_handler">Enquiry Handler (Customer Response)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn-secondary">Cancel</button>
                    <button type="submit" disabled={actionLoading} className="btn btn-primary">
                      {actionLoading ? 'Dispatching...' : 'Send Invitation'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CONTROLLED OWNERSHIP TRANSFER (OWNER ONLY) */}
      {activeTab === 'transfer' && isOwner && (
        <div style={{ background: 'var(--surface-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--status-crimson)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <KeyRound size={20} />
            Controlled Business Ownership Transfer
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
            Transferring ownership of <strong>{businessData.name}</strong> will transfer complete enterprise authority. This action requires re-authentication, explicit acceptance by the recipient, and leaves an immutable audit trail.
          </p>

          <form onSubmit={handleTransferOwnership} style={{ maxWidth: '500px' }}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Select Proposed New Owner (Must be an active team member) *
              </label>
              <select
                required
                value={transferProposedId}
                onChange={(e) => setTransferProposedId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                <option value="">Select team member...</option>
                {teamMembers.filter(m => !m.is_owner).map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name} ({m.email || m.phone || m.user_id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Owner Re-Authentication Password *
              </label>
              <input
                type="password"
                required
                value={transferPassword}
                onChange={(e) => setTransferPassword(e.target.value)}
                placeholder="Enter your account password to confirm identity"
                style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Transfer Documentation / Handover Notes
              </label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="e.g. Enterprise sale / partner succession"
                style={{ width: '100%', padding: '9px 12px', background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading || !transferProposedId || !transferPassword}
              className="btn btn-primary"
              style={{ background: '#ef4444', borderColor: '#ef4444', padding: '10px 18px', fontSize: '0.82rem' }}
            >
              {actionLoading ? 'Verifying & Initiating...' : 'Initiate Controlled Ownership Transfer'}
            </button>
          </form>
        </div>
      )}

      {showCreateModal && renderCreateModal()}
    </div>
  );
}
