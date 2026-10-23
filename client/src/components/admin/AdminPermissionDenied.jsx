import React from 'react';
import { ShieldX, Home, LogIn } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function AdminPermissionDenied() {
  const { user, openAuthModal, navigateToHome } = useApp();

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '60px auto',
        padding: '40px 32px',
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-xl)',
        textAlign: 'center',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 20px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--status-crimson)',
        }}
      >
        <ShieldX size={32} />
      </div>

      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
        Administrative Access Restricted
      </h2>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
        {user ? (
          <>
            Your current account (<strong>{user.fullName}</strong>, role:{' '}
            <span style={{ color: 'var(--brand-electric)', textTransform: 'uppercase', fontWeight: 700 }}>
              {user.role || 'citizen'}
            </span>
            ) does not possess authorized staff privileges for the LocalHub X Administration Desk.
          </>
        ) : (
          'Authentication with an authorized administrative staff account (Super Admin, Admin, Moderator, Verifier, or Editor) is required to access this panel.'
        )}
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={navigateToHome}
          className="btn-secondary"
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <Home size={16} />
          <span>Return to Homepage</span>
        </button>

        {!user && (
          <button
            onClick={() => openAuthModal('login')}
            className="btn-primary"
            style={{
              padding: '10px 22px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <LogIn size={16} />
            <span>Sign In to Staff Account</span>
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid var(--surface-border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        Taluka Administrative Governance • Least Privilege RBAC Enforced • Deori Taluka, Maharashtra
      </div>
    </div>
  );
}
