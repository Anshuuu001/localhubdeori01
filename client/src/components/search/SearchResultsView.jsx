import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import SearchResultCard from './SearchResultCard';
import {
  Search,
  Filter,
  ArrowLeft,
  X,
  MapPin,
  Clock,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  Info,
} from 'lucide-react';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Results' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'rentals', label: 'Rentals & PG' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'krishi', label: 'Krishi Bazaar' },
  { id: 'services', label: 'Local Services' },
  { id: 'directory', label: 'Business Directory' },
  { id: 'events', label: 'Events' },
  { id: 'news', label: 'News' },
  { id: 'notices', label: 'Govt Notices' },
  { id: 'emergency', label: 'Emergency Helplines' },
];

export default function SearchResultsView() {
  const {
    searchQuery,
    setSearchQuery,
    selectedArea,
    areasList,
    navigateToHome,
    activeCategory,
    setActiveCategory,
    user,
  } = useApp();

  const [localQuery, setLocalQuery] = useState(searchQuery || '');
  const [selectedModule, setSelectedModule] = useState(activeCategory || 'all');
  const [areaScope, setAreaScope] = useState(selectedArea.id || 'all');
  const [expandNearby, setExpandNearby] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(1);

  const [results, setResults] = useState([]);
  const [moduleBreakdown, setModuleBreakdown] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Suggestions & History dropdown
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Load user search history if authenticated
  const loadHistory = useCallback(async () => {
    if (!user) {
      setSearchHistory([]);
      return;
    }
    try {
      const res = await api.getSearchHistory();
      setSearchHistory(res.history || []);
    } catch {
      setSearchHistory([]);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Execute universal search
  const executeSearch = useCallback(async () => {
    const q = localQuery.trim();
    if (!q) {
      setResults([]);
      setTotalCount(0);
      setModuleBreakdown({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.search({
        q,
        module: selectedModule,
        areaId: areaScope,
        expandNearby,
        sort: sortBy,
        page,
        limit: 25,
      });

      setResults(res.results || []);
      setTotalCount(res.pagination?.total || 0);
      setModuleBreakdown(res.moduleBreakdown || {});
      loadHistory();
    } catch (err) {
      console.error('[Search Error]', err);
      setError(err.message || 'Failed to complete search across local records.');
    } finally {
      setLoading(false);
    }
  }, [localQuery, selectedModule, areaScope, expandNearby, sortBy, page, loadHistory]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  // Suggestions fetcher
  useEffect(() => {
    if (!localQuery || localQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.getSearchSuggestions({ q: localQuery.trim(), limit: 6 });
        setSuggestions(res.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [localQuery]);

  // Handle clicking outside suggestions dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowDropdown(false);
    setPage(1);
    executeSearch();
  };

  const handleSelectSuggestion = (text) => {
    setLocalQuery(text);
    setSearchQuery(text);
    setShowDropdown(false);
    setPage(1);
  };

  const handleClearHistory = async (e) => {
    e.stopPropagation();
    try {
      await api.clearSearchHistory();
      setSearchHistory([]);
    } catch (err) {
      console.warn('Failed to clear search history:', err);
    }
  };

  return (
    <div className="search-results-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Top Breadcrumb & Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={navigateToHome}
          className="header-btn"
          style={{ width: 'auto', padding: '6px 14px', gap: '6px', fontSize: '0.8rem' }}
          aria-label="Return to Home Overview"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          LocalHub X Universal Search • 10 Deori Taluka Modules
        </span>
      </div>

      {/* Universal Search Input Bar with Auto-Suggestions */}
      <div ref={dropdownRef} style={{ position: 'relative', marginBottom: '20px' }}>
        <form onSubmit={handleFormSubmit} className="search-bar-wrap" style={{ margin: 0 }}>
          <Search size={20} style={{ color: 'var(--brand-electric)', marginRight: '10px' }} />
          <input
            type="text"
            className="search-input"
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search across jobs, housing, tractors, electricians, taluka news, or emergency lines..."
            aria-label="Search query"
          />

          {localQuery && (
            <button
              type="button"
              onClick={() => {
                setLocalQuery('');
                setSearchQuery('');
                setResults([]);
              }}
              style={{ color: 'var(--text-muted)', marginRight: '8px', cursor: 'pointer' }}
              aria-label="Clear query"
            >
              <X size={16} />
            </button>
          )}

          <button type="submit" className="search-action-btn" aria-label="Submit search">
            <span>Search</span>
            <Search size={14} />
          </button>
        </form>

        {/* Suggestions & Search History Dropdown */}
        {showDropdown && (suggestions.length > 0 || (user && searchHistory.length > 0)) && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '6px',
              background: 'var(--surface-elevated, #ffffff)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              zIndex: 50,
              overflow: 'hidden',
            }}
          >
            {/* Live Data Suggestions */}
            {suggestions.length > 0 && (
              <div style={{ padding: '8px 0' }}>
                <div style={{ padding: '4px 16px', fontSize: '0.7rem', color: 'var(--brand-electric)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Matching Records in Deori
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s.text)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{s.text}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.category || s.module}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Private User Search History */}
            {user && searchHistory.length > 0 && (
              <div style={{ borderTop: suggestions.length > 0 ? '1px solid var(--surface-border-subtle)' : 'none', padding: '8px 0' }}>
                <div style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Recent Searches (Private)
                  </span>
                  <button
                    onClick={handleClearHistory}
                    style={{ background: 'none', border: 'none', color: 'var(--status-crimson)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <Trash2 size={11} />
                    <span>Clear</span>
                  </button>
                </div>

                {searchHistory.slice(0, 5).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(h.query_text)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-subtle)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>{h.query_text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Row: Category Tabs & Area / Sort Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
        {/* Category Tabs */}
        <div className="category-tabs" role="tablist" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORY_TABS.map((tab) => {
            const count = moduleBreakdown[tab.id];
            const isActive = selectedModule === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setSelectedModule(tab.id);
                  setActiveCategory(tab.id);
                  setPage(1);
                }}
                className={`category-tab-btn ${isActive ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                <span>{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: isActive ? 'var(--brand-electric)' : 'rgba(255, 255, 255, 0.1)',
                      color: isActive ? '#0b1120' : 'var(--text-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Area & Sort Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            background: 'var(--surface-subtle)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Area Filter Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} style={{ color: 'var(--brand-electric)' }} />
              <label htmlFor="area-filter" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Circle:
              </label>
              <select
                id="area-filter"
                value={areaScope}
                onChange={(e) => {
                  setAreaScope(e.target.value);
                  setPage(1);
                }}
                style={{
                  background: 'var(--surface-card, #ffffff)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  boxShadow: 'var(--shadow-xs)',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Taluka Circles</option>
                {areasList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Expand Nearby Checkbox */}
            {areaScope !== 'all' && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={expandNearby}
                  onChange={(e) => {
                    setExpandNearby(e.target.checked);
                    setPage(1);
                  }}
                  style={{ accentColor: 'var(--brand-electric)' }}
                />
                <span>Include Adjacent Circles</span>
              </label>
            )}
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
            <label htmlFor="sort-filter" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Sort:
            </label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              style={{
                background: 'var(--surface-card, #ffffff)',
                color: 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.82rem',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
              }}
            >
              <option value="relevance">Most Relevant</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header Count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {loading ? (
            <span>Searching 10 modules...</span>
          ) : (
            <span>
              Found <strong>{totalCount}</strong> verified result{totalCount === 1 ? '' : 's'} for "
              <strong style={{ color: 'var(--brand-electric)' }}>{localQuery}</strong>"
            </span>
          )}
        </div>

        <button
          onClick={executeSearch}
          className="header-btn"
          style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
          title="Refresh search"
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Results Grid / States */}
      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 14px' }}></div>
          <p style={{ fontSize: '0.88rem' }}>Querying verified records across Deori Taluka...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            textAlign: 'center',
            color: 'var(--status-crimson)',
          }}
        >
          <p style={{ margin: '0 0 12px 0' }}>{error}</p>
          <button onClick={executeSearch} className="header-btn" style={{ margin: '0 auto' }}>
            Retry Search
          </button>
        </div>
      ) : results.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--surface-subtle)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--brand-electric)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Search size={26} />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            No Matching Records Found
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 18px' }}>
            No published listings, businesses, events, or notices matched "{localQuery}" in the selected circle.
          </p>

          {/* Honest Guidance */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {areaScope !== 'all' && (
              <button
                onClick={() => {
                  setAreaScope('all');
                  setExpandNearby(false);
                }}
                className="header-btn"
                style={{ width: 'auto', padding: '8px 16px', background: 'var(--brand-blue-bg)', color: 'var(--brand-electric)' }}
              >
                Expand Search to All Taluka Circles
              </button>
            )}

            {selectedModule !== 'all' && (
              <button
                onClick={() => setSelectedModule('all')}
                className="header-btn"
                style={{ width: 'auto', padding: '8px 16px' }}
              >
                Show All Categories
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {results.map((item) => (
            <SearchResultCard key={`${item.entityType}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
