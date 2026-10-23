import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Newspaper,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  AlertTriangle,
  User,
  ExternalLink,
} from 'lucide-react';
import SubmitNewsModal from './SubmitNewsModal';
import SubmitGovtNoticeModal from './SubmitGovtNoticeModal';
import NewsArticleDetailModal from './NewsArticleDetailModal';
import GovtNoticeDetailModal from './GovtNoticeDetailModal';

const NEWS_CATEGORIES = [
  { id: 'all', label: 'All News' },
  { id: 'agriculture', label: 'Agriculture & Krishi' },
  { id: 'infrastructure', label: 'Roads & Infrastructure' },
  { id: 'civic', label: 'Civic & Panchayat' },
  { id: 'youth', label: 'Youth & Education' },
  { id: 'sports', label: 'Sports Tournaments' },
  { id: 'weather', label: 'Weather & Advisory' },
  { id: 'cultural', label: 'Cultural & Heritage' },
  { id: 'business', label: 'Local Trade' },
];

const NOTICE_CATEGORIES = [
  { id: 'all', label: 'All Notices' },
  { id: 'administrative', label: 'Administrative' },
  { id: 'agriculture_scheme', label: 'Agri Subsidy / DBT' },
  { id: 'public_health', label: 'Public Health' },
  { id: 'power_water_supply', label: 'MSEDCL Power / Water' },
  { id: 'exam_recruitment', label: 'Recruitment / Exams' },
  { id: 'disaster_alert', label: 'Weather / Flood Alert' },
  { id: 'tribal_welfare', label: 'Tribal Welfare' },
];

