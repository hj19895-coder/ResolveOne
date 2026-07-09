import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function FilterDropdown({ value, onChange, options, placeholder, multi = false }) {
  const [dark, setDark] = useState(false);
  const [open, setOpen]       = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const btnRef                = useRef(null);
  const menuRef               = useRef(null);

  useEffect(() => {
    const syncTheme = (e) => {
      const next = e?.detail;
      if (next === 'dark' || next === 'light') {
        setDark(next === 'dark');
        return;
      }
      setDark(typeof document !== 'undefined' && document.documentElement.dataset.dashboardTheme === 'dark');
    };
    syncTheme();
    window.addEventListener('dashboard-theme-change', syncTheme);
    return () => window.removeEventListener('dashboard-theme-change', syncTheme);
  }, []);

  // Normalise: multi uses string[], single uses string
  const selectedIds = multi
    ? (Array.isArray(value) ? value.map(String) : [])
    : (value ? [String(value)] : []);

  const hasValue = selectedIds.length > 0;

  // Close on outside click — watches both trigger and portal menu
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current  && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(v => !v);
  };

  const handleSelect = (id) => {
    const sid = String(id);
    if (multi) {
      const next = selectedIds.includes(sid)
        ? selectedIds.filter(x => x !== sid)
        : [...selectedIds, sid];
      onChange(next);
      // keep open for multi
    } else {
      onChange(sid);
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange(multi ? [] : '');
    setOpen(false);
  };

  // Trigger label
  const triggerLabel = (() => {
    if (!hasValue) return placeholder;
    if (multi) {
      if (selectedIds.length === 1) {
        const opt = options.find(o => String(o.id) === selectedIds[0]);
        return opt?.value ?? placeholder;
      }
      return placeholder; // show badge for count
    }
    const opt = options.find(o => String(o.id) === selectedIds[0]);
    return opt?.value ?? placeholder;
  })();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '0 10px', height: 30,
          background: hasValue ? (dark ? 'rgba(167,139,250,0.14)' : '#EEE9FF') : (dark ? 'rgba(20,26,46,0.92)' : '#F4F7FE'),
          border: `1px solid ${hasValue ? (dark ? 'rgba(196,181,253,0.35)' : '#C4B5FD') : (dark ? 'rgba(255,255,255,0.1)' : '#E0E5F2')}`,
          borderRadius: 8,
          fontSize: 12, fontWeight: 500,
          color: hasValue ? (dark ? '#ddd6fe' : '#4318FF') : (dark ? '#cbd5e1' : '#1B2559'),
          cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
      >
        <span>{triggerLabel}</span>

        {/* Count badge for multi with 2+ selections */}
        {multi && selectedIds.length > 1 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 16, height: 16, borderRadius: 20,
            background: '#4318FF', color: '#fff',
            fontSize: 10, fontWeight: 700, padding: '0 4px',
          }}>
            {selectedIds.length}
          </span>
        )}

        <svg
          width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style={{ opacity: 0.45, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <>
          <style>{`@keyframes dropdownIn{from{opacity:0;transform:scale(0.96) translateY(-4px)}to{opacity:1;transform:none}}`}</style>
          <div
            ref={menuRef}
            style={{
              position: 'fixed', top: dropPos.top, left: dropPos.left,
              zIndex: 999999, minWidth: 170,
              background: dark ? 'rgba(10,14,28,0.96)' : 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.85)',
              borderRadius: 14,
              boxShadow: dark ? '0 16px 40px rgba(0,0,0,0.34)' : '0 8px 32px rgba(100,80,200,0.15), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              padding: 5,
              animation: 'dropdownIn 0.14s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Clear row */}
            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '5px 10px', borderRadius: 9,
                fontSize: 12, fontWeight: 500,
                color: dark ? '#a5b4fc' : 'rgba(80,60,160,0.65)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                transition: 'background 0.1s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = dark ? 'rgba(167,139,250,0.12)' : 'rgba(100,80,200,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <span style={{
                width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                background: dark ? 'rgba(167,139,250,0.12)' : 'rgba(100,80,200,0.08)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="8" height="8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              {placeholder}
            </button>

            <div style={{ height: 1, background: 'rgba(100,80,200,0.08)', margin: '3px 4px' }} />

            {options.map((opt) => {
              const isSelected = selectedIds.includes(String(opt.id));
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '5px 10px', borderRadius: 9,
                    fontSize: 12.5, fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? (dark ? '#ddd6fe' : '#4318FF') : (dark ? '#e5e7eb' : '#2D1F6E'),
                    background: isSelected ? (dark ? 'rgba(167,139,250,0.14)' : 'rgba(100,80,200,0.08)') : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = dark ? 'rgba(167,139,250,0.1)' : 'rgba(100,80,200,0.06)'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isSelected ? (dark ? 'rgba(167,139,250,0.14)' : 'rgba(100,80,200,0.08)') : 'transparent'; }}
                >
                  {/* Checkbox for multi, icon box for single */}
                  {multi ? (
                    <span style={{
                      width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                      border: `1.5px solid ${isSelected ? (dark ? '#a78bfa' : '#4318FF') : 'rgba(100,80,200,0.3)'}`,
                      background: isSelected ? (dark ? '#a78bfa' : '#4318FF') : (dark ? '#10172a' : '#fff'),
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.14s',
                      boxShadow: isSelected ? (dark ? '0 0 0 3px rgba(167,139,250,0.18)' : '0 0 0 3px rgba(67,24,255,0.12)') : 'none',
                    }}>
                      {isSelected && (
                        <svg width="8" height="8" fill="none" stroke="#fff" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  ) : (
                    <span style={{
                      width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                      background: isSelected ? (dark ? 'rgba(167,139,250,0.18)' : 'rgba(67,24,255,0.15)') : (dark ? 'rgba(167,139,250,0.08)' : 'rgba(100,80,200,0.07)'),
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected
                        ? <svg width="9" height="9" fill="none" stroke="#4318FF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        : <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'rgba(100,80,200,0.45)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      }
                    </span>
                  )}
                  {opt.value}
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
