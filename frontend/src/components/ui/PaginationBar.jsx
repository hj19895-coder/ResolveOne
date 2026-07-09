import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const PAGE_SIZES = [25, 50, 100, 150, 200, 250];

export default function PaginationBar({ page, pageSize, total, setPage, setPageSize }) {
  const [dark, setDark] = useState(false);
  const pages = Math.ceil(total / pageSize);
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, total);

  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

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

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '0 10px', height: 30,
          background: dark ? 'rgba(20,26,46,0.92)' : '#EEE9FF',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#C4B5FD'}`,
          borderRadius: 8,
          fontSize: 12, fontWeight: 500, color: dark ? '#ddd6fe' : '#4318FF',
          cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
      >
        {pageSize}
        <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.5, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div ref={menuRef} style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left,
          zIndex: 999999, minWidth: 90,
          background: dark ? 'rgba(10,14,28,0.96)' : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.85)',
          borderRadius: 14,
          boxShadow: dark ? '0 16px 40px rgba(0,0,0,0.34)' : '0 8px 32px rgba(100,80,200,0.15), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: 5,
          animation: 'dropdownIn 0.14s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <style>{`@keyframes dropdownIn { from{opacity:0;transform:scale(0.96) translateY(-4px)} to{opacity:1;transform:none} }`}</style>
          {PAGE_SIZES.map(s => {
            const isSelected = s === pageSize;
            return (
              <button
                key={s}
                type="button"
                onClick={() => { setPageSize(s); setPage(1); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '5px 10px', borderRadius: 9,
                  fontSize: 12.5, fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? (dark ? '#ddd6fe' : '#4318FF') : (dark ? '#e5e7eb' : '#2D1F6E'),
                  background: isSelected ? (dark ? 'rgba(167,139,250,0.14)' : 'rgba(100,80,200,0.1)') : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = dark ? 'rgba(167,139,250,0.1)' : 'rgba(100,80,200,0.06)'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                  background: isSelected ? (dark ? 'rgba(167,139,250,0.18)' : 'rgba(67,24,255,0.15)') : (dark ? 'rgba(167,139,250,0.08)' : 'rgba(100,80,200,0.07)'),
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected
                    ? <svg width="10" height="10" fill="none" stroke={dark ? '#ddd6fe' : '#4318FF'} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    : <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: dark ? 'rgba(226,232,240,0.5)' : 'rgba(100,80,200,0.45)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  }
                </span>
                {s}
              </button>
            );
          })}
        </div>,
        document.body
      )}

      <span style={{ fontSize: 12, fontWeight: 500, color: dark ? '#94a3b8' : '#6B7280', whiteSpace: 'nowrap' }}>
        {rangeFrom}–{rangeTo} of {total}
      </span>

      <button
        type="button"
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page <= 1}
        style={{
          width: 28, height: 28, borderRadius: 8, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#C4B5FD'}`,
          background: page <= 1 ? (dark ? 'rgba(20,26,46,0.7)' : 'rgba(220,215,255,0.3)') : (dark ? 'rgba(20,26,46,0.92)' : '#EEE9FF'),
          color: page <= 1 ? (dark ? '#64748b' : '#C4B5FD') : (dark ? '#ddd6fe' : '#4318FF'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: page <= 1 ? 'not-allowed' : 'pointer',
          fontSize: 16, lineHeight: 1, opacity: page <= 1 ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
        aria-label="Previous page"
      >
        ‹
      </button>

      <button
        type="button"
        onClick={() => setPage(p => Math.min(pages, p + 1))}
        disabled={page >= pages}
        style={{
          width: 28, height: 28, borderRadius: 8, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#C4B5FD'}`,
          background: page >= pages ? (dark ? 'rgba(20,26,46,0.7)' : 'rgba(220,215,255,0.3)') : (dark ? 'rgba(20,26,46,0.92)' : '#EEE9FF'),
          color: page >= pages ? (dark ? '#64748b' : '#C4B5FD') : (dark ? '#ddd6fe' : '#4318FF'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: page >= pages ? 'not-allowed' : 'pointer',
          fontSize: 16, lineHeight: 1, opacity: page >= pages ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
