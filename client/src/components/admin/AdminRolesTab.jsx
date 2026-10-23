import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Shield,
  Key,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Lock,
} from 'lucide-react';

const ROLES = [
  { value: 'citizen', label: 'Citizen (Standard User)' },
  { value: 'editor', label: 'Editor (Civic News, Events & Notices)' },
  { value: 'moderator', label: 'Moderator (Content & Reports Review)' },
  { value: 'verifier', label: 'Verification Reviewer (Business & Trade Badges)' },
  { value: 'admin', label: 'Administrator (All Operational Queues)' },
  { value: 'super_admin', label: 'Super Administrator (Full System Governance)' },
];

export default function AdminRolesTab({ onActionTaken }) {
  const { user } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Role Modal
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('citizen');
  const [submittingRole, setSubmittingRole] = useState(false);
  const [roleError, setRoleError] = useState(null);

  // Granular Permissions Modal
  const [managingPermsUser, setManagingPermsUser] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [userExplicitPerms, setUserExplicitPerms] = useState([]);
  const [userRolePerms, setUserRolePerms] = useState([]);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAdminUsers({ limit: 50 });
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message || 'Failed to list users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openRoleModal = (u) => {
    if (u.id === user.id) {
      alert('Security policy prevents modifying your own administrative role (anti-self-escalation guard).');
      return;
    }
    setEditingUser(u);
    setNewRole(u.role || 'citizen');
    setRoleError(null);
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmittingRole(true);
    setRoleError(null);

    try {
      await api.updateAdminUserRole(editingUser.id, { role: newRole });
      setEditingUser(null);
      fetchUsers();
      if (onActionTaken) onActionTaken();
    } catch (err) {
      setRoleError(err.message || 'Failed to update user role.');
    } finally {
      setSubmittingRole(false);
    }
  };

  const openPermsModal = async (u) => {
    setManagingPermsUser(u);
    setLoadingPerms(true);

    try {
      const [catalogRes, userPermsRes] = await Promise.all([
        api.getAdminPermissions(),
        api.getAdminUserPermissions(u.id),
      ]);

      setAllPermissions(catalogRes.permissions || []);
      setUserRolePerms((userPermsRes.rolePermissions || []).map((p) => p.id));
      const explicit = (userPermsRes.explicitPermissions || []).map((p) => p.id);
      setUserExplicitPerms(explicit);
      setSelectedPerms(explicit);
    } catch (err) {
      alert(`Error loading permissions: ${err.message}`);
      setManagingPermsUser(null);
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!managingPermsUser) return;
    setSavingPerms(true);
    try {
      await api.updateAdminUserPermissions(managingPermsUser.id, { permissions: selectedPerms });
      setManagingPermsUser(null);
      fetchUsers();
      if (onActionTaken) onActionTaken();
    } catch (err) {
      alert(`Failed to save permissions: ${err.message}`);
    } finally {
      setSavingPerms(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Security Architecture & MFA Gap Disclosure Notice (Rule A) */}
      <div
        style={{
          background: 'var(--surface-subtle)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          gap: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <Lock size={18} style={{ color: 'var(--brand-electric)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Privileged Governance & Authentication Architecture:</strong>
          <br />
          Administrative roles enforce strict separation of duties, least privilege, and anti-self-escalation barriers.
          <br />
          <em style={{ color: 'var(--status-amber)' }}>
            MFA Architecture Note: Hardware/TOTP multi-factor authentication is not yet supported in this iteration. Sensitive administrative actions require recent session re-authentication (15-minute validity) backed by single-use challenge verification.
          </em>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'var(--status-crimson-bg)', color: '#f87171', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Staff Accounts List */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Administrative Staff & Citizen Accounts
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Total Registered: {users.length}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <span>Loading user directory...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {users.map((u) => {
              const isCurrentUser = u.id === user?.id;
              const isStaff = u.role && u.role !== 'citizen';

              return (
                <div
                  key={u.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--surface-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    background: isCurrentUser ? 'rgba(56, 189, 248, 0.04)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {u.full_name}
                      </span>
                      {isCurrentUser && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--brand-electric)', background: 'var(--brand-blue-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                          You
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: isStaff ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface-subtle)',
                          color: isStaff ? 'var(--brand-electric)' : 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {u.role || 'citizen'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', gap: '14px' }}>
                      <span>Email: {u.email || 'N/A'}</span>
                      <span>Phone: {u.phone || 'N/A'}</span>
                      <span>Status: {u.status}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openPermsModal(u)}
                      disabled={isCurrentUser}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.76rem', cursor: isCurrentUser ? 'not-allowed' : 'pointer' }}
                    >
                      Permissions
                    </button>

                    <button
                      onClick={() => openRoleModal(u)}
                      disabled={isCurrentUser}
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.76rem', cursor: isCurrentUser ? 'not-allowed' : 'pointer' }}
                    >
                      Change Role
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              position: 'relative',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Modify System Role: {editingUser.full_name}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Assigning an administrative role grants access to moderation, verification, or governance capabilities.
            </p>

            <form onSubmit={handleUpdateRole}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Select New Role:
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {roleError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '8px', background: 'var(--status-crimson-bg)', borderRadius: '6px', marginBottom: '12px' }}>
                  {roleError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRole}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', cursor: submittingRole ? 'not-allowed' : 'pointer' }}
                >
                  {submittingRole ? 'Saving...' : 'Confirm Role Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Granular Permissions Modal */}
      {managingPermsUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              position: 'relative',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Granular Permissions: {managingPermsUser.full_name}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Role: <strong>{managingPermsUser.role}</strong>. Checked permissions are explicitly granted to this account under least-privilege principles.
            </p>

            {loadingPerms ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 8px' }} />
                <span>Loading permission matrix...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {allPermissions.map((p) => {
                  const isRoleGranted = userRolePerms.includes(p.id);
                  const isChecked = selectedPerms.includes(p.id);

                  return (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-border-subtle)',
                        cursor: isRoleGranted ? 'default' : 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.description}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isRoleGranted && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--status-emerald)', background: 'var(--status-emerald-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                            Role Default
                          </span>
                        )}
                        <input
                          type="checkbox"
                          checked={isChecked || isRoleGranted}
                          disabled={isRoleGranted}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPerms([...selectedPerms, p.id]);
                            } else {
                              setSelectedPerms(selectedPerms.filter((id) => id !== p.id));
                            }
                          }}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setManagingPermsUser(null)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={savingPerms || loadingPerms}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.82rem', cursor: savingPerms ? 'not-allowed' : 'pointer' }}
              >
                {savingPerms ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
