import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import EmptyState from '../ui/EmptyState';
import { TICKET_COLUMNS } from '../../config/ticketColumns';
import { getSlaCountdownFromTicket } from '../../utils/sla';



import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const isDashboardDark = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.dashboardTheme === 'dark';

/* ─── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  accent:      '#5B4FE8',
  font: '"Poppins", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  accentLight: 'rgba(91,79,232,0.08)',
  border:      'rgba(220,215,255,0.4)',
  borderRow:   '#EBEBF5',
  hdrBg:       'rgba(250,249,255,0.97)',
  rowHover:    'rgba(248,247,255,0.85)',
  text1:       '#111827',
  text2:       '#6B7280',
  text3:       '#9CA3AF',
  radius:      14,
  radiusSm:    9,
};



/* ─── iOS-style checkbox ─────────────────────────────────────────────────── */
function IOSCheckbox({ checked, indeterminate = false, onChange, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick?.(); }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 18, height: 18, flexShrink: 0, cursor: 'pointer',
        position: 'relative',
      }}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange ?? (() => {})}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span style={{
        width: 16,
        height: 16,
        borderRadius: 5,

        border: checked || indeterminate
          ? '1px solid rgba(34,197,94,0.25)'
          : '1.5px solid rgba(148,163,184,0.45)',

        background: checked || indeterminate
          ? 'linear-gradient(135deg, #22c55e, #16a34a)'
          : 'rgba(255,255,255,0.85)',

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        transition:
          'background 0.18s ease, border 0.18s ease, transform 0.15s ease',

        boxShadow: checked || indeterminate
          ? `
            inset 0 1px 0 rgba(255,255,255,0.25),
            0 2px 5px rgba(34,197,94,0.18)
            `
          : `
            inset 0 1px 2px rgba(0,0,0,0.04)
            `,

        flexShrink: 0,
      }}>
        {checked && !indeterminate && (
          <svg width="9" height="9" fill="none" stroke="#fff" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {indeterminate && (
          <svg width="9" height="2" viewBox="0 0 9 2" fill="none">
            <rect x="0" y="0" width="9" height="2" rx="1" fill="white" />
          </svg>
        )}
      </span>
    </label>
  );
}

