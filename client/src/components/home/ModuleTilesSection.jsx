import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Briefcase,
  Home,
  Truck,
  Wheat,
  ShoppingBag,
  Wrench,
  Calendar,
  Newspaper,
  ShieldAlert,
  Building2,
  ArrowRight,
  Sparkles,
  Grid,
  Pin,
} from 'lucide-react';

const ICON_MAP = {
  Briefcase,
  Home,
  Truck,
  Wheat,
  ShoppingBag,
  Wrench,
  Calendar,
  Newspaper,
  ShieldAlert,
  Building2,
};

const CATEGORIES = ['All', 'Pinned / Favorites', 'Featured', 'Daily Essentials', 'Commerce & Services', 'Civic & Community'];

export default function ModuleTilesSection() {
  const { modules, navigateToModule, pinnedModules, togglePinModule } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter modules
  let filteredModules = modules.filter((m) => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Pinned / Favorites') {
      return pinnedModules.includes(m.slug);
    }
    if (selectedCategory === 'Featured') return m.featured;
    if (selectedCategory === 'Daily Essentials') {
      return ['jobs', 'rentals', 'rides', 'emergency'].includes(m.id);
    }
    if (selectedCategory === 'Commerce & Services') {
      return ['krishi', 'marketplace', 'services', 'directory'].includes(m.id);
    }
    if (selectedCategory === 'Civic & Community') {
      return ['events', 'news', 'emergency'].includes(m.id);
    }
    return true;
  });

  // If on 'All', prioritize pinned modules first
  if (selectedCategory === 'All' && pinnedModules.length > 0) {
    const pinnedSet = new Set(pinnedModules);
    filteredModules = [
      ...filteredModules.filter(m => pinnedSet.has(m.slug)),
      ...filteredModules.filter(m => !pinnedSet.has(m.slug)),
    ];
  }

  return (
    <section id="modules-section" aria-label="LocalHub X Core Modules">
      {/* Section Header */}
      <div className="section-header-row">
        <div>
          <h2 className="section-title">
            <Grid size={22} style={{ color: 'var(--brand-electric)' }} />
            <span>Local Services & Modules</span>
          </h2>
          <p className="section-subtitle">
            10 specialized verticals tailored for rural commerce, labor, and civic life in Deori Taluka.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="category-tabs" role="tablist">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className={`category-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="module-grid">
        {filteredModules.map((module) => {
          const Icon = ICON_MAP[module.icon] || Sparkles;
          const isPinned = pinnedModules.includes(module.slug);

          return (
            <div
              key={module.id}
              className="module-card"
              role="button"
              tabIndex={0}
              onClick={() => navigateToModule(module.slug)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigateToModule(module.slug);
                }
              }}
              aria-label={`Open ${module.title}`}
              style={{ position: 'relative' }}
            >
              <div>
                <div className="module-card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="module-icon-box">
                    <Icon size={22} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="module-badge-tag">{module.badge}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinModule(module.slug);
                      }}
                      style={{
                        background: isPinned ? 'var(--brand-blue-bg)' : 'var(--surface-subtle)',
                        border: `1px solid ${isPinned ? '#bfdbfe' : 'var(--surface-border)'}`,
                        borderRadius: '6px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isPinned ? 'var(--brand-primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={isPinned ? 'Unpin from Top' : 'Pin to Top'}
                      aria-label={isPinned ? 'Unpin module' : 'Pin module'}
                    >
                      <Pin size={12} fill={isPinned ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                <h3 className="module-title">{module.title}</h3>
                <div className="module-marathi-title">{module.marathiTitle}</div>
                <p className="module-description">{module.description}</p>
              </div>

              <div className="module-card-footer">
                <span>{module.tagline.split('&')[0]}</span>
                <span className="module-explore-link">
                  <span>Explore</span>
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
