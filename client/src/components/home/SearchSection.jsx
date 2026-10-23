import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Search, Sparkles, ArrowRight, X, Clock } from 'lucide-react';

const POPULAR_QUERIES = [
  'Tractor rental',
  'Room near bus stand',
  'Paddy harvester',
  'Electrician Chichgarh',
  'Shop on NH-53',
  'Welder job',
];

export default function SearchSection() {
  const { searchQuery, setSearchQuery, selectedArea, navigateToSearch, user } = useApp();
  const [localQuery, setLocalQuery] = useState(searchQuery || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Auto-suggestions fetcher
  useEffect(() => {
    if (!localQuery || localQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.getSearchSuggestions({ q: localQuery.trim(), limit: 5 });
        setSuggestions(res.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [localQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setShowDropdown(false);
      navigateToSearch(localQuery.trim());
    }
  };

  const handleTagClick = (tag) => {
    setLocalQuery(tag);
    setShowDropdown(false);
    navigateToSearch(tag);
  };

  const handleSelectSuggestion = (text) => {
    setLocalQuery(text);
    setShowDropdown(false);
    navigateToSearch(text);
  };

  return (
    <section id="search-section" className="search-hero-section" aria-label="Universal Search">
      {/* Area Badge */}
      <div className="search-hero-badge">
        <Sparkles size={13} />
        <span>Deori Taluka Local Search • {selectedArea.name}</span>
      </div>

      <h1 className="search-hero-title">
        Everything in Deori Taluka, in one local place.
      </h1>
      <p className="search-hero-sub">
        Search real verified listings, jobs, rentals, farm machinery, technician services, events, taluka circulars, and emergency helplines.
      </p>

      {/* Search Input Bar */}
      <div ref={dropdownRef} style={{ position: 'relative', width: '100%', maxWidth: '640px', margin: '0 auto 16px' }}>
        <form onSubmit={handleSearchSubmit} className="search-bar-wrap" style={{ margin: 0 }}>
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
            placeholder="Search jobs, rentals, tractors, electricians, or taluka notices..."
            aria-label="Universal Search Query"
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => {
                setLocalQuery('');
                setSearchQuery('');
                setSuggestions([]);
              }}
              style={{ color: 'var(--text-muted)', marginRight: '8px', cursor: 'pointer' }}
              aria-label="Clear search query"
            >
              <X size={16} />
            </button>
          )}
          <button type="submit" className="search-action-btn">
            <span>Search</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Live Search Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
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
              textAlign: 'left',
            }}
          >
            <div style={{ padding: '6px 16px', fontSize: '0.68rem', color: 'var(--brand-electric)', fontWeight: 700, textTransform: 'uppercase' }}>
              Suggestions in Deori
            </div>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(s.text)}
                style={{
                  width: '100%',
                  padding: '9px 16px',
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
      </div>

      {/* Suggested Quick Searches */}
      <div className="quick-search-tags">
        <span className="quick-tag-label">Popular in {selectedArea.name}:</span>
        {POPULAR_QUERIES.map((query, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleTagClick(query)}
            className="quick-tag-chip"
          >
            {query}
          </button>
        ))}
      </div>
    </section>
  );
}
