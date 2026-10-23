import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  Plus,
  ThumbsUp,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Share2,
  CalendarCheck,
  Sparkles,
} from 'lucide-react';
import SubmitEventModal from './SubmitEventModal';
import EventDetailModal from './EventDetailModal';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'haat_bazaar', label: 'Weekly Haat Bazaar' },
  { id: 'yatra_festival', label: 'Village Yatra / Festivals' },
  { id: 'agri_fair', label: 'Agricultural Fair' },
  { id: 'health_camp', label: 'Health & Blood Camp' },
  { id: 'sports_tournament', label: 'Sports Tournament' },
  { id: 'cultural_meet', label: 'Cultural Meet' },
  { id: 'civic_meeting', label: 'Civic / Gram Sabha' },
  { id: 'other', label: 'Other Events' },
];

export default function EventsDeskView() {
  const { user, areasList, openAuthModal } = useApp();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Modals
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        timeframe: tab,
        page,
        limit: 12,
      };
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedAreaId !== 'all') params.areaId = selectedAreaId;
      if (search.trim()) params.search = search.trim();

      const res = await api.getEvents(params);
      setEvents(res.events || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [tab, selectedCategory, selectedAreaId, search, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenSubmit = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setIsSubmitOpen(true);
  };

  const handleEventSubmitted = () => {
    fetchEvents();
  };

  const handleEventUpdated = (updatedEvent) => {
    setEvents(prev => prev.map(ev => (ev.id === updatedEvent.id ? updatedEvent : ev)));
    setSelectedEvent(updatedEvent);
  };

  return (
    <div className="events-desk-view" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div className="module-hero-banner" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="module-icon-box" style={{ width: '56px', height: '56px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={28} style={{ color: 'var(--brand-electric)' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 className="module-hero-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Events Desk</h1>
                <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', background: 'var(--brand-blue-bg)', color: 'var(--brand-electric)', fontWeight: 700, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  Phase 5 Live
                </span>
              </div>
              <div style={{ color: 'var(--brand-electric)', fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>
                स्थानिक कार्यक्रम आणि जत्रा
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenSubmit}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700, borderRadius: '10px' }}
          >
            <Plus size={16} />
            <span>Submit Community Event</span>
          </button>
        </div>

        <p className="module-hero-desc" style={{ marginTop: '14px', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Weekly village haat bazaars, annual religious yatras, sports tournaments, health camps, and cultural gatherings across Deori Taluka, Chichgarh, Soundad, and nearby rural circles.
        </p>

        {/* Editorial Safeguard Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={15} style={{ color: 'var(--status-emerald)' }} />
          <span>Community submissions undergo editorial verification before public publication to prevent fraudulent gatherings.</span>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div style={{ background: 'var(--surface-card)', borderRadius: '12px', border: '1px solid var(--surface-border)', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Tabs: Upcoming vs Past */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-subtle)', borderRadius: '8px', padding: '4px', border: '1px solid var(--surface-border-subtle)' }}>
            <button
              onClick={() => { setTab('upcoming'); setPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: tab === 'upcoming' ? 'var(--brand-electric)' : 'transparent',
                color: tab === 'upcoming' ? '#000' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Upcoming ({tab === 'upcoming' ? pagination.total : 'Events'})
            </button>
            <button
              onClick={() => { setTab('past'); setPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: tab === 'past' ? 'var(--brand-electric)' : 'transparent',
                color: tab === 'past' ? '#000' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Past Events ({tab === 'past' ? pagination.total : 'Archive'})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '400px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search events, venues, organizers..."
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Taluka Circle Dropdown */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedAreaId}
              onChange={e => { setSelectedAreaId(e.target.value); setPage(1); }}
              className="form-select"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="all">All Taluka Circles</option>
              {areasList.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginTop: '14px', scrollbarWidth: 'thin' }}>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'var(--surface-subtle)',
                  color: isSelected ? 'var(--brand-electric)' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--brand-electric)' : '1px solid var(--surface-border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event Cards Grid / Loading / Empty */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 14px' }}></div>
          <p>Loading community events...</p>
        </div>
      ) : events.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
          <Calendar size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {tab === 'upcoming' ? 'No Upcoming Events Scheduled' : 'No Past Events Found'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 18px' }}>
            {selectedCategory !== 'all' || selectedAreaId !== 'all' || search
              ? 'No events match your current filters. Try resetting the category or area.'
              : 'Be the first to announce an upcoming weekly haat, religious celebration, or village camp in Deori Taluka.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {(selectedCategory !== 'all' || selectedAreaId !== 'all' || search) && (
              <button
                onClick={() => { setSelectedCategory('all'); setSelectedAreaId('all'); setSearch(''); }}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem' }}
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={handleOpenSubmit}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Submit An Event</span>
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            {events.map(ev => {
              const startDateObj = new Date(ev.startDate);
              const month = startDateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
              const day = startDateObj.getDate();
              const isCancelled = ev.status === 'cancelled';

              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--surface-border)';
                  }}
                >
                  <div>
                    {/* Top Date & Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Mini Calendar Date Badge */}
                        <div style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          textAlign: 'center',
                          minWidth: '44px',
                        }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--brand-electric)', letterSpacing: '0.5px' }}>{month}</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{day}</div>
                        </div>

                        <div>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'var(--surface-subtle)',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                          }}>
                            {ev.category?.replace(/_/g, ' ')}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                            {ev.areaName || 'Deori Taluka'}
                          </div>
                        </div>
                      </div>

                      {isCancelled ? (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-crimson)', fontWeight: 700 }}>
                          Cancelled
                        </span>
                      ) : ev.status === 'pending_review' ? (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', fontWeight: 700 }}>
                          Pending Review
                        </span>
                      ) : null}
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.35 }}>
                      {ev.title}
                    </h3>

                    {/* Venue & Time */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} style={{ color: 'var(--brand-electric)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.venue}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} style={{ color: 'var(--brand-electric)', flexShrink: 0 }} />
                        <span>{ev.startTime} – {ev.endTime}</span>
                      </div>
                    </div>

                    {/* Short Description */}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ev.description}
                    </p>
                  </div>

                  {/* Card Bottom: Going / Interested count + View Details button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <UserCheck size={12} style={{ color: 'var(--status-emerald)' }} />
                        {ev.goingCount || 0} Going
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ThumbsUp size={12} style={{ color: 'var(--brand-electric)' }} />
                        {ev.interestedCount || 0} Interested
                      </span>
                    </div>

                    <span style={{ fontSize: '0.78rem', color: 'var(--brand-electric)', fontWeight: 600 }}>
                      View Details →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <SubmitEventModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        onSubmitted={handleEventSubmitted}
      />

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEventUpdated={handleEventUpdated}
        />
      )}
    </div>
  );
}