/* ─── Avatar gradient palette ─────────────────────────────────────────────── */
function avatarGrad(name = '') {
  const SHADES = ['#CBD5E1','#94A3B8','#64748B','#475569','#334155'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return SHADES[Math.abs(h) % SHADES.length];
}

/* ─── Status helpers ──────────────────────────────────────────────────────── */
function getStatusStyle(value = '', dark = false) {
  const u = value.toUpperCase().replace(/[-\s]+/g, '_');
  if (u.includes('OPEN')) {
    return dark
      ? { bg: 'rgba(59,130,246,0.14)', color: '#bfdbfe', dot: '#60a5fa', ring: 'rgba(59,130,246,0.34)' }
      : { bg: 'rgba(59,130,246,0.09)', color: '#1d4ed8', dot: '#3b82f6', ring: 'rgba(59,130,246,0.2)' };
  }
  if (u.includes('IN_PROGRESS')) {
    return dark
      ? { bg: 'rgba(245,158,11,0.14)', color: '#fde68a', dot: '#fbbf24', ring: 'rgba(245,158,11,0.34)' }
      : { bg: 'rgba(245,158,11,0.09)', color: '#92400e', dot: '#f59e0b', ring: 'rgba(245,158,11,0.22)' };
  }
  if (u.includes('ON_HOLD')) {
    return dark
      ? { bg: 'rgba(148,163,184,0.14)', color: '#e2e8f0', dot: '#cbd5e1', ring: 'rgba(148,163,184,0.28)' }
      : { bg: 'rgba(148,163,184,0.12)', color: '#374151', dot: '#94a3b8', ring: 'rgba(148,163,184,0.25)' };
  }
  if (u.includes('RESOLVED')) {
    return dark
      ? { bg: 'rgba(16,185,129,0.14)', color: '#a7f3d0', dot: '#34d399', ring: 'rgba(16,185,129,0.32)' }
      : { bg: 'rgba(16,185,129,0.09)', color: '#065f46', dot: '#10b981', ring: 'rgba(16,185,129,0.2)' };
  }
  if (u.includes('CLOSED')) {
    return dark
      ? { bg: 'rgba(34,197,94,0.14)', color: '#bbf7d0', dot: '#4ade80', ring: 'rgba(34,197,94,0.32)' }
      : { bg: 'rgba(34,197,94,0.09)', color: '#14532d', dot: '#22c55e', ring: 'rgba(34,197,94,0.2)' };
  }
  return dark
    ? { bg: 'rgba(148,163,184,0.14)', color: '#e2e8f0', dot: '#cbd5e1', ring: 'rgba(148,163,184,0.28)' }
    : { bg: 'rgba(148,163,184,0.1)', color: '#374151', dot: '#94a3b8', ring: 'rgba(148,163,184,0.2)' };
}

/* ─── Priority helpers ────────────────────────────────────────────────────── */
function isOpenOrInProgressStatus(statusValue = '') {
  const u = statusValue.toUpperCase().replace(/[-\s]+/g, '_');
  return u.includes('OPEN') || u.includes('IN_PROGRESS');
}

function getPriorityStyle(raw = '', statusValue = '') {
  const active = isOpenOrInProgressStatus(statusValue);
  if (!active) {
    return { color: '#374151', dot: '#94a3b8', glow: null, blink: false };
  }
  const u = raw.toUpperCase().replace(/[-\s]+/g, '_');
  if (u.includes('P1') || u.includes('CRITICAL'))
    return { color: '#b91c1c',   dot: '#ef4444', glow: 'rgba(239,68,68,0.7)',  blink: true  };
  if (u.includes('P2') || u.includes('HIGH'))
    return { color: '#92400e', dot: '#f59e0b', glow: 'rgba(245,158,11,0.6)', blink: true  };
  if (u.includes('P3') || u.includes('MEDIUM'))
    return { color: '#065f46',  dot: '#10b981', glow: null,                   blink: false };
  return { color: '#374151',  dot: '#94a3b8', glow: null, blink: false };
}

/* ─── Date formatters ─────────────────────────────────────────────────────── */
function shortId(id = '') {
  const s = String(id);
  return s.length <= 6 ? s : s.slice(0, 8).toUpperCase();
}
function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return '—'; }
}
function stripHtml(html = '') {
  if (!html) return '';
  return html
    .replace(/<\/?(p|div|br|li|ul|ol|h[1-6])[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ').trim();
}
function computeElapsed(startStr, endStr) {
  if (!startStr) return '—';
  const start = new Date(startStr);
  if (Number.isNaN(start.getTime())) return '—';
  const end = endStr ? new Date(endStr) : new Date();
  if (Number.isNaN(end.getTime())) return '—';
  const mins = Math.floor(Math.max(0, end - start) / 60000);
  const days = Math.floor(mins / 1440), hrs = Math.floor((mins % 1440) / 60), m = mins % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hrs  > 0) parts.push(`${hrs}h`);
  if (m > 0 || !parts.length) parts.push(`${m}m`);
  return parts.join(' ');
}
function renderMasterLabel(value) {
  if (!value) return '—';
  if (typeof value === 'object') return value?.label ?? value?.value ?? value?.name ?? '—';
  return value || '—';
}

/* ─── Global CSS ──────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
  @keyframes ticketDotBlink { 0%,100%{opacity:1} 50%{opacity:0.18} }
  .tkt-blink { animation: ticketDotBlink 1.35s ease-in-out infinite; }
  @media (prefers-reduced-motion:reduce) { .tkt-blink{animation:none} }
  @keyframes tktDropIn { from{opacity:0;transform:scale(0.96) translateY(-4px)} to{opacity:1;transform:none} }
  .tkt-dropdown { animation: tktDropIn 0.14s cubic-bezier(0.16,1,0.3,1) both; }
`;

/* ─── AssignCell ──────────────────────────────────────────────────────────── */
function AssignCell({ ticket, onAssign }) {
  const dark = isDashboardDark();
  const [hovered, setHovered] = useState(false);
  const user  = ticket?.assignedTo;
  const name  = user?.name || user?.email || null;
  const inits = name ? String(name).split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() : null;

  if (name) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: avatarGrad(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 500, boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 1px 5px rgba(0,0,0,0.13)' }}>
          {inits}
        </div>
        <span style={{ fontSize: 12, fontWeight: 400, color: dark ? '#e5e7eb' : T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{name}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onAssign?.(ticket); }}
          style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hovered ? T.accentLight : 'transparent', border: `0.5px solid ${hovered ? 'rgba(91,79,232,0.3)' : 'transparent'}`, color: T.accent, cursor: 'pointer', opacity: hovered ? 1 : 0, transition: 'all 0.14s ease', pointerEvents: hovered ? 'auto' : 'none' }}>
          <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onAssign?.(ticket); }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 520, background: hovered ? (dark ? 'rgba(167,139,250,0.12)' : T.accentLight) : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)'), border: `0.5px solid ${hovered ? (dark ? 'rgba(167,139,250,0.28)' : 'rgba(91,79,232,0.28)') : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`, color: hovered ? (dark ? '#ddd6fe' : T.accent) : (dark ? '#94a3b8' : T.text3), cursor: 'pointer', transition: 'all 0.14s ease' }}>
      {hovered ? (<><svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 8v6M23 11h-6" /></svg>Assign</>) : 'Unassigned'}
    </button>
  );
}

