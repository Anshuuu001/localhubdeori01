import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  Briefcase,
  Home as HomeIcon,
  Truck,
  Wheat,
  ShoppingBag,
  Wrench,
  Calendar,
  Newspaper,
  ShieldAlert,
  Building2,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import GenericModuleListingsView from './GenericModuleListingsView';
import BusinessDirectoryView from './BusinessDirectoryView';
import RideDeliveryModuleView from './RideDeliveryModuleView';
import EventsDeskView from './EventsDeskView';
import TalukaNewsFeedView from './TalukaNewsFeedView';
import EmergencyContactsView from './EmergencyContactsView';

const ICON_MAP = {
  Briefcase,
  Home: HomeIcon,
  Truck,
  Wheat,
  ShoppingBag,
  Wrench,
  Calendar,
  Newspaper,
  ShieldAlert,
  Building2,
};

export default function ModuleView({ slug }) {
  const { modules, navigateToHome } = useApp();

  const module = modules.find((m) => m.slug === slug || m.id === slug) || {
    id: slug,
    slug: slug,
    title: 'LocalHub X Module',
    marathiTitle: 'स्थानिक विभाग',
    tagline: 'Local Taluka Module',
    description: 'This module is being structured for upcoming releases of LocalHub X.',
    badge: 'Phase Blueprint',
    highlights: ['Direct Contact', 'Verified Listings', 'Deori Taluka Focus'],
    sampleSearchKeywords: ['sample', 'search', 'keywords'],
  };

  const Icon = ICON_MAP[module.icon] || Sparkles;

  // Render Module 1: Jobs Hub
  const isJobs = slug === 'jobs-hub' || slug === 'jobs';
  // Render Module 2: Rentals & PG
  const isRentals = slug === 'rentals-pg' || slug === 'rentals';
  // Render Module 3: Marketplace
  const isMarketplace = slug === 'marketplace';
  // Render Module 4: Krishi Bazaar
  const isKrishi = slug === 'krishi-bazaar' || slug === 'krishi';
  // Render Module 5: Local Services
  const isServices = slug === 'local-services' || slug === 'services';
  // Render Module 6: Business Directory
  const isDirectory = slug === 'business-directory' || slug === 'directory';
  // Render Module 7: Ride & Delivery (Phase 4)
  const isRides = slug === 'ride-delivery' || slug === 'rides';
  // Render Module 8: Events Desk (Phase 5)
  const isEvents = slug === 'events-desk' || slug === 'events';
  // Render Module 9: Taluka News Feed & Govt Notices (Phase 5)
  const isNews = slug === 'taluka-news-feed' || slug === 'news' || slug === 'govt-notices' || slug === 'notices';
  // Render Module 10: Emergency Contacts (Phase 5)
  const isEmergency = slug === 'emergency-contacts' || slug === 'emergency';

  return (
    <div className="module-view-container">
      {/* Breadcrumb Back Button */}
      <button
        onClick={navigateToHome}
        className="breadcrumb-back-btn"
        aria-label="Back to Homepage"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-subtle)',
          border: '1px solid var(--surface-border)',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Home Overview</span>
      </button>

      {/* Render Module Components */}
      {isJobs && (
        <GenericModuleListingsView
          moduleKey="jobs"
          title="Jobs Hub"
          marathiTitle="रोजगार केंद्र"
          tagline="Local employment, skilled labor, seasonal & shop vacancies in Deori Taluka"
          description={module.description}
          icon={Briefcase}
        />
      )}

      {isRentals && (
        <GenericModuleListingsView
          moduleKey="rentals"
          title="Rentals & PG"
          marathiTitle="भाडे आणि पीजी"
          tagline="Rooms, family flats, commercial shops & student PG accommodations"
          description={module.description}
          icon={HomeIcon}
        />
      )}

      {isMarketplace && (
        <GenericModuleListingsView
          moduleKey="marketplace"
          title="Marketplace"
          marathiTitle="स्थानिक बाजार (नवीन वस्तू)"
          tagline="Brand-new retail products from registered Deori Taluka merchants only"
          description={module.description}
          icon={ShoppingBag}
        />
      )}

      {isKrishi && (
        <GenericModuleListingsView
          moduleKey="krishi"
          title="Krishi Bazaar"
          marathiTitle="कृषी बाजार"
          tagline="Farm harvest crops, seeds, fertilizer supplies & tractor/harvester machinery rentals"
          description={module.description}
          icon={Wheat}
        />
      )}

      {isServices && (
        <GenericModuleListingsView
          moduleKey="services"
          title="Local Services"
          marathiTitle="स्थानिक सेवा"
          tagline="On-demand electricians, plumbers, carpenters, mechanics & repair technicians"
          description={module.description}
          icon={Wrench}
        />
      )}

      {isDirectory && <BusinessDirectoryView />}
      {isRides && <RideDeliveryModuleView />}
      {isEvents && <EventsDeskView />}
      {isNews && <TalukaNewsFeedView initialTab={slug === 'govt-notices' || slug === 'notices' ? 'notices' : 'news'} />}
      {isEmergency && <EmergencyContactsView />}

      {/* Fallback for Future Phases */}
      {!isJobs && !isRentals && !isMarketplace && !isKrishi && !isServices && !isDirectory && !isRides && !isEvents && !isNews && !isEmergency && (
        <div className="module-placeholder-view">
          <div className="module-hero-banner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="module-icon-box" style={{ width: '54px', height: '54px' }}>
                  <Icon size={28} />
                </div>
                <div>
                  <h1 className="module-hero-title">{module.title}</h1>
                  <div style={{ color: 'var(--brand-electric)', fontSize: '0.95rem', fontWeight: 600 }}>
                    {module.marathiTitle}
                  </div>
                </div>
              </div>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--brand-blue-bg)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: 'var(--brand-electric)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                {module.badge}
              </span>
            </div>

            <p className="module-hero-desc">{module.description}</p>
          </div>

          <div className="module-specs-grid" style={{ marginTop: '20px' }}>
            <div className="spec-box">
              <h4>
                <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Core Scope
              </h4>
              <p>{module.tagline}</p>
              <ul style={{ marginTop: '10px', paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {module.highlights?.map((h, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{h}</li>
                ))}
              </ul>
            </div>

            <div className="spec-box">
              <h4>
                <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Implementation Schedule
              </h4>
              <p>
                Scheduled for integration in <strong>{module.badge}</strong>. Core marketplace modules (Jobs, Rentals, Marketplace, Krishi, Services, Directory) are live in Phase 3.
              </p>
            </div>

            <div className="spec-box">
              <h4>
                <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Integrity Safeguards
              </h4>
              <p>
                No online payments or live GPS tracking in early releases. Verified safeguards protect rural markets from fraud and misinformation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
