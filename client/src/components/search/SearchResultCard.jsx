import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Briefcase,
  Home,
  ShoppingBag,
  Wheat,
  Wrench,
  Building2,
  Calendar,
  Newspaper,
  ShieldAlert,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const MODULE_ICONS = {
  jobs: Briefcase,
  rentals: Home,
  marketplace: ShoppingBag,
  krishi: Wheat,
  services: Wrench,
  directory: Building2,
  events: Calendar,
  news: Newspaper,
  notices: Building2,
  emergency: ShieldAlert,
};

const MODULE_COLORS = {
  jobs: '#38bdf8',
  rentals: '#818cf8',
  marketplace: '#34d399',
  krishi: '#fbbf24',
  services: '#f472b6',
  directory: '#a78bfa',
  events: '#f97316',
  news: '#60a5fa',
  notices: '#e2e8f0',
  emergency: '#ef4444',
};

export default function SearchResultCard({ item, onOpenDetail }) {
  const { savedItemIds, toggleSaveItem, navigateToModule } = useApp();

  const isSaved = savedItemIds.has(`${item.entityType}:${item.id}`);
  const IconComponent = MODULE_ICONS[item.module] || Sparkles;
  const color = MODULE_COLORS[item.module] || 'var(--brand-electric)';

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    try {
      await toggleSaveItem(item.entityType, item.id, item.module);
    } catch (err) {
      // handled
    }
  };

  const handleCardClick = () => {
    if (onOpenDetail) {
      onOpenDetail(item);
    } else {
      // Navigate to respective module
      const moduleSlugMap = {
        jobs: 'jobs-hub',
        rentals: 'rentals-pg',
        marketplace: 'marketplace',
        krishi: 'krishi-bazaar',
        services: 'local-services',
        directory: 'business-directory',
        events: 'events-desk',
        news: 'taluka-news-feed',
        notices: 'taluka-news-feed',
        emergency: 'emergency-contacts',
      };
      navigateToModule(moduleSlugMap[item.module] || 'jobs-hub');
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className="search-result-card"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-xs)',
        transition: 'all 0.18s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#93c5fd';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--surface-border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
      }}
      aria-label={`${item.title} (${item.module})`}
    >
      <div>
        {/* Top Meta Header: Module Pill, Category, Bookmark Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: `rgba(${item.module === 'emergency' ? '239, 68, 68' : '56, 189, 248'}, 0.12)`,
                color,
                border: `1px solid ${color}35`,
              }}
            >
              <IconComponent size={12} />
              <span>{item.module.toUpperCase()}</span>
            </span>

            {item.category && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                • {item.category}
              </span>
            )}

            {item.badge && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--status-emerald)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <ShieldCheck size={11} />
                <span>{item.badge.label}</span>
              </span>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleSaveToggle}
            style={{
              background: isSaved ? 'var(--brand-blue-bg)' : '#ffffff',
              border: `1px solid ${isSaved ? '#93c5fd' : 'var(--surface-border)'}`,
              color: isSaved ? 'var(--brand-primary)' : 'var(--text-muted)',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
              transition: 'all 0.15s ease',
            }}
            title={isSaved ? 'Remove Bookmark' : 'Save Bookmark (Offline Accessible)'}
            aria-label={isSaved ? 'Remove Bookmark' : 'Save Bookmark'}
          >
            <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 8px 0',
            lineHeight: 1.35,
          }}
        >
          {item.title}
        </h3>

        {/* Excerpt / Summary */}
        <p
          style={{
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            margin: '0 0 14px 0',
          }}
        >
          {item.summary}
        </p>

        {/* Price or Key Highlight */}
        {item.price !== null && item.price !== undefined && (
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-electric)' }}>
              ₹{item.price.toLocaleString('en-IN')}
            </span>
            {item.pricePeriod && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                / {item.pricePeriod}
              </span>
            )}
          </div>
        )}
      </div>

      <div>
        {/* Location & Date Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '1px solid var(--surface-border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MapPin size={13} style={{ color: 'var(--brand-electric)' }} />
            <span>{item.areaName}</span>
          </div>

          {item.publishedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} />
              <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            style={{
              flex: 1,
              padding: '7px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-blue-bg)',
              border: '1px solid #bfdbfe',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>View Details</span>
            <ExternalLink size={12} />
          </button>

          {item.contactPhone && (
            <a
              href={`tel:${item.contactPhone}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                background: 'var(--status-emerald-bg)',
                border: '1px solid var(--status-emerald-border)',
                color: 'var(--status-emerald)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              title={`Call ${item.contactPhone}`}
            >
              <Phone size={13} />
              <span>Call</span>
            </a>
          )}

          {item.contactWhatsapp && (
            <a
              href={`https://wa.me/91${item.contactWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              title="Chat on WhatsApp"
            >
              <MessageCircle size={13} />
              <span>WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