/* ─── UserChip ────────────────────────────────────────────────────────────── */
function UserChip({ user, dense = false }) {
  const dark = isDashboardDark();
  if (!user) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, background: dark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.09)', color: dark ? '#cbd5e1' : T.text3, border: `0.5px solid ${dark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.18)'}` }}>Unassigned</span>
  );
  const name  = user?.name || user?.email || String(user?.id || '');
  const inits = String(name).split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const sz = dense ? 20 : 26;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ flexShrink: 0, width: sz, height: sz, borderRadius: '50%', background: avatarGrad(name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: dense ? 9 : 10, fontWeight: 500, boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 1px 5px rgba(0,0,0,0.12)' }}>{inits}</div>
      <span style={{ fontSize: dense ? 12 : 13, fontWeight: 400, color: dark ? '#e5e7eb' : T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: dense ? 80 : 130 }}>{name}</span>
    </div>
  );
}

/* ─── SubjectCell ─────────────────────────────────────────────────────────── */
function SubjectCell({ ticket }) {
  const dark = isDashboardDark();
  const [hovered, setHovered] = useState(false);
  const [pos, setPos]         = useState({ top: 0, bottom: 'auto', left: 0 });
  const cellRef               = useRef(null);
  const subject     = ticket?.subject ?? ticket?.title ?? ticket?.name ?? '—';
  const rawDesc     = ticket?.description ?? ticket?.body ?? ticket?.details ?? null;
  const description = rawDesc ? stripHtml(rawDesc) : null;

  const handleMouseEnter = () => {
    if (!description || !cellRef.current) return;
    const r = cellRef.current.getBoundingClientRect();
    const flipUp = window.innerHeight - r.bottom < 130;
    setPos({ top: flipUp ? 'auto' : r.bottom + 6, bottom: flipUp ? window.innerHeight - r.top + 6 : 'auto', left: Math.min(r.left, window.innerWidth - 320) });
    setHovered(true);
  };

  return (
    <>
      <div ref={cellRef} onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 400, color: dark ? '#f8fafc' : '#272727', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>{subject}</span>
      </div>
      {hovered && description && createPortal(
        <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, zIndex: 999999, width: 300, background: dark ? 'rgba(10,14,28,0.98)' : 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `0.5px solid ${dark ? 'rgba(255,255,255,0.08)' : T.border}`, borderRadius: 13, boxShadow: dark ? '0 16px 40px rgba(0,0,0,0.34)' : '0 8px 36px rgba(80,60,200,0.14)', padding: '11px 14px', pointerEvents: 'none', animation: 'tktDropIn 0.13s cubic-bezier(0.16,1,0.3,1) both' }}>
          <p style={{ fontSize: 11.5, fontWeight: 650, color: dark ? '#f8fafc' : T.text1, marginBottom: 6, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{subject}</p>
          <div style={{ height: '0.5px', background: dark ? 'rgba(167,139,250,0.18)' : 'rgba(91,79,232,0.1)', marginBottom: 7 }} />
          <p style={{ fontSize: 11, color: dark ? '#94a3b8' : T.text2, lineHeight: 1.55, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{description}</p>
        </div>,
        document.body
      )}
    </>
  );
}

/* ─── StatusCell ──────────────────────────────────────────────────────────── */
function StatusCell({ ticket, statuses, onStatusChange }) {
  const dark = isDashboardDark();
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, bottom: 'auto', left: 0 });
  const [optimisticStatus, setOptimisticStatus] = useState(null);
  const btnRef          = useRef(null);
  const statusValue = optimisticStatus?.value 
    ?? ticket.status?.value 
    ?? ticket.status?.name 
    ?? '';
  const s               = getStatusStyle(statusValue, dark);

  useEffect(() => {
    setOptimisticStatus(null);
  }, [ticket.status?.id, ticket.status?.value]);

  const handleOpen = (e) => {
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const dropH = statuses.length * 36 + 52;
      const flipUp = window.innerHeight - r.bottom < dropH + 10;
      setPos(flipUp ? { top: 'auto', bottom: window.innerHeight - r.top + 6, left: r.left } : { top: r.bottom + 6, bottom: 'auto', left: r.left });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!e.target.closest('.tkt-status-menu')) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} type="button" onClick={handleOpen}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px 2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 400, background: s.bg, color: s.color, border: `1px solid ${s.ring}`, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.14s ease', boxShadow: 'none' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
        {statusValue || '—'}
        <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.45, marginLeft: 1 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && createPortal(
        <div className="tkt-dropdown tkt-status-menu" onMouseDown={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, zIndex: 999999, minWidth: 175, background: dark ? 'rgba(10,14,28,0.98)' : 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `0.5px solid ${dark ? 'rgba(255,255,255,0.08)' : T.border}`, borderRadius: 13, boxShadow: dark ? '0 16px 40px rgba(0,0,0,0.34)' : '0 8px 36px rgba(80,60,200,0.16)', padding: 5 }}>
          <div style={{ padding: '4px 10px 7px', borderBottom: `0.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(100,80,200,0.09)'}`, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 750, letterSpacing: '0.09em', textTransform: 'uppercase', color: dark ? '#94a3b8' : 'rgba(80,60,160,0.45)' }}>Change Status</span>
          </div>
          {statuses.map((opt) => {
            const isCur = opt.value === statusValue;
            const os    = getStatusStyle(opt.value || '', dark);
            return (
              <button key={opt.id} type="button" onClick={(e) => { e.stopPropagation(); setOptimisticStatus(opt); onStatusChange?.(ticket, opt); setOpen(false); }}
                onMouseEnter={(e) => { if (!isCur) e.currentTarget.style.background = dark ? 'rgba(167,139,250,0.1)' : 'rgba(91,79,232,0.05)'; }}
                onMouseLeave={(e) => { if (!isCur) e.currentTarget.style.background = 'transparent'; }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 10px', borderRadius: 9, fontSize: 12.5, fontWeight: isCur ? 450 : 350, background: isCur ? (dark ? 'rgba(167,139,250,0.14)' : 'rgba(91,79,232,0.08)') : 'transparent', color: isCur ? (dark ? '#ddd6fe' : T.accent) : (dark ? '#e5e7eb' : T.text1), cursor: 'pointer', textAlign: 'left', border: 'none', transition: 'background 0.1s' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: os.dot, flexShrink: 0 }} />
                {opt.value}
                {isCur && <svg style={{ marginLeft: 'auto', color: T.accent }} width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
/* ─── Minimal header icons (matches the app's thin-stroke SVG style) ────── */
function HeaderIcon({ renderType, colKey }) {
  const common = { width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' };

  if (colKey === 'id' || renderType === 'id') {
    return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" /></svg>;
  }
  if (renderType === 'statusPill') {
    return <svg {...common}><circle cx="12" cy="12" r="8" /><path strokeLinecap="round" d="M9 12l2 2 4-4" /></svg>;
  }
  if (renderType === 'priorityIndicator') {
    return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v18M5 4h10l-2 3.5L15 11H5" /></svg>;
  }
  if (renderType === 'userChip') {
    return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></svg>;
  }
  if (renderType === 'date' || renderType === 'time' || renderType === 'timeAgo' || renderType === 'updatedAt') {
    return <svg {...common}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path strokeLinecap="round" d="M3.5 9.5h17M8 3v3M16 3v3" /></svg>;
  }
  if (renderType === 'slaCountdown' || renderType === 'elapsedTime') {
    return <svg {...common}><circle cx="12" cy="13" r="7.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4l2.5 2M9.5 3h5" /></svg>;
  }
  if (renderType === 'boolean') {
    return <svg {...common}><circle cx="12" cy="12" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.5l2 2 4-4.5" /></svg>;
  }
  if (renderType === 'masterLabel') {
    return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12.5 3.5H7A3.5 3.5 0 0 0 3.5 7v5.5a1 1 0 0 0 .3.7l9 9a1 1 0 0 0 1.4 0l7.3-7.3a1 1 0 0 0 0-1.4l-9-9a1 1 0 0 0-.7-.3z" /><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" /></svg>;
  }
  if (renderType === 'number') {
    return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4L7 20M17 4l-2 16M4 9h16M3.5 15h16" /></svg>;
  }
  if (renderType === 'text' && (colKey === 'subject' || colKey === 'title')) {
    return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" /></svg>;
  }
  return null;
}

/* ─── SortableHeaderCell ──────────────────────────────────────────────────── */
function SortableHeaderCell({ col, widthPx, minPx, isDndDisabled, onResizeStart, sortDirection, onSort }) {
  const dark = isDashboardDark();
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.key, disabled: isDndDisabled });
  const dndStyle = { transform: CSS.Transform.toString(transform), transition: isDragging ? 'none' : transition, opacity: isDragging ? 0.65 : 1, zIndex: isDragging ? 50 : 'auto' };
  const active = !!sortDirection;

  return (
    <th style={{ position: 'relative', padding: 0 }} role="columnheader">
      <div ref={setNodeRef} {...attributes} {...listeners}
        onClick={() => onSort?.(col.key)}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{ width: `${widthPx}px`, minWidth: `${minPx}px`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 13px', height: 34, cursor: isDragging ? 'grabbing' : 'pointer', userSelect: 'none', touchAction: 'none', position: 'relative', ...dndStyle }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, paddingRight: 6 }}>
          <span style={{
            display: 'inline-flex',
            flexShrink: 0,
            color: active ? (dark ? '#ddd6fe' : T.accent) : (dark ? 'rgba(226,232,240,0.5)' : 'rgba(83,88,98,0.55)'),
            transition: 'color 0.15s',
          }}>
            <HeaderIcon renderType={col.renderType} colKey={col.key} />
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: active ? (dark ? '#ddd6fe' : T.accent) : (dark ? 'rgba(226,232,240,0.72)' : '#535862'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>{col.label}</span>          {active ? (
            <svg style={{ flexShrink: 0, color: T.accent }} width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} /></svg>
          ) : (
            <svg style={{ flexShrink: 0, color: dark ? 'rgba(196,181,253,0.35)' : 'rgba(91,79,232,0.3)', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }} width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
          )}
        </div>
        <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 7, zIndex: 30, cursor: 'col-resize' }}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onResizeStart(e, col); }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => e.stopPropagation()}>
          <div style={{ margin: '6px auto', height: 'calc(100% - 12px)', width: 1.5, borderRadius: 2, background: hovered ? 'rgba(91,79,232,0.3)' : 'transparent', transition: 'background 0.15s' }} />
        </div>
      </div>
    </th>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
   Main TicketTable
───────────────────────────────────────────────────────────────────────────── */
export default function TicketTable({
  tickets,
  onAssign,
  onEdit,
  onViewDetails,
  isSuperAdmin,
  onEmpty,
  visibleColumns: visibleColumnsProp,
  columnWidths,
  onColumnWidthsChange,
  onColumnOrderChange,
  sortConfig = { key: null, direction: null },
  onSort,
  statuses = [],
  onStatusChange,
  // Selection props (passed from Tickets.jsx)
  selectedIds,
  onSelectionChange,
  page,
  pageSize,
  total,
  setPage,
  setPageSize,
  loading = false,
}) {
  const [dark, setDark] = useState(() => isDashboardDark());
  useEffect(() => {
    const syncTheme = (e) => {
      const next = e?.detail;
      if (next === 'dark' || next === 'light') {
        setDark(next === 'dark');
        return;
      }
      setDark(isDashboardDark());
    };
    syncTheme();
    window.addEventListener('dashboard-theme-change', syncTheme);
    return () => window.removeEventListener('dashboard-theme-change', syncTheme);
  }, []);
  console.log('TicketTable received:', { 
    ticketsLength: tickets?.length, 
    loading, 
    total,
    isArray: Array.isArray(tickets)
  });
  const minColWidthDefault = 80;

  /* ── Resize ───────────────────────────────────────────────────────────── */
  const onColumnWidthsChangeRef = useRef(onColumnWidthsChange);
  useEffect(() => { onColumnWidthsChangeRef.current = onColumnWidthsChange; }, [onColumnWidthsChange]);
  const activeWidthsRef = useRef({ ...(columnWidths || {}) });
  const resizeStateRef  = useRef({ isResizing: false, colKey: null, startX: 0, startWidth: 0 });
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!resizeStateRef.current.isResizing) activeWidthsRef.current = { ...(columnWidths || {}) };
  }, [columnWidths]);

  const getEffectiveWidthForCol = (col) => {
    const w = activeWidthsRef.current?.[col?.key];
    if (typeof w === 'number' && Number.isFinite(w)) return w;
    return columnWidths?.[col?.key] ?? col.width ?? 180;
  };

  const handleResizeStart = (e, col) => {
    const startX = e.clientX, startWidth = getEffectiveWidthForCol(col);
    const minWidth = Math.max(col.minWidth ?? minColWidthDefault, minColWidthDefault);
    resizeStateRef.current = { isResizing: true, colKey: col.key, startX, startWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    function onMove(ev) {
      const x = ev.clientX ?? ev.touches?.[0]?.clientX;
      if (x == null) return;
      activeWidthsRef.current = { ...activeWidthsRef.current, [col.key]: Math.max(minWidth, startWidth + x - startX) };
      forceRender(v => v + 1);
    }
    function onUp() {
      const fk = resizeStateRef.current.colKey, fw = activeWidthsRef.current?.[fk];
      resizeStateRef.current = { isResizing: false, colKey: null, startX: 0, startWidth: 0 };
      document.body.style.cursor = document.body.style.userSelect = '';
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (fk && typeof fw === 'number') onColumnWidthsChangeRef.current?.({ ...(columnWidths || {}), ...activeWidthsRef.current, [fk]: fw });
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  /* ── DnD ──────────────────────────────────────────────────────────────── */
  const [dndStatus, setDndStatus] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );
  const [localOrder, setLocalOrder] = useState(null);

  const visibleColumns = useMemo(() => {
    const base = Array.isArray(visibleColumnsProp) && visibleColumnsProp.length
      ? visibleColumnsProp
      : TICKET_COLUMNS.filter(c => c?.defaultVisible);
    if (!localOrder) return base;
    const colMap = new Map(base.map(c => [c.key, c]));
    const ordered = localOrder.map(k => colMap.get(k)).filter(Boolean);
    const extras  = base.filter(c => !new Set(localOrder).has(c.key));
    return [...ordered, ...extras];
  }, [visibleColumnsProp, localOrder]);

  const prevVisiblePropRef = useRef(visibleColumnsProp);
  useEffect(() => {
    if (visibleColumnsProp !== prevVisiblePropRef.current) {
      prevVisiblePropRef.current = visibleColumnsProp;
      setLocalOrder(null);
    }
  }, [visibleColumnsProp]);

  const visibleKeys = useMemo(() => visibleColumns.map(c => c.key), [visibleColumns]);

  const handleColumnDragEnd = ({ active, over }) => {
    if (!active?.id || !over?.id) return;
    const aKey = String(active.id), oKey = String(over.id);
    if (aKey === oKey) return;
    const fi = visibleKeys.indexOf(aKey), ti = visibleKeys.indexOf(oKey);
    if (fi < 0 || ti < 0) return;
    const nextVisible = arrayMove(visibleKeys, fi, ti);
    setLocalOrder(nextVisible);
    const fullKeys = TICKET_COLUMNS.map(c => c.key);
    const visSet   = new Set(visibleKeys);
    const merged   = []; let vi = 0;
    for (const key of fullKeys) merged.push(visSet.has(key) ? nextVisible[vi++] : key);
    onColumnOrderChange?.(merged);
  };

  /* ── Selection helpers ────────────────────────────────────────────────── */
  const selSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);
  const allSelected   = tickets.length > 0 && tickets.every(t => selSet.has(t.id));
  const someSelected  = tickets.some(t => selSet.has(t.id));
  const indeterminate = someSelected && !allSelected;

  const toggleAll = () => {
    if (allSelected) onSelectionChange?.([]);
    else onSelectionChange?.(tickets.map(t => t.id));
  };

  const toggleRow = (id) => {
    if (selSet.has(id)) onSelectionChange?.(Array.from(selSet).filter(x => x !== id));
    else onSelectionChange?.([...Array.from(selSet), id]);
  };

  /* ── Cell renderer ────────────────────────────────────────────────────── */
  const renderCell = (ticket, col) => {
    const { key, renderType } = col;

    if (key === 'id' || renderType === 'id') {
      return (
        <button type="button" onClick={(e) => { e.stopPropagation(); onViewDetails?.(ticket); }}
          style={{ display: 'inline-flex', alignItems: 'center', padding: '0px 2px', border: 'none', background: 'transparent', color: dark ? '#94a3b8' : '#6b7280', fontSize: 11.2, fontWeight: 420, fontFamily: 'Inter, -apple-system, sans-serif', letterSpacing: '-0.01em', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.12s' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = dark ? '#c4b5fd' : T.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = dark ? '#94a3b8' : '#6b7280'; }}>
          #{ticket.ticketNumber ?? shortId(ticket.id)}
        </button>
      );
    }

    const cellText = { fontSize: 12, fontWeight: 400, color: dark ? '#e5e7eb' : '#272727', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '22rem', letterSpacing: '0.2px' };

    if (renderType === 'text') {
      if (key === 'subject' || key === 'title') return <SubjectCell ticket={ticket} />;
      return <span style={cellText}>{ticket?.[key] ?? '—'}</span>;
    }

    if (renderType === 'statusPill') return <StatusCell ticket={ticket} statuses={statuses} onStatusChange={onStatusChange} />;

    if (renderType === 'priorityIndicator') {
      const raw = ticket.priority?.value || ticket.priority?.name || '';
      const statusValue = ticket.status?.value || ticket.status?.name || '';
      const ps  = getPriorityStyle(raw, statusValue);
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px 2px 8px', borderRadius: 20, background: dark ? 'rgba(255,255,255,0.04)' : ps.bg, border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
          <span className={ps.blink ? 'tkt-blink' : ''} style={{ width: 7, height: 7, borderRadius: '50%', background: ps.dot, flexShrink: 0, boxShadow: ps.glow ? `0 0 7px ${ps.glow}` : 'none' }} />
          <span style={{ fontSize: 12, fontWeight: 400, color: dark ? '#cbd5e1' : ps.color, whiteSpace: 'nowrap' }}>{raw || '—'}</span>
        </div>
      );
    }

    if (renderType === 'userChip') {
      if (key === 'assignedTo') return <AssignCell ticket={ticket} onAssign={onAssign} />;
      return <UserChip user={ticket?.[key]} dense />;
    }

    if (renderType === 'timeAgo' || renderType === 'updatedAt') {
      const val = renderType === 'updatedAt' ? ticket?.updatedAt : ticket?.[key];
      return <span style={{ fontSize: 11.5, color: dark ? '#94a3b8' : T.text3, whiteSpace: 'nowrap' }}>{fmtDateTime(val)}</span>;
    }
    if (renderType === 'date' || renderType === 'time')
      return <span style={{ fontSize: 11.5, color: dark ? '#cbd5e1' : T.text2, whiteSpace: 'nowrap' }}>{fmtDateTime(ticket?.[key])}</span>;
    if (renderType === 'number')
      return <span style={{ fontSize: 11.5, color: dark ? '#cbd5e1' : T.text2, whiteSpace: 'nowrap' }}>{ticket?.[key] ?? '—'}</span>;
    if (renderType === 'elapsedTime')
      return <span style={{ fontSize: 11.5, color: dark ? '#cbd5e1' : T.text2, whiteSpace: 'nowrap' }}>{computeElapsed(ticket?.createdAt, ticket?.completedDate || ticket?.resolvedDate)}</span>;
    if (renderType === 'boolean') {
      const v = ticket?.[key];
      return <span style={{ fontSize: 11.5, color: dark ? '#cbd5e1' : T.text2 }}>{v === true ? 'Yes' : v === false ? 'No' : '—'}</span>;
    }
    if (renderType === 'slaCountdown') {
      const label = getSlaCountdownFromTicket(ticket);
      if (label === '—') return <span style={{ fontSize: 11.5, color: dark ? '#cbd5e1' : T.text2 }}>—</span>;
      const overdue = label.startsWith('Overdue');
      return <span style={{ fontSize: 11.5, fontWeight: 650, color: overdue ? '#dc2626' : '#059669', whiteSpace: 'nowrap' }}>{label}</span>;
    }
    if (renderType === 'masterLabel')
      return <span style={{ fontSize: 11.5, color: dark ? '#cbd5e1' : T.text2, whiteSpace: 'nowrap' }}>{renderMasterLabel(ticket?.[key])}</span>;
    const v = ticket?.[key];
    return <span style={{ fontSize: 11.5, color: dark ? '#cbd5e1' : T.text2, whiteSpace: 'nowrap' }}>{v ?? '—'}</span>;
  };

  /* ── Empty ────────────────────────────────────────────────────────────── */
  if (!loading && !tickets.length) {
    return (
      <div style={{ padding: '72px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: dark ? 'rgba(167,139,250,0.1)' : 'rgba(91,79,232,0.07)', border: dark ? '0.5px solid rgba(167,139,250,0.2)' : '0.5px solid rgba(91,79,232,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" fill="none" stroke={dark ? 'rgba(196,181,253,0.75)' : 'rgba(91,79,232,0.55)'} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
          </div>
          <EmptyState title="No tickets match your filters" desc="Try adjusting your search or filters above." action={onEmpty} />
        </div>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div aria-live="polite" className="sr-only">{dndStatus}</div>

      {/* ── Top pagination bar ─────────────────────────────────────────
      {total > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '6px 4px 8px',
          borderBottom: `0.5px solid ${T.border}`,
        }}>
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        </div>
      )} */}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div style={{ width: '100%', minHeight: 0, fontFamily: T.font ,background: dark ? 'rgba(10,14,28,0.98)' : '#ffffff' }}>
        <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleColumnDragEnd}>
          <SortableContext items={visibleKeys} strategy={horizontalListSortingStrategy}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto' }}
              onDragStart={(e) => e.preventDefault()}>
              <colgroup>
                <col style={{ width: '44px' }} />
                {visibleColumns.map(col => (
                  <col key={col.key} style={{ width: `${getEffectiveWidthForCol(col)}px` }} />
                ))}
              </colgroup>

              <thead style={{ position: 'sticky', top: 0, zIndex: 999, background: dark ? 'rgba(10,14,28,0.98)' : '#F9FAFB' }}>
                <tr style={{ background: dark ? 'rgba(10,14,28,0.98)' : '#f1f1f1', borderBottom: `0.5px solid ${dark ? 'rgba(255,255,255,0.08)' : '#E9EAEB'}` }}>
                  <th style={{ padding: 0, width: 44 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34, paddingLeft: 12 }}>
                      <IOSCheckbox
                        checked={allSelected}
                        indeterminate={indeterminate}
                        onClick={toggleAll}
                      />
                    </div>
                  </th>
                  {visibleColumns.map(col => (
                    <SortableHeaderCell
                      key={col.key}
                      col={col}
                      widthPx={getEffectiveWidthForCol(col)}
                      minPx={Math.max(col.minWidth ?? minColWidthDefault, minColWidthDefault)}
                      isDndDisabled={resizeStateRef.current.isResizing}
                      onResizeStart={handleResizeStart}
                      sortDirection={sortConfig?.key === col.key ? sortConfig.direction : null}
                      onSort={onSort}
                    />
                  ))}
                </tr>
              </thead>

              <tbody>
                {tickets.map((t) => {
                  const isSelected = selSet.has(t.id);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onViewDetails?.(t)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? (dark ? 'rgba(167,139,250,0.08)' : 'rgba(91,79,232,0.04)') : 'transparent',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isSelected ? (dark ? 'rgba(167,139,250,0.08)' : 'rgba(91,79,232,0.04)') : 'transparent';
                      }}
                    >
                      <td style={{ padding: 0, verticalAlign: 'middle', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#E9EAEB'}`, width: 44 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0 0 12px' }}>
                          <IOSCheckbox
                            checked={isSelected}
                            onClick={() => toggleRow(t.id)}
                          />
                        </div>
                      </td>
                      {visibleColumns.map(col => {
                        const width = getEffectiveWidthForCol(col);
                        const minW  = Math.max(col.minWidth ?? minColWidthDefault, minColWidthDefault);
                        return (
                          <td key={col.key} style={{ padding: 0, verticalAlign: 'middle', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#E9EAEB'}` }}>
                            <div style={{ width: `${width}px`, minWidth: `${minW}px`, boxSizing: 'border-box', padding: '7px 13px', display: 'flex', alignItems: 'center' }}>
                              {renderCell(t, col)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}
