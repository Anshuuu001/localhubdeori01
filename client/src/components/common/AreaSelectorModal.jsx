import React from 'react';
import { useApp } from '../../context/AppContext';
import { MapPin, X, Check, ShieldCheck } from 'lucide-react';

export default function AreaSelectorModal() {
  const {
    isAreaModalOpen,
    setIsAreaModalOpen,
    selectedArea,
    setSelectedArea,
    areasList,
  } = useApp();

  if (!isAreaModalOpen) return null;

  const handleSelect = (area) => {
    setSelectedArea(area);
    setIsAreaModalOpen(false);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => setIsAreaModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="area-modal-title"
    >
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" id="area-modal-title">
            <MapPin size={20} style={{ color: 'var(--brand-electric)' }} />
            <span>Select Deori Taluka Area</span>
          </div>
          <button
            onClick={() => setIsAreaModalOpen(false)}
            className="header-btn"
            aria-label="Close area selector"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--surface-border-subtle)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={18} style={{ color: 'var(--brand-electric)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              <strong>Privacy & Battery Friendly:</strong> LocalHub X relies on deliberate local selection rather than continuous background GPS tracking.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {areasList.map((area) => {
              const isSelected = selectedArea.id === area.id;
              return (
                <button
                  key={area.id}
                  onClick={() => handleSelect(area)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--brand-glow)' : 'var(--surface-card)',
                    border: `1px solid ${isSelected ? 'var(--brand-electric)' : 'var(--surface-border)'}`,
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                      {area.name} <span style={{ color: 'var(--brand-electric)', fontSize: '0.8rem' }}>({area.marathi})</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {area.type} • {area.distanceKmNote}
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
