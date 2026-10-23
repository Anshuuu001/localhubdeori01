import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Briefcase,
  Home,
  Wrench,
  Car,
  Package,
  X,
  Inbox,
  ArrowRight,
} from 'lucide-react';

export default function NotificationsPopover() {
  const { user, setCurrentView } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const res = await api.getNotifications({ limit: 15 });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.warn('[NotificationsPopover] Failed to fetch:', err.message);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds for background notifications
    const timer = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('[NotificationsPopover] Mark read failed:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('[NotificationsPopover] Mark all read failed:', err.message);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      api.markNotificationRead(notif.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    setIsOpen(false);
    setCurrentView('my-activity');
  };

  if (!user) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="header-btn"
        style={{ position: 'relative' }}
        title={`${unreadCount} unread in-app alerts`}
        aria-label="View notifications"
      >
        <Bell size={16} style={{ color: unreadCount > 0 ? 'var(--brand-electric)' : 'var(--text-secondary)' }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              minWidth: '16px',
              height: '16px',
              borderRadius: '8px',
              backgroundColor: 'var(--brand-electric)',
              color: '#0f172a',
              fontSize: '0.65rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '340px',
            maxHeight: '460px',
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--surface-bg-alt)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--brand-electric)', fontWeight: 600 }}>
                  ({unreadCount} new)
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flexGrow: 1, maxHeight: '360px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Inbox size={28} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>No Notifications</div>
                <div style={{ fontSize: '0.74rem', marginTop: '2px' }}>
                  Status updates for your applications and enquiries will appear here.
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--surface-border-subtle)',
                    backgroundColor: n.isRead ? 'transparent' : 'rgba(56, 189, 248, 0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-bg-alt)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = n.isRead ? 'transparent' : 'rgba(56, 189, 248, 0.04)'; }}
                >
                  {/* Status dot */}
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: n.isRead ? 'transparent' : 'var(--brand-electric)',
                      marginTop: '6px',
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: n.isRead ? 500 : 700, color: n.isRead ? 'var(--text-secondary)' : '#fff', marginBottom: '2px' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={(e) => handleMarkRead(n.id, e)}
                      title="Mark as read"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--surface-border)',
              textAlign: 'center',
              backgroundColor: 'var(--surface-bg-alt)',
            }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                setCurrentView('my-activity');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-electric)',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <span>View All in My Activity</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
