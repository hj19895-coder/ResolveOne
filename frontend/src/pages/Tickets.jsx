import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useMasterData } from '../hooks/Usemasterdata';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TicketTable from '../components/tickets/TicketTable';
import MergeTicketModal from '../components/tickets/MergeTicketModal'; // ← NEW
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getSlaDeadlineFromTicket } from '../utils/sla';
import { TICKET_COLUMNS } from '../config/ticketColumns';
import TableColumnSettingsModal from '../components/table/TableColumnSettingsModal';
import FilterDropdown from '../components/ui/FilterDropdown';
import * as XLSX from "xlsx";
import PaginationBar from '../components/ui/PaginationBar';
import Toast from '../components/ui/Toast'; 



/* ─── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  surface:       'rgba(255,255,255,0.82)',
  surfaceSolid:  '#ffffff',
  border:        'rgba(220,215,255,0.45)',
  borderStrong:  'rgba(180,170,255,0.55)',
  accent:        '#5B4FE8',
  accentLight:   'rgba(91,79,232,0.08)',
  accentMid:     'rgba(91,79,232,0.18)',
  textPrimary:   '#111827',
  textSecondary: '#6B7280',
  textTertiary:  '#9CA3AF',
  danger:        '#DC2626',
  dangerLight:   'rgba(220,38,38,0.07)',
  radius:        14,
  radiusSm:      9,
  blur:          'blur(24px) saturate(180%)',
  shadow:        '0 4px 28px rgba(80,60,200,0.09), 0 1.5px 4px rgba(0,0,0,0.04)',
};

function statusNeedsResolution(statusOption) {
  const raw = String(statusOption?.value ?? statusOption?.name ?? "")
    .toLowerCase()
    .replace(/[\s_]/g, "");
  return raw === "closed" || raw === "resolved" || raw === "confirmationawaiting";
}

const isDashboardDark = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.dashboardTheme === 'dark';

const pillBase = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  height: 30, padding: '0 11px', borderRadius: T.radiusSm,
  fontSize: 12, fontWeight: 550, cursor: 'pointer',
  border: `0.5px solid ${T.border}`, background: '#FDFCFF',
  color: T.textSecondary, whiteSpace: 'nowrap',
  transition: 'all 0.15s ease', outline: 'none',
};

/* ─── Icons ───────────────────────────────────────────────────────────────── */
function Divider() {
  return <div style={{ width: 1, height: 18, background: T.border, flexShrink: 0, borderRadius: 1 }} />;
}
function SearchIcon() {
  return <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
function XIcon() {
  return <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>;
}
function ColumnsIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>;
}
function ChevronDown() {
  return <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>;
}

