import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ─── Design tokens (mirrors Tickets.jsx T object) ───────────────────────── */
const T = {
  surface:       'rgba(255,255,255,0.82)',
  border:        'rgba(220,215,255,0.45)',
  borderStrong:  'rgba(180,170,255,0.55)',
  accent:        '#5B4FE8',
  accentLight:   'rgba(91,79,232,0.08)',
  textPrimary:   '#111827',
  textSecondary: '#6B7280',
  textTertiary:  '#9CA3AF',
  danger:        '#DC2626',
  radius:        14,
  radiusSm:      9,
};

/* ─── Chevron icon ───────────────────────────────────────────────────────── */
function ChevronDown() {
  return (
    <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/* ─── Info icon ──────────────────────────────────────────────────────────── */
function InfoIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * MergeTicketModal
 *
 * Props:
 *  open         {boolean}
 *  tickets      {Array}   – the selected ticket objects (min 2)
 *  onClose      {fn}
 *  onConfirm    {fn({ parentId, childIds })}  – called when user confirms merge
 *  loading      {boolean} – shows spinner on Merge button while API call is in flight
 *  error        {string}  – API error message to display inside modal
 */
export default function MergeTicketModal({ open, tickets = [], onClose, onConfirm, loading = false, error = '' }) {
  const [parentId, setParentId] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [dropPos,  setDropPos]  = useState({ top: 0, left: 0, width: 0 });
  const dropBtnRef = useRef(null);

  /* Reset parent selection when modal opens / ticket list changes */
  useEffect(() => {
    if (open && tickets.length > 0) {
      setParentId(String(tickets[0].id ?? ''));
    }
  }, [open, tickets]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') { setDropOpen(false); onClose(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e) => { if (!e.target.closest('.merge-drop-menu')) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  if (!open) return null;

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  const ticketLabel = (t) => {
    const num = t.ticketNumber ?? t.ticket_number ?? t.ticketId ?? t.id ?? '';
    const subj = t.subject ?? t.title ?? '(No subject)';
    return `#${num} – ${subj}`;
  };

  const selectedTicket = tickets.find(t => String(t.id) === String(parentId));

  const handleDropOpen = () => {
    if (dropBtnRef.current) {
      const r = dropBtnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setDropOpen(v => !v);
  };

  const handleSelect = (id) => {
    setParentId(String(id));
    setDropOpen(false);
  };

  const handleConfirm = () => {
    if (!parentId || loading) return;
    const childIds = tickets
      .map(t => String(t.id))
      .filter(id => id !== String(parentId));
    onConfirm({ parentId, childIds });
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return createPortal(
    <>
      <style>{`
        @keyframes mergeModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes mergeDropIn {
          from { opacity: 0; transform: scale(0.97) translateY(-4px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) { setDropOpen(false); onClose(); } }}
        style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(30,24,60,0.22)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
      >
        {/* Modal card */}
        <div style={{
          background: '#fff',
          border: '0.5px solid rgba(220,215,255,0.6)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(80,60,200,0.18), 0 4px 16px rgba(0,0,0,0.08)',
          width: 420,
          maxWidth: '100%',
          overflow: 'visible',
          animation: 'mergeModalIn 0.18s cubic-bezier(0.16,1,0.3,1) both',
        }}>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div style={{
            padding: '16px 18px 14px',
            borderBottom: '0.5px solid rgba(220,215,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {/* Merge icon */}
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'rgba(91,79,232,0.09)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="15" height="15" fill="none" stroke={T.accent} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 650, color: T.textPrimary, margin: 0 }}>
                  Merge Request
                </h3>
                <p style={{ fontSize: 11.5, color: T.textTertiary, margin: '1px 0 0' }}>
                  {tickets.length} tickets selected
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => { setDropOpen(false); onClose(); }}
              style={{
                width: 28, height: 28, borderRadius: 8, border: 'none',
                background: 'rgba(220,215,255,0.3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.textSecondary,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(91,79,232,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220,215,255,0.3)'}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Info box ───────────────────────────────────────────────── */}
          <div style={{ padding: '14px 18px 0' }}>
            <div style={{
              display: 'flex', gap: 10,
              padding: '11px 13px',
              background: 'rgba(91,79,232,0.05)',
              border: '0.5px solid rgba(91,79,232,0.18)',
              borderRadius: 10,
              color: T.textSecondary,
            }}>
              <span style={{ color: T.accent, flexShrink: 0, marginTop: 1 }}>
                <InfoIcon />
              </span>
              <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
                Child request(s) will be merged under the parent request.
                Work logs, notes, conversations and completed tasks of child
                request(s) will be moved under the parent request.
              </p>
            </div>
          </div>

          {/* ── Parent selector ────────────────────────────────────────── */}
          <div style={{ padding: '16px 18px 0' }}>
            <label style={{
              display: 'block',
              fontSize: 11.5, fontWeight: 700,
              color: T.textSecondary,
              marginBottom: 7,
              letterSpacing: '0.01em',
            }}>
              Select Parent Request <span style={{ color: T.danger }}>*</span>
            </label>

            {/* Custom dropdown trigger */}
            <button
              ref={dropBtnRef}
              type="button"
              onClick={handleDropOpen}
              style={{
                width: '100%', height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 11px',
                background: 'rgba(248,246,255,0.9)',
                border: `0.5px solid ${dropOpen ? 'rgba(91,79,232,0.5)' : T.borderStrong}`,
                borderRadius: T.radiusSm,
                fontSize: 12.5, fontWeight: 500,
                color: selectedTicket ? T.textPrimary : T.textTertiary,
                cursor: 'pointer',
                boxShadow: dropOpen ? '0 0 0 3px rgba(91,79,232,0.09)' : 'none',
                transition: 'all 0.14s',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>
                {selectedTicket ? ticketLabel(selectedTicket) : 'Choose parent ticket…'}
              </span>
              <span style={{
                color: T.textTertiary, flexShrink: 0,
                transform: dropOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}>
                <ChevronDown />
              </span>
            </button>

            {/* Helper text: shows which will become children */}
            {selectedTicket && (() => {
              const children = tickets.filter(t => String(t.id) !== String(parentId));
              return (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {children.map(t => (
                    <span key={t.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 500,
                      padding: '2px 8px', borderRadius: 20,
                      background: 'rgba(220,38,38,0.06)',
                      border: '0.5px solid rgba(220,38,38,0.2)',
                      color: T.danger,
                    }}>
                      <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M19 9l-7 7-7-7" />
                      </svg>
                      #{t.ticketNumber ?? t.ticket_number ?? t.id}
                      <span style={{ color: T.textTertiary, fontWeight: 400 }}>→ child</span>
                    </span>
                  ))}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 500,
                    padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(91,79,232,0.07)',
                    border: '0.5px solid rgba(91,79,232,0.25)',
                    color: T.accent,
                  }}>
                    #{selectedTicket.ticketNumber ?? selectedTicket.ticket_number ?? selectedTicket.id}
                    <span style={{ color: T.textTertiary, fontWeight: 400 }}>→ parent</span>
                  </span>
                </div>
              );
            })()}
          </div>

          {/* ── Confirmation text ──────────────────────────────────────── */}
          <div style={{ padding: '14px 18px 0' }}>
            <p style={{
              fontSize: 12, color: T.textSecondary,
              background: 'rgba(248,246,255,0.7)',
              border: `0.5px solid ${T.border}`,
              borderRadius: T.radiusSm,
              padding: '9px 12px', margin: 0,
              lineHeight: 1.55,
            }}>
              Are you sure you want to merge the selected requests?
            </p>
          </div>

          {/* ── API error ─────────────────────────────────────────────── */}
          {error && (
            <div style={{ padding: '10px 18px 0' }}>
              <p style={{
                fontSize: 12, color: T.danger,
                background: 'rgba(220,38,38,0.06)',
                border: '0.5px solid rgba(220,38,38,0.2)',
                borderRadius: T.radiusSm,
                padding: '8px 12px', margin: 0,
              }}>
                {error}
              </p>
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div style={{
            padding: '14px 18px 16px',
            borderTop: '0.5px solid rgba(220,215,255,0.35)',
            marginTop: 16,
            display: 'flex', gap: 8,
          }}>
            <button
              type="button"
              onClick={() => { setDropOpen(false); onClose(); }}
              disabled={loading}
              style={{
                flex: 1, height: 36, borderRadius: T.radiusSm,
                border: `0.5px solid ${T.border}`,
                background: '#fff', color: T.textSecondary,
                fontSize: 13, fontWeight: 550, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(248,246,255,0.9)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!parentId || loading}
              style={{
                flex: 1, height: 36, borderRadius: T.radiusSm,
                border: 'none',
                background: (!parentId || loading)
                  ? 'rgba(91,79,232,0.45)'
                  : 'linear-gradient(135deg,#5B4FE8,#7C6FF0)',
                color: '#fff',
                fontSize: 13, fontWeight: 650,
                cursor: (!parentId || loading) ? 'not-allowed' : 'pointer',
                boxShadow: (!parentId || loading) ? 'none' : '0 3px 12px rgba(91,79,232,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'box-shadow 0.14s',
              }}
              onMouseEnter={(e) => { if (parentId && !loading) e.currentTarget.style.boxShadow = '0 6px 20px rgba(91,79,232,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = (!parentId || loading) ? 'none' : '0 3px 12px rgba(91,79,232,0.3)'; }}
            >
              {loading && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: 'mergeSpinner 0.7s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
              {loading ? 'Merging…' : 'Merge'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Dropdown portal (rendered outside the modal card so it's never clipped) */}
      {dropOpen && createPortal(
        <div
          className="merge-drop-menu"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 9999999,
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            border: '0.5px solid rgba(220,215,255,0.6)',
            borderRadius: 11,
            boxShadow: '0 8px 32px rgba(80,60,200,0.18), 0 2px 8px rgba(0,0,0,0.07)',
            padding: 5,
            animation: 'mergeDropIn 0.13s cubic-bezier(0.16,1,0.3,1) both',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {tickets.map((t) => {
            const isSelected = String(t.id) === String(parentId);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.id)}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(91,79,232,0.05)'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  background: isSelected ? 'rgba(91,79,232,0.07)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  fontSize: 12.5, fontWeight: isSelected ? 650 : 500,
                  color: isSelected ? T.textPrimary : T.textSecondary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, paddingRight: 8,
                }}>
                  {ticketLabel(t)}
                </span>
                {isSelected && (
                  <svg width="13" height="13" fill="none" stroke={T.accent} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}

      <style>{`@keyframes mergeSpinner { to { transform: rotate(360deg); } }`}</style>
    </>,
    document.body
  );
}