export default function TalukaNewsFeedView({ initialTab = 'news' }) {
  const { user, areasList, openAuthModal } = useApp();

  const [activeTab, setActiveTab] = useState(initialTab); // 'news' | 'notices'
  const [newsArticles, setNewsArticles] = useState([]);
  const [govtNotices, setGovtNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Modals
  const [isSubmitNewsOpen, setIsSubmitNewsOpen] = useState(false);
  const [isSubmitNoticeOpen, setIsSubmitNoticeOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);

  // Fetch News or Notices depending on tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
      };
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedAreaId !== 'all') params.areaId = selectedAreaId;
      if (search.trim()) params.search = search.trim();

      if (activeTab === 'news') {
        const res = await api.getNews(params);
        setNewsArticles(res.articles || []);
        if (res.pagination) setPagination(res.pagination);
      } else {
        const res = await api.getGovtNotices(params);
        setGovtNotices(res.notices || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, selectedAreaId, search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSelectedCategory('all');
    setSearch('');
    setPage(1);
  };

  const handleOpenSubmit = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (activeTab === 'news') {
      setIsSubmitNewsOpen(true);
    } else {
      setIsSubmitNoticeOpen(true);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="taluka-news-feed-view" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div className="module-hero-banner" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="module-icon-box" style={{ width: '56px', height: '56px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Newspaper size={28} style={{ color: 'var(--brand-electric)' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 className="module-hero-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                  Taluka News & Govt Notices
                </h1>
                <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', background: 'var(--brand-blue-bg)', color: 'var(--brand-electric)', fontWeight: 700, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  Phase 5 Live
                </span>
              </div>
              <div style={{ color: 'var(--brand-electric)', fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>
                स्थानिक बातम्या आणि अधिकृत शासकीय सूचना
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                if (!user) { openAuthModal('login'); return; }
                setIsSubmitNewsOpen(true);
              }}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <Plus size={15} />
              <span>Submit News Report</span>
            </button>
            <button
              onClick={() => {
                if (!user) { openAuthModal('login'); return; }
                setIsSubmitNoticeOpen(true);
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <Building2 size={15} />
              <span>Post Govt Circular</span>
            </button>
          </div>
        </div>

        <p className="module-hero-desc" style={{ marginTop: '14px', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Verified on-the-ground news, agricultural market advisories, and official circulars from Tahsildar, Panchayat Samiti, MSEDCL, and health authorities across Deori Taluka.
        </p>

        {/* Editorial Safeguard Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={15} style={{ color: 'var(--status-emerald)' }} />
          <span>Every news report requires source attribution. Official government circulars are verified against authoritative departmental portals to prevent rumors.</span>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div style={{ background: 'var(--surface-card)', borderRadius: '12px', border: '1px solid var(--surface-border)', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Tabs: News Reports vs Official Notices */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-subtle)', borderRadius: '8px', padding: '4px', border: '1px solid var(--surface-border-subtle)' }}>
            <button
              onClick={() => handleTabChange('news')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'news' ? 'var(--brand-electric)' : 'transparent',
                color: activeTab === 'news' ? '#000' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Newspaper size={14} />
              <span>Taluka News ({activeTab === 'news' ? pagination.total : 'Feed'})</span>
            </button>
            <button
              onClick={() => handleTabChange('notices')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'notices' ? 'var(--brand-electric)' : 'transparent',
                color: activeTab === 'notices' ? '#000' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Building2 size={14} />
              <span>Official Govt Notices ({activeTab === 'notices' ? pagination.total : 'Circulars'})</span>
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={activeTab === 'news' ? "Search news, reporters, topics..." : "Search circulars, departments, DBT..."}
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
          {(activeTab === 'news' ? NEWS_CATEGORIES : NOTICE_CATEGORIES).map(cat => {
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

      {/* Main Content Area: Cards or Empty State */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 14px' }}></div>
          <p>Loading {activeTab === 'news' ? 'news articles' : 'official notices'}...</p>
        </div>
      ) : activeTab === 'news' ? (
        newsArticles.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <Newspaper size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              No News Articles Found
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 18px' }}>
              {selectedCategory !== 'all' || selectedAreaId !== 'all' || search
                ? 'No reports match your current filters. Try resetting the category or area.'
                : 'Local news reports submitted by verified citizens and correspondents will appear here.'}
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
                onClick={() => {
                  if (!user) { openAuthModal('login'); return; }
                  setIsSubmitNewsOpen(true);
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Submit A News Story</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
            {newsArticles.map(article => (
              <div
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
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
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--surface-subtle)',
                        color: 'var(--brand-electric)',
                        textTransform: 'uppercase',
                      }}>
                        {article.category?.replace(/_/g, ' ')}
                      </span>
                      {article.areaName && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          • {article.areaName}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {article.factChecked && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-emerald)', fontWeight: 700 }}>
                          <ShieldCheck size={10} />
                          <span>Verified</span>
                        </span>
                      )}
                      {article.isCorrection && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', fontWeight: 700 }}>
                          Corrected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0 0 10px', lineHeight: 1.4 }}>
                    {article.title}
                  </h3>

                  {/* Excerpt */}
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {article.content}
                  </p>
                </div>

                {/* Card Footer: Byline, Date, Read Story */}
                <div style={{ borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={12} style={{ color: 'var(--brand-electric)' }} />
                    <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article.authorName}</span>
                    <span>• {formatDate(article.publishedAt || article.createdAt)}</span>
                  </div>

                  <span style={{ color: 'var(--brand-electric)', fontWeight: 600 }}>
                    Read Article →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Government Notices Tab */
        govtNotices.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <Building2 size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              No Official Notices Found
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 18px' }}>
              {selectedCategory !== 'all' || selectedAreaId !== 'all' || search
                ? 'No circulars match your current filter criteria.'
                : 'Official notifications from Tahsildar, Panchayat Samiti, MSEDCL, and health authorities will appear here.'}
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
                onClick={() => {
                  if (!user) { openAuthModal('login'); return; }
                  setIsSubmitNoticeOpen(true);
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Submit Official Circular</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
            {govtNotices.map(notice => {
              const isExpired = notice.isDeadlinePassed || (notice.deadlineDate && new Date(notice.deadlineDate) < new Date());

              return (
                <div
                  key={notice.id}
                  onClick={() => setSelectedNotice(notice)}
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '12px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
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
                    {/* Authority Header Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={13} style={{ color: 'var(--brand-electric)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-electric)' }}>
                          {notice.issuingAuthority}
                        </span>
                      </div>

                      {notice.deadlineDate && (
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: isExpired ? 'var(--status-crimson)' : 'var(--brand-electric)',
                          fontWeight: 700,
                        }}>
                          {isExpired ? 'Deadline Passed' : `Due: ${formatDate(notice.deadlineDate)}`}
                        </span>
                      )}
                    </div>

                    {/* Notice Title */}
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0 0 10px', lineHeight: 1.4 }}>
                      {notice.title}
                    </h3>

                    {/* Circular No */}
                    {notice.noticeNumber && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Ref: {notice.noticeNumber}
                      </div>
                    )}

                    {/* Official Summary */}
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {notice.officialSummary}
                    </p>
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={12} style={{ color: 'var(--brand-electric)' }} />
                      <span>Issued {formatDate(notice.effectiveDate)}</span>
                    </div>

                    <span style={{ color: 'var(--brand-electric)', fontWeight: 600 }}>
                      View Circular →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

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

      {/* Modals */}
      <SubmitNewsModal
        isOpen={isSubmitNewsOpen}
        onClose={() => setIsSubmitNewsOpen(false)}
        onSubmitted={() => fetchData()}
      />

      <SubmitGovtNoticeModal
        isOpen={isSubmitNoticeOpen}
        onClose={() => setIsSubmitNoticeOpen(false)}
        onSubmitted={() => fetchData()}
      />

      {selectedArticle && (
        <NewsArticleDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onArticleUpdated={() => fetchData()}
        />
      )}

      {selectedNotice && (
        <GovtNoticeDetailModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}
    </div>
  );
}