/* ─── Export helpers (unchanged) ──────────────────────────────────────────── */
function extractVal(field) {
  if (field === null || field === undefined) return '';
  if (typeof field !== 'object') return String(field);
  return field.label ?? field.name ?? field.value ?? field.title ?? '';
}
function extractUser(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.name ?? field.fullName ?? field.email ?? field.label ?? '';
}
function fmtDate(val) {
  if (!val) return '';

  const d = new Date(val);

  if (isNaN(d.getTime())) return '';

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();

  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12;


  return `${month}/${day}/${year} ${hours}:${mins} ${ampm}`;
}
function flattenTicket(r) {
  return {
    'ID':                      String(r.ticketNumber ?? r.ticket_number ?? r.ticketId ?? r.id ?? ''),
    'Subject':                 String(r.subject ?? r.title ?? ''),
    'Status':                  extractVal(r.status),
    'Priority':                extractVal(r.priority),
    'Assigned To':             extractUser(r.assignedTo),
    'Created By':              extractUser(r.createdBy),
    'Created Date':            fmtDate(r.createdAt),
    'Assigned On':             fmtDate(r.assignedOn),
    'Completed Date':          fmtDate(r.completedDate),
    'Resolved Date':           fmtDate(r.resolvedDate),
    'Due Date':                fmtDate(r.dueDate),
    'Last Update':             fmtDate(r.updatedAt),
    'TAT':                     String(r.tat ?? ''),
    'Time Elapsed':            String(r.timeElapsed ?? ''),
    'Response Due By Time':    String(r.responseDueByTime ?? ''),
    'Estimated TAT (Hrs)':     String(r.estimatedTatHrs ?? ''),
    'Category':                extractVal(r.category),
    'Subcategory':             extractVal(r.subcategory),
    'Item':                    extractVal(r.item),
    'Ticket Type':             extractVal(r.ticketType),
    'Root Cause Category':     extractVal(r.rootCauseCategory),
    'Severity':                extractVal(r.severity),
    'Source':                  extractVal(r.source),
    'Level':                   extractVal(r.level),
    'Group':                   extractVal(r.group),
    'Requester Name':          String(r.requesterName ?? ''),
    'Client Name':             extractVal(r.clientName),
    'Raised By':               extractVal(r.raisedBy),
    'Department':              extractVal(r.department),
    'Site':                    extractVal(r.site),
    'Reopened':                r.reopened ? 'Yes' : 'No',
    'Remarks':                 String(r.remarks ?? ''),
    'SLA':                     extractVal(r.sla),
    'Client Confirmation':     extractVal(r.clientConfirmation),
    'Resolved At':             fmtDate(r.resolvedAt),
    'Client Closure Comments': String(r.clientClosureComments ?? ''),
  };
}
function getExportRows(rows, visibleColumns) {
  if (!rows.length) return [];
  const visibleLabels = new Set(visibleColumns.map(c => c.label));
  return rows.map(r => {
    const flat = flattenTicket(r);
    return Object.fromEntries(Object.entries(flat).filter(([k]) => visibleLabels.has(k)));
  });
}
function downloadFile(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─── Export Modal (unchanged) ────────────────────────────────────────────── */
const EXPORT_FORMATS = [
  { id: 'csv',  label: 'CSV',  icon: '📋' },
  { id: 'xls',  label: 'XLS',  icon: '📊' },
  { id: 'html', label: 'HTML', icon: '🌐' },
  { id: 'pdf',  label: 'PDF',  icon: '📄' },
];

function ExportModal({ open, onClose, selectedCount, totalCount, onExport, dark }) {
  const [format, setFormat] = useState('csv');
  const [scope,  setScope]  = useState(selectedCount > 0 ? 'selected' : 'all');

  useEffect(() => {
    if (open) setScope(selectedCount > 0 ? 'selected' : 'all');
  }, [open, selectedCount]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(30,24,60,0.18)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: dark ? 'rgba(10,14,28,0.96)' : '#fff',
        border: dark ? '0.5px solid rgba(255,255,255,0.08)' : '0.5px solid rgba(220,215,255,0.6)',
        borderRadius: 16,
        boxShadow: dark
          ? '0 20px 60px rgba(0,0,0,0.34), 0 4px 16px rgba(0,0,0,0.12)'
          : '0 20px 60px rgba(80,60,200,0.18), 0 4px 16px rgba(0,0,0,0.08)',
        width: 340,
        overflow: 'hidden',
        animation: 'tktModalIn 0.18s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        <style>{`@keyframes tktModalIn{from{opacity:0;transform:scale(0.95) translateY(-8px)}to{opacity:1;transform:none}}`}</style>

        <div style={{ padding: '16px 18px 14px', borderBottom: dark ? '0.5px solid rgba(255,255,255,0.08)' : '0.5px solid rgba(220,215,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 650, color: dark ? '#f8fafc' : '#111827', margin: 0 }}>Export Tickets</h3>
            <p style={{ fontSize: 11.5, color: dark ? '#94a3b8' : T.textTertiary, margin: '2px 0 0' }}>
              {scope === 'selected' && selectedCount > 0
                ? `${selectedCount} ticket${selectedCount > 1 ? 's' : ''} selected`
                : `All ${totalCount} tickets`}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(220,215,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? '#cbd5e1' : T.textSecondary }}
            onMouseEnter={(e) => e.currentTarget.style.background = dark ? 'rgba(167,139,250,0.12)' : 'rgba(91,79,232,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(220,215,255,0.3)'}>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {selectedCount > 0 && (
          <div style={{ padding: '12px 18px 0' }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: dark ? '#94a3b8' : T.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Export scope</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { val: 'selected', label: `Selected (${selectedCount})` },
                { val: 'all',      label: `All (${totalCount})` },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => setScope(opt.val)}
                  style={{
                    flex: 1, padding: '7px 12px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 550, cursor: 'pointer',
                    background: scope === opt.val ? (dark ? 'rgba(167,139,250,0.14)' : 'rgba(91,79,232,0.09)') : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(248,246,255,0.7)'),
                    border: `0.5px solid ${scope === opt.val ? (dark ? 'rgba(167,139,250,0.38)' : 'rgba(91,79,232,0.4)') : (dark ? 'rgba(255,255,255,0.08)' : T.border)}`,
                    color: scope === opt.val ? (dark ? '#ddd6fe' : T.accent) : (dark ? '#cbd5e1' : T.textSecondary),
                    transition: 'all 0.14s',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '14px 18px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: dark ? '#94a3b8' : T.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Format</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {EXPORT_FORMATS.map(f => (
              <label key={f.id}
                onClick={() => setFormat(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: format === f.id ? (dark ? 'rgba(167,139,250,0.12)' : 'rgba(91,79,232,0.07)') : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(248,246,255,0.6)'),
                  border: `0.5px solid ${format === f.id ? (dark ? 'rgba(167,139,250,0.35)' : 'rgba(91,79,232,0.35)') : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(220,215,255,0.5)' )}`,
                  transition: 'all 0.14s',
                }}
                onMouseEnter={(e) => { if (format !== f.id) e.currentTarget.style.background = dark ? 'rgba(167,139,250,0.08)' : 'rgba(91,79,232,0.04)'; }}
                onMouseLeave={(e) => { if (format !== f.id) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(248,246,255,0.6)'; }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `1.5px solid ${format === f.id ? (dark ? '#a78bfa' : T.accent) : (dark ? 'rgba(167,139,250,0.55)' : 'rgba(180,170,255,0.6)' )}`,
                  background: format === f.id ? (dark ? '#a78bfa' : T.accent) : (dark ? 'rgba(255,255,255,0.05)' : '#fff'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: format === f.id ? (dark ? '0 0 0 3px rgba(167,139,250,0.18)' : '0 0 0 3px rgba(91,79,232,0.12)') : 'none',
                  transition: 'all 0.14s',
                }}>
                  {format === f.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </span>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{f.icon}</span>
                <span style={{ fontSize: 13, fontWeight: format === f.id ? 600 : 450, color: format === f.id ? (dark ? '#f8fafc' : '#111827') : (dark ? '#cbd5e1' : T.textSecondary), flex: 1 }}>{f.label}</span>
                {format === f.id && (
                  <svg width="14" height="14" fill="none" stroke={dark ? '#a78bfa' : T.accent} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                )}
              </label>
            ))}
          </div>
        </div>

        <div style={{ padding: '10px 18px 16px', borderTop: dark ? '0.5px solid rgba(255,255,255,0.08)' : '0.5px solid rgba(220,215,255,0.35)', display: 'flex', gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, height: 36, borderRadius: T.radiusSm, border: dark ? '0.5px solid rgba(255,255,255,0.08)' : `0.5px solid ${T.border}`, background: dark ? 'rgba(255,255,255,0.06)' : '#fff', color: dark ? '#cbd5e1' : T.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.background = dark ? 'rgba(167,139,250,0.08)' : 'rgba(248,246,255,0.9)'}
            onMouseLeave={(e) => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#fff'}>
            Cancel
          </button>
          <button
            onClick={async () => { await onExport({ format, scope }); onClose(); }}
            style={{ flex: 1, height: 36, borderRadius: T.radiusSm, border: 'none', background: 'linear-gradient(135deg,#5B4FE8,#7C6FF0)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 12px rgba(91,79,232,0.3)', transition: 'box-shadow 0.14s' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 20px rgba(91,79,232,0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 3px 12px rgba(91,79,232,0.3)'}>
            Export
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TicketResolutionModal({ open, onClose, onSubmit, saving, dark, error }) {
  const [details, setDetails] = useState('');
  const isValid = details.trim().length > 0;

  {error && (
    <div style={{
      fontSize: 12, color: '#DC2626',
      background: dark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.07)',
      border: `0.5px solid ${dark ? 'rgba(248,113,113,0.18)' : 'rgba(220,38,38,0.2)'}`,
      borderRadius: 8, padding: '7px 10px', marginBottom: 12,
    }}>
      {error}
    </div>
  )}

  useEffect(() => {
    if (open) setDetails('');
  }, [open]);

  if (!open) return null;

  return createPortal(

    
    <div

    
      onClick={() => !saving && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto',
          background: dark ? 'rgba(10,14,28,0.98)' : '#fff',
          border: dark ? '0.5px solid rgba(255,255,255,0.08)' : `0.5px solid ${T.border}`,
          borderRadius: 16,
          boxShadow: dark
            ? '0 24px 64px rgba(0,0,0,0.4)'
            : '0 24px 64px rgba(80,60,200,0.2)',
          padding: 22,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: dark ? '#f8fafc' : T.textPrimary, marginBottom: 4 }}>
          Resolution required
        </div>
        <div style={{ fontSize: 12.5, color: dark ? '#94a3b8' : T.textTertiary, marginBottom: 16 }}>
          Please add resolution details before changing the status.
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: dark ? '#94a3b8' : T.textTertiary, marginBottom: 7 }}>
          Resolution Details *
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe the resolution, root cause, and work performed…"
          rows={6}
          style={{
            width: '100%', border: dark ? '0.5px solid rgba(255,255,255,0.1)' : `0.5px solid ${T.border}`,
            borderRadius: T.radiusSm, background: dark ? 'rgba(255,255,255,0.04)' : '#FDFCFF',
            padding: '9px 11px', fontSize: 13, color: dark ? '#e5e7eb' : T.textPrimary,
            outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ height: 34, padding: '0 14px', borderRadius: T.radiusSm, border: dark ? '0.5px solid rgba(255,255,255,0.1)' : `0.5px solid ${T.border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#fff', color: dark ? '#cbd5e1' : T.textSecondary, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={() => isValid && onSubmit(details.trim())}
            disabled={saving || !isValid}
            style={{
              height: 34, padding: '0 16px', borderRadius: T.radiusSm, border: 'none',
              background: (saving || !isValid) ? (dark ? 'rgba(91,79,232,0.4)' : 'rgba(91,79,232,0.5)') : 'linear-gradient(135deg,#5B4FE8,#7C6FF0)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: (saving || !isValid) ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Submit & Update Status'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Actions Dropdown (unchanged) ───────────────────────────────────────── */
function ActionsDropdown({ dark, onMerge, onExportClick }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef          = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!e.target.closest('.tkt-actions-menu')) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 5, left: r.left });
    }
    setOpen(v => !v);
  };

  const MENU_ITEMS = [
    {
      id: 'merge', label: 'Merge',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
      desc: 'Merge selected tickets',
      danger: false, disabled: false,
      action: () => { setOpen(false); onMerge?.(); },
    },
    {
      id: 'export', label: 'Export',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      desc: 'Export tickets',
      danger: false, disabled: false,
      action: () => { setOpen(false); onExportClick?.(); },
    },
  ];

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        style={{
          ...pillBase,
          background: open
            ? (dark ? 'rgba(167,139,250,0.14)' : T.accentLight)
            : (dark ? 'rgba(20,26,46,0.92)' : 'rgba(248,246,255,0.9)'),
          border: `0.5px solid ${open
            ? (dark ? 'rgba(167,139,250,0.38)' : 'rgba(91,79,232,0.4)')
            : (dark ? 'rgba(255,255,255,0.1)' : T.border)}`,
          color: open ? (dark ? '#ddd6fe' : T.accent) : (dark ? '#cbd5e1' : T.textSecondary),
          position: 'relative',
        }}>
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Actions
        <ChevronDown />
      </button>

      {open && createPortal(
        <div
          className="tkt-actions-menu tkt-dropdown"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 999999,
            minWidth: 210,
            background: dark ? 'rgba(10,14,28,0.96)' : 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            border: dark ? '0.5px solid rgba(255,255,255,0.08)' : '0.5px solid rgba(220,215,255,0.6)',
            borderRadius: 13,
            boxShadow: dark
              ? '0 16px 40px rgba(0,0,0,0.34), 0 2px 8px rgba(0,0,0,0.12)'
              : '0 8px 36px rgba(80,60,200,0.18), 0 2px 8px rgba(0,0,0,0.07)',
            padding: 5,
          }}
        >
          <div style={{ padding: '4px 10px 7px', borderBottom: dark ? '0.5px solid rgba(255,255,255,0.08)' : '0.5px solid rgba(100,80,200,0.08)', marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 750, letterSpacing: '0.09em', textTransform: 'uppercase', color: dark ? '#a5b4fc' : 'rgba(80,60,160,0.45)' }}>
              Actions
            </span>
          </div>
          {MENU_ITEMS.map((item) => (
            <button key={item.id} type="button" disabled={item.disabled} onClick={item.disabled ? undefined : item.action}
              onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = item.danger ? (dark ? 'rgba(248,113,113,0.08)' : 'rgba(220,38,38,0.05)') : (dark ? 'rgba(167,139,250,0.08)' : 'rgba(91,79,232,0.05)'); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', padding: '7px 10px', borderRadius: 9,
                background: 'transparent', border: 'none',
                color: item.disabled ? T.textTertiary : item.danger ? '#dc2626' : (dark ? '#e5e7eb' : T.textPrimary),
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left', opacity: item.disabled ? 0.5 : 1,
                transition: 'background 0.1s',
              }}>
              <span style={{ flexShrink: 0, marginTop: 1, color: item.disabled ? T.textTertiary : item.danger ? '#dc2626' : (dark ? '#a78bfa' : T.accent) }}>
                {item.icon}
              </span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: dark ? '#94a3b8' : T.textTertiary, marginTop: 1 }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function Tickets() {
  const navigate         = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [searchParams]   = useSearchParams();
  const [dark, setDark]  = useState(() => isDashboardDark());

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

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState(() => ({
    search: '', statusId: [], priorityId: [],
    assignedToMe: false, dateRange: '',
    unassigned: searchParams.get('unassigned') === 'true' || searchParams.get('assigned') === 'false',
    slaStatus: searchParams.get('slaStatus') || '',
  }));
  useEffect(() => {
    const sla = searchParams.get('slaStatus') || '';
    setFilters(prev => (prev.slaStatus === sla ? prev : { ...prev, slaStatus: sla }));
  }, [searchParams]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const { statusId, priorityId, assignedToMe, search } = filters;

  // Join arrays into comma-separated strings for the backend
  const statusParam   = Array.isArray(statusId)   ? statusId.join(',')   : statusId;
  const priorityParam = Array.isArray(priorityId) ? priorityId.join(',') : priorityId;

  const { tickets, loading, refetch, total, page, setPage, pageSize, setPageSize } = useTickets(
    statusId,
    priorityId,
    assignedToMe,
    search,
    filters.unassigned,
    sortConfig,
    filters.slaStatus
  );

  

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedCount = selectedIds.length;

  // ── Export UI ─────────────────────────────────────────────────────────────
  const [showExport, setShowExport] = useState(false);

  // ── Merge state ───────────────────────────────────────────────────────────
  // mergeTickets: the full ticket objects for the current selection
  const [mergeOpen,    setMergeOpen]    = useState(false);
  const [mergeTickets, setMergeTickets] = useState([]);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError,   setMergeError]   = useState('');



  /**
   * handleMerge – validates selection and opens the modal.
   * Called by ActionsDropdown → Merge item.
   */
  const handleMerge = () => {
    if (selectedIds.length < 2) {
      // Soft toast-style inline error; no alert()
      setMergeError('Select at least 2 tickets to merge.');
      // Auto-clear after 3 s
      setTimeout(() => setMergeError(''), 3000);
      return;
    }
    setMergeError('');
    // Collect the full ticket objects that match selectedIds
    const selectedTickets = filteredTickets.filter(t =>
      selectedIds.includes(t.id) || selectedIds.includes(String(t.id))
    );
    setMergeTickets(selectedTickets);
    setMergeOpen(true);
  };

  /**
   * confirmMerge – called by MergeTicketModal on confirm.
   * @param {{ parentId: string, childIds: string[] }} param
   */
  const confirmMerge = async ({ parentId, childIds }) => {
    setMergeLoading(true);
    setMergeError('');
    try {
      await api.post('/tickets/merge', {
        parentId,
        childIds,
      });

      // Optimistically remove child tickets from the view immediately.
      // The next refetch will also exclude isMerged=true rows from the server.
      const childIdSet = new Set(childIds.map(String));

      // If useTickets exposes a setter we can use it; otherwise refetch is enough.
      // We do both: instant UI update via selection clear + background refetch.
      setSelectedIds([]);
      setMergeOpen(false);
      setMergeTickets([]);

      // Trigger a background refetch so the list is authoritative.
      refetch({});
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error   ||
        err?.message                 ||
        'Merge failed. Please try again.';
      setMergeError(msg);
    } finally {
      setMergeLoading(false);
    }
  };

  const [resolutionModal, setResolutionModal] = useState(null); // { ticket, newStatus } | null
  const [resolutionSaving, setResolutionSaving] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const handleExport = async ({ format, scope }) => {
    let rows;

    if (scope === 'selected') {
      try {
    const params = new URLSearchParams();
    params.set('page', 1);
    params.set('limit', 9999);
    if (filters.statusId?.length)
      (Array.isArray(filters.statusId) ? filters.statusId : [filters.statusId])
        .forEach(id => params.append('statusId', id));
    if (filters.priorityId?.length)
      (Array.isArray(filters.priorityId) ? filters.priorityId : [filters.priorityId])
        .forEach(id => params.append('priorityId', id));
    if (filters.assignedToMe) params.set('assignedToMe', 'true');
    if (filters.search?.trim()) params.set('search', filters.search.trim());
    const res = await api.get(`/tickets?${params.toString()}`);
    const all = (res.data.tickets ?? []).filter(t => !t.isMerged);
    rows = all.filter(t => selectedIds.includes(t.id) || selectedIds.includes(String(t.id)));
  } catch {
    alert('Failed to fetch tickets for export.');
    return;
  }

    } else {
      try {
        const params = new URLSearchParams();
        params.set('page', 1);
        params.set('limit', 9999);
        if (filters.statusId?.length) {
          (Array.isArray(filters.statusId) ? filters.statusId : [filters.statusId])
            .forEach(id => params.append('statusId', id));
        }
        if (filters.priorityId?.length) {
          (Array.isArray(filters.priorityId) ? filters.priorityId : [filters.priorityId])
            .forEach(id => params.append('priorityId', id));
        }
        if (filters.assignedToMe) params.set('assignedToMe', 'true');
        if (filters.search?.trim()) params.set('search', filters.search.trim());

        const res = await api.get(`/tickets?${params.toString()}`);
        console.log('Export fetch URL:', `/tickets?${params.toString()}`);
        console.log('Export rows fetched:', res.data.tickets?.length);
        rows = (res.data.tickets ?? []).filter(t => !t.isMerged);

      } catch {
        alert('Failed to fetch all tickets for export.');
        return;
      }
    }

    if (!rows.length) { alert('No tickets to export.'); return; }
    const data = getExportRows(rows, visibleColumns);
    if (!data.length) { alert('No data to export.'); return; }
    const headers = Object.keys(data[0]);

    if (format === 'csv') {
      const body = data.map(r =>
        headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      downloadFile('tickets.csv', 'text/csv', headers.join(',') + '\n' + body);

    } else if (format === 'xls') {
      const ws = XLSX.utils.json_to_sheet(data, { cellDates: true });
      Object.keys(ws).forEach(cell => {
        if (cell.startsWith('!')) return;
        const value = ws[cell].v;
        if (value instanceof Date) {
          ws[cell].t = 'd';
          ws[cell].z = 'dd-mm-yyyy hh:mm:ss';
        }
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'tickets.xlsx'; a.click();
      URL.revokeObjectURL(url);

    } else if (format === 'html') {
      const ths = headers.map(h => `<th>${h}</th>`).join('');
      const trs = data.map(r =>
        `<tr>${headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`
      ).join('');
      downloadFile('tickets.html', 'text/html',
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tickets</title>
        <style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}
        tr:nth-child(even){background:#fafafa}</style></head>
        <body><h2>Tickets (${data.length})</h2>
        <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></body></html>`
      );

    } else if (format === 'pdf') {
      const ths = headers.map(h => `<th>${h}</th>`).join('');
      const trs = data.map(r =>
        `<tr>${headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`
      ).join('');
      const w = window.open('', '_blank');
      if (!w) { alert('Please allow popups to export as PDF.'); return; }
      w.document.write(
        `<!DOCTYPE html><html><head><title>Tickets</title>
        <style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px}th{background:#eee}
        @media print{button{display:none}}</style></head>
        <body><h2>Tickets Export (${data.length})</h2>
        <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
        <button onclick="window.print()" style="margin-top:16px;padding:8px 16px">
          Print / Save as PDF
        </button></body></html>`
      );
      w.document.close();
    }
  };
  // ── Column preferences (unchanged) ───────────────────────────────────────
  const [tablePrefsHydrated, setTablePrefsHydrated] = useState(false);
  const tablePrefsHydratedRef = useRef(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const columnsButtonRef = useRef(null);
  const pageKey = 'tickets';

  const defaultVisibleKeys = useMemo(() => TICKET_COLUMNS.filter(c => c.defaultVisible).map(c => c.key), []);
  const requiredKeySet     = useMemo(() => new Set(TICKET_COLUMNS.filter(c => c.required).map(c => c.key)), []);

  const [visibleColumnKeys, setVisibleColumnKeys] = useState(defaultVisibleKeys);
  const [columnOrder, setColumnOrder]   = useState(TICKET_COLUMNS.map(c => c.key));
  const [columnWidths, setColumnWidths] = useState({});

  const lastSavedPrefRef  = useRef(null);
  const visibleColumnsRef = useRef(visibleColumnKeys);
  const columnOrderRef    = useRef(null);
  const columnWidthsRef   = useRef({});

  useEffect(() => { visibleColumnsRef.current     = visibleColumnKeys;  }, [visibleColumnKeys]);
  useEffect(() => { columnWidthsRef.current       = columnWidths;       }, [columnWidths]);
  useEffect(() => { tablePrefsHydratedRef.current = tablePrefsHydrated; }, [tablePrefsHydrated]);

  const visibleColumns = useMemo(() => {
    const allowed = new Set(visibleColumnKeys);
    return columnOrder
      .map(key => TICKET_COLUMNS.find(c => c.key === key))
      .filter(c => c && (allowed.has(c.key) || c.required));
  }, [visibleColumnKeys, columnOrder]);

  const { options: statuses,   loading: statusesLoading   } = useMasterData('STATUS');
  const { options: priorities, loading: prioritiesLoading } = useMasterData('PRIORITY');

  function isClosedTicket(t) {
    const s = String(t.status?.value ?? t.status?.name ?? '').toLowerCase();
    return s === 'resolved' || s === 'closed';
  }
  function isOpenOrInProgressTicket(t) {
    const s = String(t.status?.value ?? t.status?.name ?? '').toLowerCase();
    return s === 'open' || s === 'in progress' || s === 'in_progress';
  }
  function getSlaBucket(t) {
    const deadline = getSlaDeadlineFromTicket(t);
    if (!deadline) return null;

    if (isClosedTicket(t)) {
      const resolvedTime = t.resolvedAt ?? t.closedAt ?? t.updatedAt;
      if (!resolvedTime) return null;
      return new Date(resolvedTime) > deadline ? 'breached' : 'within';
    }
    if (isOpenOrInProgressTicket(t)) {
      const now = new Date();
      if (deadline < now) return 'breached';
      if (deadline.getTime() - now.getTime() < 4 * 3600 * 1000) return 'atRisk';
      return 'within';
    }
    return null;
  }


  // ── Filtering ─────────────────────────────────────────────────────────────
  const normalizedSearch = filters.search.trim().toLowerCase();

  const filteredTickets = tickets.filter(t => {
  if (t.isMerged) return false;

  const matchesDate = (() => {
    if (!filters.dateRange) return true;
    const created = new Date(t.createdAt);
    const ms = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
    return Date.now() - created.getTime() <= (ms[filters.dateRange] ?? Infinity);
  })();

  const matchesUnassigned = !filters.unassigned || (!t.assignedTo && !t.assignedToId);
  return matchesDate && matchesUnassigned;
});




  // ── Sorting (unchanged) ───────────────────────────────────────────────────
  // const getPriorityRank = (ticket) => {
  //   const raw = String(ticket.priority?.value ?? ticket.priority?.name ?? '').toUpperCase();
  //   if (raw.includes('P1') || raw.includes('CRITICAL')) return 0;
  //   if (raw.includes('P2') || raw.includes('HIGH'))     return 1;
  //   if (raw.includes('P3') || raw.includes('MEDIUM'))   return 2;
  //   return 3;
  // };

  // const sortedTickets = (() => {
  //   if (!sortConfig.key || !sortConfig.direction) return filteredTickets;
  //   const { key, direction } = sortConfig;
  //   const dir = direction === 'asc' ? 1 : -1;
  //   return [...filteredTickets].sort((a, b) => {
  //     if (key === 'id')       return (Number(a.ticketNumber ?? a.id) - Number(b.ticketNumber ?? b.id)) * dir;
  //     if (key === 'priority') return (getPriorityRank(a) - getPriorityRank(b)) * dir;
  //     if (key === 'status')   return String(a.status?.value ?? a.status?.name ?? '').localeCompare(String(b.status?.value ?? b.status?.name ?? '')) * dir;
  //     if (['createdAt','updatedAt','dueDate','completedDate','resolvedDate'].includes(key))
  //       return ((a[key] ? new Date(a[key]).getTime() : 0) - (b[key] ? new Date(b[key]).getTime() : 0)) * dir;
  //     if (key === 'assignedTo') return String(a.assignedTo?.name ?? a.assignedTo?.email ?? '').localeCompare(String(b.assignedTo?.name ?? b.assignedTo?.email ?? '')) * dir;
  //     if (key === 'createdBy')  return String(a.createdBy?.name ?? a.createdBy?.email ?? '').localeCompare(String(b.createdBy?.name ?? b.createdBy?.email ?? '')) * dir;
  //     return String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * dir;
  //   });
  // })();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const onStatusChange = async (ticket, newStatus) => {
    if (statusNeedsResolution(newStatus)) {
      setResolutionModal({ ticket, newStatus });
      return; // intercepted — modal will handle the actual patch
    }
    const statusId = newStatus.id ?? newStatus._id;
    try {
      await api.patch(`/tickets/${ticket.id}`, { statusId });
      refetch();
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  const [resolutionError, setResolutionError] = useState('');

  const submitResolutionFromList = async (detailsText) => {
    if (!resolutionModal) return;

    const { ticket, newStatus } = resolutionModal;
    const statusId = newStatus.id ?? newStatus._id;

    setResolutionSaving(true);
    setResolutionError("");

    try {
      await api.patch(`/tickets/${ticket.id}`, {
        statusId,
        remarks: detailsText,
      });

      setToast({
        open: true,
        type: "success",
        title: "Ticket Updated",
        message: "Ticket status has been updated successfully.",
      });

      setResolutionModal(null);

      refetch();

    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Failed to update ticket status.";

      if (
        msg.toLowerCase().includes("assigned") ||
        msg.toLowerCase().includes("technician")
      ) {
        setToast({
          open: true,
          type: "warning",
          title: "Assignment Required",
          message:
            "Please assign this ticket to a technician before resolving or closing it.",
        });

        // Keep modal open
        // Keep resolution text intact
        return;
      }

      if (
        msg.toLowerCase().includes("assigned") ||
        msg.toLowerCase().includes("technician")
      ) {
        setToast({
          open: true,
          type: "warning",
          title: "Assignment Required",
          message:
            "Please assign this ticket before resolving or closing it.",
        });

        return;
      }

      setResolutionError(msg);

      setToast({
        open: true,
        type: "error",
        title: "Update Failed",
        message: msg,
      });

      setToast({
        open: true,
        title: "Update Failed",
        message: msg,
      });

    } finally {
      setResolutionSaving(false);
    }
  };

  const hasActiveFilters = filters.search || filters.statusId.length || filters.priorityId.length || filters.assignedToMe || filters.dateRange || filters.unassigned;
  const activeFilterCount = [
    filters.statusId.length ? 's' : '',
    filters.priorityId.length ? 'p' : '',
    filters.dateRange,
    filters.assignedToMe ? 'me' : '',
    filters.unassigned ? 'u' : '',
  ].filter(Boolean).length;

  // ── Column pref persistence (unchanged) ──────────────────────────────────
  const loadTablePreference = async () => {
    try {
      const res  = await api.get(`/table-preferences/${pageKey}`);
      const pref = res?.data ?? {};
      const requiredKeys    = TICKET_COLUMNS.filter(c => c.required).map(c => c.key);
      const nextVisibleKeys = (() => {
        const incoming = Array.isArray(pref?.visibleColumns) ? pref.visibleColumns : [];
        if (!incoming.length) return defaultVisibleKeys;
        return Array.from(new Set([...requiredKeys, ...incoming.map(k => String(k))]));
      })();
      const storedWidths  = pref?.columnWidths && typeof pref.columnWidths === 'object' ? pref.columnWidths : {};
      const storedOrder   = Array.isArray(pref?.columnOrder) ? pref.columnOrder : null;
      const visibleKeySet = new Set(nextVisibleKeys);
      const orderFiltered = storedOrder ? storedOrder.map(k => String(k)).filter(k => visibleKeySet.has(k)) : [];
      const remaining     = nextVisibleKeys.filter(k => !orderFiltered.includes(k));
      const nextColumnOrder = [...orderFiltered, ...remaining];
      setVisibleColumnKeys(nextVisibleKeys);
      setColumnOrder(nextColumnOrder);
      setColumnWidths(storedWidths);
      columnWidthsRef.current  = storedWidths;
      lastSavedPrefRef.current = pref;
      columnOrderRef.current   = nextColumnOrder;
      setTablePrefsHydrated(true);
    } catch {
      setVisibleColumnKeys(defaultVisibleKeys);
      setColumnOrder(TICKET_COLUMNS.map(c => c.key));
      setColumnWidths({});
      columnOrderRef.current = TICKET_COLUMNS.map(c => c.key);
      setTablePrefsHydrated(true);
    }
  };

  useEffect(() => { loadTablePreference(); }, [pageKey]);
  useEffect(() => {
    if (tablePrefsHydrated && (!Array.isArray(visibleColumnKeys) || !visibleColumnKeys.length)) {
      setVisibleColumnKeys(defaultVisibleKeys);
      setColumnOrder(TICKET_COLUMNS.map(c => c.key));
    }
  }, [tablePrefsHydrated, visibleColumnKeys, defaultVisibleKeys]);

  const patchTablePreference = async (next) => {
    if (!tablePrefsHydratedRef.current) return;
    try {
      await api.patch(`/table-preferences/${pageKey}`, {
        visibleColumns: Array.isArray(next.visibleColumns) ? next.visibleColumns : Array.isArray(next.visibleKeys) ? next.visibleKeys : undefined,
        columnOrder:    next.columnOrder,
        columnWidths:   next.columnWidths,
      });
    } catch (err) {
      console.error('[TablePrefs] patch failed:', err);
    }
  };

  const saveVisibleColumns = async (nextVisibleKeys) => {
    if (!tablePrefsHydrated) return;
    await patchTablePreference({ visibleColumns: nextVisibleKeys, columnOrder, columnWidths });
  };

  const resetTableColumnsToDefault = async () => {
    const defaultKeys = TICKET_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
    setColumnWidths({}); setVisibleColumnKeys(defaultKeys); setColumnOrder(TICKET_COLUMNS.map(c => c.key));
    await patchTablePreference({ visibleColumns: defaultKeys, columnOrder: defaultKeys, columnWidths: {} });
  };

  const orderPatchTimerRef = useRef(null), pendingOrderRef = useRef(null);
  const onColumnOrderChange = (nextOrderKeys) => {
    setColumnOrder(nextOrderKeys); columnOrderRef.current = nextOrderKeys; pendingOrderRef.current = nextOrderKeys;
    if (orderPatchTimerRef.current) clearTimeout(orderPatchTimerRef.current);
    orderPatchTimerRef.current = setTimeout(() => {
      const toSave = pendingOrderRef.current;
      if (!tablePrefsHydratedRef.current || !toSave) return;
      patchTablePreference({ visibleColumns: visibleColumnsRef.current, columnOrder: toSave, columnWidths: pendingWidthsRef.current ?? columnWidthsRef.current });
    }, 500);
  };

  const widthPatchTimerRef = useRef(null), pendingWidthsRef = useRef(null);
  const onColumnWidthsChange = (updater) => {
    setColumnWidths(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pendingWidthsRef.current = next; return next;
    });
    if (widthPatchTimerRef.current) clearTimeout(widthPatchTimerRef.current);
    widthPatchTimerRef.current = setTimeout(() => {
      const widthsToSave = pendingWidthsRef.current;
      if (!tablePrefsHydratedRef.current || !widthsToSave) return;
      patchTablePreference({ visibleColumns: visibleColumnsRef.current, columnOrder: columnOrderRef.current, columnWidths: widthsToSave });
    }, 500);
  };

  const [searchFocused, setSearchFocused] = useState(false);
  
  console.log('slaStatus filter:', filters.slaStatus, 'url param:', searchParams.get('slaStatus'));

  /* ── RENDER ───────────────────────────────────────────────────────────── */
  return (
    <Layout>
      <style>{`
        @keyframes ticketFadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .tickets-shell { animation: ticketFadeUp 0.22s ease both; }
        .tkt-search:focus { outline:none; border-color:${dark ? 'rgba(167,139,250,0.6)' : 'rgba(91,79,232,0.55)'}!important; box-shadow:0 0 0 3px ${dark ? 'rgba(167,139,250,0.14)' : 'rgba(91,79,232,0.1)'}; }
        .tkt-btn:hover { background:${dark ? 'rgba(167,139,250,0.09)' : 'rgba(91,79,232,0.06)'}!important; border-color:${dark ? 'rgba(167,139,250,0.3)' : 'rgba(91,79,232,0.3)'}!important; color:${dark ? '#ddd6fe' : '#5B4FE8'}!important; }
        .tkt-clear:hover { background:rgba(220,38,38,0.1)!important; }
        .tkt-cols-active { background:${dark ? 'rgba(167,139,250,0.12)' : 'rgba(91,79,232,0.09)'}!important; border-color:${dark ? 'rgba(167,139,250,0.38)' : 'rgba(91,79,232,0.4)'}!important; color:${dark ? '#ddd6fe' : '#5B4FE8'}!important; }
        @keyframes tktDropIn { from{opacity:0;transform:scale(0.96) translateY(-4px)} to{opacity:1;transform:none} }
        .tkt-dropdown { animation: tktDropIn 0.14s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div className="tickets-shell" style={{ height: 'calc(100vh - 95px)', overflow: 'hidden', padding: 0, marginTop: '-1px' }}>

        <div style={{ background: dark ? 'linear-gradient(180deg, rgba(14,19,38,0.98), rgba(10,14,28,0.98))' : '#ffffff', border: dark ? '1px solid rgba(255,255,255,0.08)' : '1.5px solid #d0d5dd', borderRadius: T.radius, boxShadow: dark ? '0 18px 55px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.03)' : '0 12px 40px rgba(80,60,200,0.14), 0 4px 12px rgba(0,0,0,0.08)',height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* ── Toolbar ──────────────────────────────────────────────────── */}
          <div style={{ top: 0, zIndex: 100, background: dark ? 'rgba(10,14,28,0.98)' : '#ffffff', borderBottom: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e9eaeb', borderRadius: `${T.radius}px ${T.radius}px 0 0`, padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>

              {/* Search */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? T.accent : T.textTertiary, pointerEvents: 'none', display: 'flex', transition: 'color 0.15s' }}>
                  <SearchIcon />
                </span>
                <input className="tkt-search"
                  style={{ paddingLeft: 28, paddingRight: 10, height: 30, width: 196, background: dark ? 'rgba(20,26,46,0.92)' : 'rgba(248,246,255,0.9)', border: `0.5px solid ${searchFocused ? (dark ? 'rgba(167,139,250,0.42)' : 'rgba(91,79,232,0.4)') : (dark ? 'rgba(255,255,255,0.1)' : T.border)}`, borderRadius: T.radiusSm, fontSize: 12, fontWeight: 500, color: dark ? '#e5e7eb' : T.textPrimary, transition: 'all 0.15s ease', boxShadow: searchFocused ? (dark ? '0 0 0 3px rgba(167,139,250,0.12)' : '0 0 0 3px rgba(91,79,232,0.09)') : 'none' }}
                  placeholder="Search tickets…"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </div>

              <Divider />

              {/* Filter pills */}
              {!statusesLoading && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <FilterDropdown placeholder="Status" value={filters.statusId} onChange={(val) => handleFilterChange('statusId', val)} options={statuses} multi  />
                  {filters.statusId.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: T.accent, border: dark ? '1.5px solid #10172a' : '1.5px solid #fff' }} />}
                </div>
              )}
              {!prioritiesLoading && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <FilterDropdown placeholder="Priority" value={filters.priorityId} onChange={(val) => handleFilterChange('priorityId', val)} options={priorities} multi  />
                  {filters.priorityId.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: T.accent, border: dark ? '1.5px solid #10172a' : '1.5px solid #fff' }} />}
                </div>
              )}
              <FilterDropdown placeholder="Assigned" value={filters.assignedToMe ? 'me' : ''} onChange={(val) => handleFilterChange('assignedToMe', val === 'me')} options={[{ id: 'me', value: 'Assigned to me' }]} />
              <FilterDropdown placeholder="Date range" value={filters.dateRange} onChange={(val) => handleFilterChange('dateRange', val)}
                options={[{ id: '24h', value: 'Last 24 hours' }, { id: '7d', value: 'Last 7 days' }, { id: '30d', value: 'Last 30 days' }]} />

              {activeFilterCount > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: T.accent, color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {activeFilterCount}
                </span>
              )}

              <div style={{ flex: 1 }} />

              {/* Right controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

                {/* ── Merge validation error inline banner ────────────────── */}
                {mergeError && !mergeOpen && (
                  <span style={{
                    fontSize: 11.5, color: T.danger,
                    background: dark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.07)',
                    border: `0.5px solid ${dark ? 'rgba(248,113,113,0.18)' : 'rgba(220,38,38,0.2)'}`,
                    borderRadius: T.radiusSm,
                    padding: '3px 10px',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    {mergeError}
                  </span>
                )}

                {hasActiveFilters && (
                  <button type="button" className="tkt-clear"
                    onClick={() => { setFilters({ search: '', statusId: [], priorityId: [], assignedToMe: false, dateRange: '', unassigned: false, slaStatus: '' }); refetch({}); }}
                    style={{ ...pillBase, background: dark ? 'rgba(220,38,38,0.12)' : T.dangerLight, border: `0.5px solid ${dark ? 'rgba(248,113,113,0.18)' : 'rgba(220,38,38,0.2)'}`, color: T.danger }}>
                    <XIcon />Clear filters
                  </button>
                )}

                <Divider />

                {/* ── Pagination in toolbar ───────────────────────────────── */}
                {total > 0 && (
                  <PaginationBar
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    setPage={setPage}
                    setPageSize={setPageSize}
                  />
                )}

                <Divider />

                <ActionsDropdown
                  dark={dark}
                  onMerge={handleMerge}
                  onExportClick={() => setShowExport(true)}
                />

                <Divider />

                <button type="button" ref={columnsButtonRef}
                  className={`tkt-btn ${showColumnSettings ? 'tkt-cols-active' : ''}`}
                  onClick={() => setShowColumnSettings(v => !v)}
                  style={{
                    ...pillBase,
                    background: showColumnSettings
                      ? (dark ? 'rgba(167,139,250,0.12)' : T.accentLight)
                      : (dark ? 'rgba(20,26,46,0.92)' : 'rgba(248,246,255,0.9)'),
                    border: `0.5px solid ${showColumnSettings
                      ? (dark ? 'rgba(167,139,250,0.38)' : 'rgba(91,79,232,0.4)')
                      : (dark ? 'rgba(255,255,255,0.1)' : T.border)}`,
                    color: showColumnSettings ? (dark ? '#ddd6fe' : T.accent) : (dark ? '#cbd5e1' : T.textSecondary),
                  }}>
                  <ColumnsIcon />Columns
                </button>
              </div>
            </div>
          </div>

          {/* ── Table ──────────────────────────────────────────────────────── */}
          <div style={{ background: 'transparent', borderRadius: `0 0 ${T.radius}px ${T.radius}px`, flex: 1, minHeight: 0, overflow: 'auto' }}>
            {tablePrefsHydrated && (
              <TableColumnSettingsModal
                open={showColumnSettings}
                title="Ticket Columns"
                columns={TICKET_COLUMNS}
                requiredKeySet={requiredKeySet}
                anchorRef={columnsButtonRef}
                onCancel={() => setShowColumnSettings(false)}
                onReset={() => { resetTableColumnsToDefault(); setShowColumnSettings(false); }}
                visibleColumnKeys={visibleColumnKeys}
                onColumnOrderChange={onColumnOrderChange}
                onSave={({ visibleKeys, columnOrder: nextOrder }) => {
                  setVisibleColumnKeys(visibleKeys);
                  if (Array.isArray(nextOrder)) setColumnOrder(nextOrder);
                  saveVisibleColumns(visibleKeys);
                  patchTablePreference({ visibleColumns: visibleKeys, columnOrder: nextOrder, columnWidths });
                  setShowColumnSettings(false);
                }}
              />
            )}

            {loading ? (
              <div style={{ padding: '72px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: '100%' }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ height: 38, borderBottom: `0.5px solid ${T.border}`, background: `linear-gradient(90deg,rgba(248,246,255,0) 0%,rgba(230,224,255,0.18) ${30+i*8}%,rgba(248,246,255,0) 100%)`, backgroundSize: '200% 100%', animation: `shimmer 1.4s ease-in-out ${i*0.1}s infinite` }} />
                  ))}
                </div>
                <LoadingSpinner text="Loading tickets…" />
                <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
              </div>
            ) : (
              <TicketTable
                page={page}
                pageSize={pageSize}
                total={total}
                setPage={setPage}
                setPageSize={setPageSize}
                tickets={filteredTickets}
                loading={loading}
                isSuperAdmin={isSuperAdmin}
                onAssign={(ticket)      => navigate(`/tickets/${ticket.id}/assign`)}
                onEdit={(ticket)        => navigate(`/tickets/${ticket.id}`)}
                onViewDetails={(ticket) => navigate(`/tickets/${ticket.id}`)}
                onEmpty={() => navigate('/tickets/new')}
                visibleColumns={visibleColumns}
                columnWidths={columnWidths}
                onColumnWidthsChange={onColumnWidthsChange}
                onColumnOrderChange={onColumnOrderChange}
                sortConfig={sortConfig}
                onSort={handleSort}
                statuses={statuses}
                onStatusChange={onStatusChange}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        {!loading && (
          <div style={{ padding: '8px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: dark ? '#94a3b8' : T.textTertiary }}>
              <span style={{ color: dark ? '#e5e7eb' : T.textPrimary, fontWeight: 600 }}>{filteredTickets.length}</span> ticket{filteredTickets.length !== 1 ? 's' : ''}
              {hasActiveFilters && <span style={{ color: dark ? '#94a3b8' : T.textTertiary }}> · filtered from {tickets.length} total</span>}
              {selectedCount > 0 && <span style={{ color: dark ? '#c4b5fd' : T.accent, fontWeight: 600 }}> · {selectedCount} selected</span>}
            </span>
          </div>
        )}
      </div>

      {/* ── Export modal (unchanged) ─────────────────────────────────────── */}
      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        selectedCount={selectedCount}
        totalCount={total}
        onExport={handleExport}
        dark={dark}
      />

      {/* ── Merge modal ──────────────────────────────────────────────────── */}
      <MergeTicketModal
        open={mergeOpen}
        tickets={mergeTickets}
        onClose={() => { setMergeOpen(false); setMergeError(''); }}
        onConfirm={confirmMerge}
        loading={mergeLoading}
        error={mergeError}
      />
      <TicketResolutionModal
        open={!!resolutionModal}
        saving={resolutionSaving}
        dark={dark}
        error={resolutionError}
        onClose={() => {
          if (resolutionSaving) return;

          setResolutionModal(null);
          refetch();
        }}
        onSubmit={submitResolutionFromList}
      />
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        dark={dark}
        onClose={() =>
          setToast((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
    </Layout>
  );
}
