import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import AdminPermissionDenied from './AdminPermissionDenied';
import AdminOverviewTab from './AdminOverviewTab';
import AdminModerationTab from './AdminModerationTab';
import AdminVerificationsTab from './AdminVerificationsTab';
import AdminReportsTab from './AdminReportsTab';
import AdminRestrictionsTab from './AdminRestrictionsTab';
import AdminAuditTab from './AdminAuditTab';
import AdminRolesTab from './AdminRolesTab';

import {
  LayoutDashboard,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Scale,
  FileText,
  Users,
  RefreshCw,
  Shield,
} from 'lucide-react';

const STAFF_ROLES = ['editor', 'moderator', 'verifier', 'admin', 'super_admin'];

export default function AdminPanel() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'moderation' | 'verifications' | 'reports' | 'restrictions' | 'audit' | 'roles'
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const isStaff = user && STAFF_ROLES.includes(user.role);
  const isSuperOrAdmin = user && ['admin', 'super_admin'].includes(user.role);

  const fetchSummary = useCallback(async () => {
    if (!isStaff) return;
    setLoadingSummary(true);
    try {
      const res = await api.getAdminSummary();
      setSummary(res);
    } catch (err) {
      console.warn('[AdminPanel] Failed to fetch summary:', err.message);
    } finally {
      setLoadingSummary(false);
    }
  }, [isStaff]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Authorization Guard (Rule H)
  if (!isStaff) {
    return <AdminPermissionDenied />;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'moderation', label: 'Moderation Queue', icon: Layers, badge: summary?.counts?.pendingReviews },
    { id: 'verifications', label: 'Verifications', icon: ShieldCheck, badge: summary?.counts?.verificationRequests },
    { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: summary?.counts?.activeReports, urgent: summary?.counts?.urgentCorrections > 0 },
    { id: 'restrictions', label: 'Restrictions & Appeals', icon: Scale, badge: summary?.counts?.pendingAppeals },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    ...(isSuperOrAdmin ? [{ id: 'roles', label: 'Staff Roles & RBAC', icon: Users }] : []),
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Header */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--brand-blue-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-electric)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Shield size={26} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                LocalHub X Administrative Desk
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--brand-electric)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                {user.role?.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Deori Taluka, Gondia District • Content Moderation, Credential Verification & Resolution Governance
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchSummary}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
            title="Refresh database counts"
          >
            <RefreshCw size={14} className={loadingSummary ? 'spin' : ''} />
            <span>Refresh Counts</span>
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          borderBottom: '1px solid var(--surface-border)',
          paddingBottom: '8px',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--surface-card)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--brand-electric)' : 'transparent'}`,
                color: isActive ? 'var(--brand-electric)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: tab.urgent ? 'var(--status-crimson)' : 'rgba(56, 189, 248, 0.2)',
                    color: tab.urgent ? '#fff' : 'var(--brand-electric)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && (
          <AdminOverviewTab
            summary={summary}
            loading={loadingSummary}
            onSelectTab={(tabId) => setActiveTab(tabId)}
          />
        )}

        {activeTab === 'moderation' && (
          <AdminModerationTab onActionTaken={fetchSummary} />
        )}

        {activeTab === 'verifications' && (
          <AdminVerificationsTab onActionTaken={fetchSummary} />
        )}

        {activeTab === 'reports' && (
          <AdminReportsTab onActionTaken={fetchSummary} />
        )}

        {activeTab === 'restrictions' && (
          <AdminRestrictionsTab onActionTaken={fetchSummary} />
        )}

        {activeTab === 'audit' && (
          <AdminAuditTab />
        )}

        {activeTab === 'roles' && isSuperOrAdmin && (
          <AdminRolesTab onActionTaken={fetchSummary} />
        )}
      </div>
    </div>
  );
}
