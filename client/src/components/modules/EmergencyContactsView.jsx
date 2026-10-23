import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Phone,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  MapPin,
  Search,
  Filter,
  Check,
  Share2,
  ExternalLink,
  Flame,
  Activity,
  Zap,
  Building,
  Flag,
} from 'lucide-react';
import EmergencyContactReportModal from './EmergencyContactReportModal';

const CATEGORIES = [
  { id: 'all', label: 'All Emergency Services' },
  { id: 'police', label: 'Police & Security' },
  { id: 'medical', label: 'Hospitals & Medical' },
  { id: 'fire', label: 'Fire Brigade' },
  { id: 'disaster', label: 'Disaster Relief' },
  { id: 'electricity', label: 'MSEDCL Electricity' },
  { id: 'panchayat', label: 'Panchayat Helpline' },
  { id: 'women_helpline', label: 'Women Helpline' },
  { id: 'snake_rescue', label: 'Snake Rescue / Forest' },
];

export default function EmergencyContactsView() {
  const { user, areasList, openAuthModal } = useApp();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Report Modal
  const [reportingContact, setReportingContact] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedAreaId !== 'all') params.areaId = selectedAreaId;
      if (search.trim()) params.search = search.trim();

      const res = await api.getEmergencyContacts(params);
      setContacts(res.contacts || []);
    } catch (err) {
      console.error('Failed to fetch emergency contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedAreaId, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleCopy = (id, phone) => {
    navigator.clipboard.writeText(phone).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleOpenReport = (contact) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setReportingContact(contact);
  };

  return (
    <div className="emergency-contacts-view" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Banner */}
      <div className="module-hero-banner" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="module-icon-box" style={{ width: '56px', height: '56px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={28} style={{ color: 'var(--status-crimson)' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 className="module-hero-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                  Emergency Directory
                </h1>
                <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-crimson)', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  Phase 5 Live
                </span>
              </div>
              <div style={{ color: 'var(--status-crimson)', fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>
                आपत्कालीन संपर्क आणि मदत कक्ष
              </div>
            </div>
          </div>
        </div>

        <p className="module-hero-desc" style={{ marginTop: '14px', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Direct dial verified emergency lines for police, ambulance casualty, fire stations, electricity breakdowns, and government disaster control in Deori Taluka.
        </p>

        {/* Top 24x7 National & State Lifelines */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '18px' }}>
          {/* 112 ERSS */}
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--status-crimson)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                National Emergency Response
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#991b1b', lineHeight: 1.2 }}>
                112
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Police • Fire • Disaster Rescue (24x7)
              </div>
            </div>

            <a
              href="tel:112"
              className="btn"
              style={{
                backgroundColor: 'var(--status-crimson)',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PhoneCall size={16} />
              <span>Call 112</span>
            </a>
          </div>

          {/* 108 MEMS */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Maharashtra Medical Helpline
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#166534', lineHeight: 1.2 }}>
                108
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Government Free Ambulance Service (24x7)
              </div>
            </div>

            <a
              href="tel:108"
              className="btn"
              style={{
                backgroundColor: 'var(--status-emerald)',
                color: '#000',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PhoneCall size={16} />
              <span>Call 108</span>
            </a>
          </div>
        </div>

        {/* Verification Guarantee */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={15} style={{ color: 'var(--status-emerald)' }} />
          <span>Only verified official telephone lines are shown. Citizens can report outdated or unresponsive numbers for immediate investigation.</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: 'var(--surface-card)', borderRadius: '12px', border: '1px solid var(--surface-border)', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search station, hospital, ambulance, officer..."
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Taluka Circle Dropdown */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedAreaId}
              onChange={e => setSelectedAreaId(e.target.value)}
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
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'rgba(239, 68, 68, 0.18)' : 'var(--surface-subtle)',
                  color: isSelected ? 'var(--status-crimson)' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--status-crimson)' : '1px solid var(--surface-border-subtle)',
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

      {/* Directory Grid / Loading / Empty */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 14px' }}></div>
          <p>Loading verified emergency contacts...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
          <ShieldAlert size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Emergency Contacts Found
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 18px' }}>
            {selectedCategory !== 'all' || selectedAreaId !== 'all' || search
              ? 'No contacts match your current filter settings. For immediate life-saving emergencies, dial 112 or 108.'
              : 'Verified emergency directory listings will appear here.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedAreaId('all'); setSearch(''); }}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem' }}
            >
              Reset Filters
            </button>
            <a
              href="tel:112"
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PhoneCall size={14} />
              <span>Dial 112 (National Help)</span>
            </a>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
          {contacts.map(c => {
            const is24x7 = c.is24x7 || c.availableHours?.toLowerCase().includes('24');

            return (
              <div
                key={c.id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--surface-subtle)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                      }}>
                        {c.category?.replace(/_/g, ' ')}
                      </span>
                      {c.areaName && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          • {c.areaName}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {is24x7 && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-crimson)', fontWeight: 700 }}>
                          24x7 Line
                        </span>
                      )}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-emerald)', fontWeight: 700 }}>
                        <ShieldCheck size={10} />
                        <span>Verified</span>
                      </span>
                    </div>
                  </div>

                  {/* Service Name */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.35 }}>
                    {c.serviceName}
                  </h3>

                  {/* Hours & Address */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {c.availableHours && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} style={{ color: 'var(--brand-electric)', flexShrink: 0 }} />
                        <span>Hours: {c.availableHours}</span>
                      </div>
                    )}
                    {c.addressDetails && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} style={{ color: 'var(--brand-electric)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.addressDetails}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Call Button & Report Issue */}
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <a
                      href={`tel:${c.phoneNumber}`}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        background: 'linear-gradient(135deg, var(--brand-electric) 0%, #2563eb 100%)',
                        color: '#000',
                      }}
                    >
                      <PhoneCall size={16} />
                      <span>Call {c.phoneNumber}</span>
                    </a>

                    <button
                      onClick={() => handleCopy(c.id, c.phoneNumber)}
                      className="btn btn-secondary"
                      style={{ padding: '10px 12px', fontSize: '0.8rem' }}
                      title="Copy Phone Number"
                    >
                      {copiedId === c.id ? <Check size={16} style={{ color: 'var(--status-emerald)' }} /> : <Phone size={16} />}
                    </button>
                  </div>

                  {c.secondaryPhone && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Alt Line: <a href={`tel:${c.secondaryPhone}`} style={{ color: 'var(--brand-electric)', textDecoration: 'none' }}>{c.secondaryPhone}</a></span>
                    </div>
                  )}

                  {/* Flag Outdated / Report Issue Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '8px' }}>
                    <button
                      onClick={() => handleOpenReport(c)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.72rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--status-crimson)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Flag size={11} />
                      <span>Report outdated or wrong number</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      {reportingContact && (
        <EmergencyContactReportModal
          isOpen={!!reportingContact}
          contact={reportingContact}
          onClose={() => setReportingContact(null)}
          onSubmitted={() => fetchContacts()}
        />
      )}
    </div>
  );
}
