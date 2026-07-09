import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";


import api from "../api/axios";
import Layout from "../components/layout/Layout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { getSlaDeadlineFromTicket, getDeadlineCountdown, getTatDeadlineFromTicket } from "../utils/sla";

import { useAuth } from "../context/AuthContext";

import TicketPropertyRow from "../components/tickets/TicketPropertyRow";
import TicketHtmlRenderer from "../components/tickets/TicketHtmlRenderer";

import { useMasterData } from "../hooks/Usemasterdata";
import { usePageHeader } from "../context/PageHeaderContext";


// ---------------------------------------------------------------------------
// Design tokens — minimal / modern shell (matches the "Sources" reference)
// Two full token sets so every sub-component below just receives `T` as a
// prop instead of closing over a single hardcoded object.
// ---------------------------------------------------------------------------
const LIGHT_TOKENS = {
  border: "#E5E7EB",
  borderSoft: "#EEF0F3",
  bg: "#FFFFFF",
  bgMuted: "#F8FAFC",
  text: "#0F172A",
  textMuted: "#64748B",
  textFaint: "#A3AED0",
  accent: "#7C3AED",
  accentSoft: "#F5F3FF",
  success: "#22C55E",
  danger: "#EF4444",
  radius: 10,
  radiusSm: 8,
  font: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const DARK_TOKENS = {
  border: "rgba(148,163,184,0.24)",
  borderSoft: "rgba(148,163,184,0.10)",
  bg: "#090e1b",
  bgMuted: "#0b121d",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textFaint: "#64748B",
  accent: "#9333EA",
  accentSoft: "rgba(147,51,234,0.16)",
  success: "#34D399",
  danger: "#F87171",
  radius: 10,
  radiusSm: 8,
  font: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};



function getMasterIdToValue(options) {
  const map = {};
  for (const opt of options || []) map[opt.id] = opt.value ?? opt.name;
  return map;
}

function mapOptionLabel(options, value) {
  if (!value) return "—";
  const match = options?.find(
    (o) => String(o.id) === String(value) || String(o.value) === String(value)
  );
  return match?.label || match?.value || match?.name || "—";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Small shell components — all take `T` as a prop now
// ---------------------------------------------------------------------------

function Breadcrumb({ onHome, onTickets, current, T }) {
  const crumbStyle = {
    color: T.textMuted,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={crumbStyle} onClick={onHome}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2 7-7 7 7 2 2M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
        </svg>
      </span>
      <span style={{ color: T.border, fontSize: 13 }}>/</span>
      <span style={crumbStyle} onClick={onTickets}>Tickets</span>
      <span style={{ color: T.border, fontSize: 13 }}>/</span>
      <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{current}</span>
    </div>
  );
}

function Pill({ label, value, T }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `1px solid ${T.border}`,
        borderRadius: 999,
        padding: "5px 10px 5px 12px",
        background: T.bg,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textFaint }}>
        {label}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{value || "—"}</span>
    </div>
  );
}

function StatusPill({ value, T }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `1px solid ${T.border}`,
        borderRadius: 999,
        padding: "5px 10px",
        background: T.bg,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: T.success, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{value || "—"}</span>
    </div>
  );
}

function Btn({ children, onClick, variant = "default", disabled = false, icon, T }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    fontFamily: T.font,
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 14px",
    borderRadius: T.radiusSm,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    transition: "background 120ms ease, border-color 120ms ease",
    border: `1px solid ${T.border}`,
    background: T.bg,
    color: T.text,
  };
  const variants = {
    default: {},
    primary: { background: T.accent, borderColor: T.accent, color: "#fff" },
    ghost: { border: "1px solid transparent", background: "transparent", color: T.textMuted },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {icon}
      {children}
    </button>
  );
}

function TabStrip({ tabs, active, onChange, T }) {
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = tabRefs.current[active];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [active, tabs]);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: 4,
        background: T.bgMuted,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        width: "fit-content",
      }}
    >
      {/* Sliding indicator */}
      <div
        style={{
          position: "absolute",
          top: 4,
          left: indicator.left,
          width: indicator.width,
          height: "calc(100% - 8px)",
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusSm,
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          transition: "left 220ms cubic-bezier(0.4,0,0.2,1), width 220ms cubic-bezier(0.4,0,0.2,1)",
          zIndex: 0,
        }}
      />

      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            ref={(el) => (tabRefs.current[tab.key] = el)}
            onClick={() => onChange(tab.key)}
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: T.font,
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: T.radiusSm,
              border: "1px solid transparent",
              background: "transparent",
              color: isActive ? T.text : T.textMuted,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 150ms ease",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function Panel({ title, action, children, style, T }) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        background: T.bg,
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 16px",
            borderBottom: `1px solid ${T.borderSoft}`,
          }}
        >
          {title && <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>}
          {action}
        </div>
      )}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function SidebarStat({ label, value, T }) {
  return (
    <div
      style={{
        border: `1px solid ${T.borderSoft}`,
        borderRadius: T.radiusSm,
        padding: "10px 12px",
        background: T.bgMuted,
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textFaint }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 13.5, fontWeight: 700, color: T.text }}>{value || "—"}</div>
    </div>
  );
}
function OpsRow({ label, children, T, last }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 0",
        borderBottom: last ? "none" : `1px solid ${T.borderSoft}`,
      }}
    >
      <span style={{ fontSize: 11.5, fontWeight: 500, color: T.textMuted, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.text, textAlign: "right" }}>
        {children}
      </span>
    </div>
  );
}
function StatusSelect({ ticket, statusOptions, T, onUpdated, onNeedsResolution }) {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const currentId = ticket?.status?.id ?? ticket?.statusId ?? "";
  const closed = isTicketClosed(ticket);



  const currentLabel =
    (statusOptions || []).find((o) => String(o.id) === String(currentId))?.value ??
    (statusOptions || []).find((o) => String(o.id) === String(currentId))?.name ??
    "—";

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = async (newId) => {
    setOpen(false);
    if (!newId || String(newId) === String(currentId)) return;

    const opt = (statusOptions || []).find((o) => String(o.id) === String(newId));
    if (statusNeedsResolution(opt)) {
      onNeedsResolution?.(newId);
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/tickets/${ticket.id}`, { statusId: newId });
      const res = await api.get(`/tickets/${ticket.id}`);
      onUpdated(res.data);
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: 150 }}>
      <button
        onClick={() => !saving && setOpen((v) => !v)}
        disabled={saving}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          width: "100%",
          border: `1px solid ${T.border}`,
          borderRadius: 999,
          background: T.bgMuted,
          padding: "5px 10px 5px 12px",
          fontSize: 11.5,
          fontWeight: 500,
          color: T.text,
          fontFamily: T.font,
          cursor: saving ? "wait" : "pointer",
          outline: "none",
          opacity: saving ? 0.6 : 1,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: closed ? T.textFaint : T.success,
              flexShrink: 0,
            }}
          />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentLabel}
          </span>
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke={T.textMuted}
          strokeWidth="2"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 190,
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.06)",
            padding: 6,
            zIndex: 40,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {(statusOptions || []).map((opt) => {
            const isSelected = String(opt.id) === String(currentId);
            return (
              <div
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 10px",
                  margin: "1px 0",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 450,
                  color: isSelected ? T.accent : T.textMuted,
                  background: isSelected ? T.accentSoft : "transparent",
                  cursor: "pointer",
                  transition: "background 100ms ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = T.bgMuted;
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{opt.value ?? opt.name}</span>
                {isSelected && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function isTicketClosed(ticket) {
  const s = String(ticket?.status?.value ?? ticket?.status?.name ?? "").toLowerCase();
  return s === "resolved" || s === "closed" || s.includes("closed");
}
function statusNeedsResolution(statusOption) {
  const raw = String(statusOption?.value ?? statusOption?.name ?? "")
    .toLowerCase()
    .replace(/[\s_]/g, "");
  return raw === "closed" || raw === "resolved" || raw === "confirmationawaiting";
}

function parseResolutionRemarks(remarks) {
  if (!remarks || !String(remarks).trim()) return null;

  const map = { Summary: "summary", "Root Cause": "rootCause", Worklog: "worklog", Notes: "notes" };
  const result = {};
  String(remarks).split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (map[key] && val) result[map[key]] = val;
  });

  if (Object.keys(result).length) return result;
  return { notes: String(remarks).trim() };
}
function closedAwareLabel(result, ticket, kind) {
  if (isTicketClosed(ticket)) {
    if (result.tone === "danger") return `Closed · ${kind} breached`;
    if (result.tone === "success") return `Closed · within ${kind}`;
    return "Closed";
  }
  return result.label;
}

function toneToColor(tone, T) {
  if (tone === "danger") return T.danger;
  if (tone === "warning") return "#F59E0B";
  if (tone === "success") return T.success;
  return T.textFaint;
}

function formatSlaDateTime(d) {
  if (!d || Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}
function ToneDot({ tone, T }) {
  const color =
    tone === "danger" ? T.danger : tone === "warning" ? "#F59E0B" : tone === "success" ? T.success : T.textFaint;
  return <span style={{ width: 6, height: 6, borderRadius: 999, background: color, flexShrink: 0 }} />;
}

function MeterCard({ label, result, sublabel, T }) {
  const toneColor =
    result.tone === "danger" ? T.danger : result.tone === "warning" ? "#F59E0B" : result.tone === "success" ? T.success : T.textFaint;

  return (
    <div style={{ position: "relative", borderRadius: T.radiusSm, background: T.bgMuted, padding: "10px 12px 10px 14px", overflow: "hidden" }}>
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: toneColor }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.textFaint }}>
          {label}
        </span>
        <ToneDot tone={result.tone} T={T} />
      </div>
      <div style={{ marginTop: 3, fontSize: 13, fontWeight: 600, color: T.text }}>{result.label}</div>
      {sublabel ? <div style={{ marginTop: 1, fontSize: 11, fontWeight: 500, color: T.textMuted }}>{sublabel}</div> : null}
    </div>
  );
}

function InfoRow({ label, value, T, last }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "9px 0",
        borderBottom: last ? "none" : `1px solid ${T.borderSoft}`,
      }}
    >
      <span style={{ fontSize: 11.5, fontWeight: 500, color: T.textMuted }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

function TimelineCard({ event, T }) {
  return (
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <span
        style={{
          position: "absolute",
          left: 3,
          top: 6,
          width: 8,
          height: 8,
          borderRadius: 999,
          background: T.accent,
          boxShadow: `0 0 0 3px ${T.accentSoft}`,
        }}
      />
      <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "12px 14px", background: T.bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{event?.title || "Update"}</div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: T.textFaint }}>{event?.time || ""}</div>
        </div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: T.textMuted }}>{event?.description || ""}</div>
        {event?.meta ? (
          <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 600, color: T.textFaint }}>{event.meta}</div>
        ) : null}
      </div>
    </div>
  );
}

function LabelInput({ label, value, onChange, placeholder, T }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textFaint }}>
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          marginTop: 7,
          width: "100%",
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusSm,
          background: T.bg,
          padding: "9px 11px",
          fontSize: 13,
          fontWeight: 500,
          color: T.text,
          outline: "none",
          fontFamily: T.font,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function LabelTextarea({ label, value, onChange, placeholder, rows, T }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textFaint }}>
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          marginTop: 7,
          width: "100%",
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusSm,
          background: T.bg,
          padding: "9px 11px",
          fontSize: 13,
          fontWeight: 500,
          color: T.text,
          outline: "none",
          fontFamily: T.font,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
function ResolutionModal({ T, onCancel, onSubmit, saving }) {
  const [details, setDetails] = useState("");
  const isValid = details.trim().length > 0;

  const modal = (
    <div
      onClick={() => !saving && onCancel()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
          background: T.bg,
          borderRadius: T.radius,
          border: `1px solid ${T.border}`,
          boxShadow: "0 24px 64px rgba(15,23,42,0.35)",
          padding: 24,
          fontFamily: T.font,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>
          Resolution required
        </div>
        <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 18 }}>
          Please add resolution details before changing the status.
        </div>

        <LabelTextarea
          label="Resolution Details *"
          value={details}
          onChange={setDetails}
          placeholder="Describe the resolution, root cause, and work performed…"
          rows={6}
          T={T}
        />
        {!isValid && details.length === 0 ? null : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn onClick={onCancel} disabled={saving} T={T}>Cancel</Btn>
          <Btn
            variant="primary"
            onClick={() => isValid && onSubmit({ notes: details.trim() })}
            disabled={saving || !isValid}
            T={T}
          >
            {saving ? "Saving..." : "Submit & Update Status"}
          </Btn>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TicketDetailsPage() {
  const { setPageHeaderLabel, clearPageHeaderLabel } = usePageHeader();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: _user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("details");
  const [resolveUpdate, setResolveUpdate] = useState({ summary: "", rootCause: "", worklog: "", notes: "" });
  const [editingKey, setEditingKey] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("dashboard-theme") || "light";
  });

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  const dark = theme === "dark";
  const T = dark ? DARK_TOKENS : LIGHT_TOKENS;
  const [opsCollapsed, setOpsCollapsed] = useState(false);
  const [resolutionModal, setResolutionModal] = useState(null); // { pendingStatusId } | null
  const [resolutionSaving, setResolutionSaving] = useState(false);


  useEffect(() => {
    const handler = (event) => {
      const next = event?.detail;
      if (next === "dark" || next === "light") setTheme(next);
    };
    window.addEventListener("dashboard-theme-change", handler);
    return () => window.removeEventListener("dashboard-theme-change", handler);
  }, []);

  const canAct = Boolean(ticket);

  const { options: priorityOptions } = useMasterData("PRIORITY");
  const { options: statusOptions } = useMasterData("STATUS");
  const { options: categoryOptions } = useMasterData("CATEGORY");
  const { options: subcategoryOptions } = useMasterData("SUBCATEGORY");
  const { options: sourceOptions } = useMasterData("SOURCE");
  const { options: levelOptions } = useMasterData("LEVEL");
  const { options: groupOptions } = useMasterData("GROUP");
  const { options: severityOptions } = useMasterData("SEVERITY");
  const { options: raisedByOptions } = useMasterData("RAISED_BY");
  const { options: rootCauseCategoryOptions } = useMasterData("ROOT_CAUSE_CATEGORY");
  const { options: siteOptions } = useMasterData("SITE");
  const { options: ticketTypeOptions } = useMasterData("TICKET_TYPE");
  const { options: clientNameOptions } = useMasterData("CLIENT_NAME");
  const { options: itemOptions } = useMasterData("ITEM");
  const { options: seatEffectedOptions } = useMasterData("SEAT_EFFECTED");
  const { options: clientConfirmationOptions } = useMasterData("CLIENT_CONFIRMATION");
  const { options: departmentOptions } = useMasterData("DEPARTMENT");

  const priorityIdToValue = useMemo(() => getMasterIdToValue(priorityOptions), [priorityOptions]);
  const statusIdToValue = useMemo(() => getMasterIdToValue(statusOptions), [statusOptions]);
  const categoryIdToValue = useMemo(() => getMasterIdToValue(categoryOptions), [categoryOptions]);
  const subcategoryIdToValue = useMemo(() => getMasterIdToValue(subcategoryOptions), [subcategoryOptions]);
  const sourceIdToValue = useMemo(() => getMasterIdToValue(sourceOptions), [sourceOptions]);
  const levelIdToValue = useMemo(() => getMasterIdToValue(levelOptions), [levelOptions]);
  const groupIdToValue = useMemo(() => getMasterIdToValue(groupOptions), [groupOptions]);
  const severityIdToValue = useMemo(() => getMasterIdToValue(severityOptions), [severityOptions]);
  const raisedByIdToValue = useMemo(() => getMasterIdToValue(raisedByOptions), [raisedByOptions]);
  const rootCauseCategoryIdToValue = useMemo(() => getMasterIdToValue(rootCauseCategoryOptions), [rootCauseCategoryOptions]);
  const siteIdToValue = useMemo(() => getMasterIdToValue(siteOptions), [siteOptions]);
  const ticketTypeIdToValue = useMemo(() => getMasterIdToValue(ticketTypeOptions), [ticketTypeOptions]);
  const clientNameIdToValue = useMemo(() => getMasterIdToValue(clientNameOptions), [clientNameOptions]);
  const itemIdToValue = useMemo(() => getMasterIdToValue(itemOptions), [itemOptions]);

  const formatIdOrName = (value, map) => {
    if (value === null || value === undefined || value === "") return "—";
    const s = String(value);
    return map?.[s] ?? "—";
  };

  const formatStatusValue = (ticket) => {
    const direct = ticket?.status?.value ?? ticket?.status?.name;
    if (direct) return direct;
    return formatIdOrName(ticket?.status?.id ?? ticket?.statusId, statusIdToValue);
  };

  const formatPriorityValue = (ticket) => {
    const direct = ticket?.priority?.value ?? ticket?.priority?.name;
    if (direct) return direct;
    return formatIdOrName(ticket?.priority?.id ?? ticket?.priorityId, priorityIdToValue);
  };

  const formatCategoryValue = (ticket) => {
    const direct = ticket?.category?.value ?? ticket?.category?.name;
    if (direct) return direct;
    return formatIdOrName(ticket?.category?.id ?? ticket?.categoryId, categoryIdToValue);
  };

  const formatSubcategoryValue = (ticket) => {
    const direct = ticket?.subcategory?.value ?? ticket?.subcategory?.name;
    if (direct) return direct;
    return formatIdOrName(ticket?.subcategory?.id ?? ticket?.subcategoryId, subcategoryIdToValue);
  };

  const formatAssignedTechnicianValue = (ticket) => {
    const direct = ticket?.assignedTo?.name || ticket?.assignedTo?.email;
    if (direct) return direct;
    return "—";
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchTicket() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/tickets/${id}`);
        if (!cancelled) setTicket(res.data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message ?? e.message ?? "Failed to load ticket.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTicket();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const header = useMemo(() => {
    const getHumanTicketId = () => {
      const num = ticket?.ticketNumber ?? ticket?.ticketId ?? ticket?.number;
      if (num !== undefined && num !== null && num !== "") return `#${String(num)}`;
      return ticket?.id ? `#${String(ticket.id).slice(0, 8).toUpperCase()}` : "—";
    };
    return {
      ticketId: getHumanTicketId(),
      subject: ticket?.subject || ticket?.title || "—",
      createdBy: ticket?.createdBy?.name || ticket?.createdBy?.email || "—",
      assignedTo: ticket?.assignedTo?.name || ticket?.assignedTo?.email || "—",
    };
  }, [ticket]);

  useEffect(() => {
    if (header.ticketId && header.ticketId !== "—") {
      setPageHeaderLabel(header.ticketId);
    }
    return () => clearPageHeaderLabel();
  }, [header.ticketId, setPageHeaderLabel, clearPageHeaderLabel]);

  const translateHistoryValue = (field, raw) => {
    if (raw === null || raw === undefined) return raw;
    const s = String(raw);
    if (field === "statusId") return statusIdToValue[s] ?? s;
    if (field === "priorityId") return priorityIdToValue[s] ?? s;

    // Detect verbose date strings (e.g. "Tue Jul 07 2026 21:43:01 GMT+0530 (India Standard Time)")
    // and reformat them simply, instead of showing the raw JS date string.
    if (/GMT|^\d{4}-\d{2}-\d{2}T/.test(s)) {
      const formatted = formatTime(s);
      if (formatted) return formatted;
    }
    return s;
  };

  const timelineEvents = useMemo(() => {
    const base = ticket?.history || [];
    return base
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((h) => {
        const field = (h?.field || "").toString();
        const title = field
          ? `Updated ${field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}`
          : "Ticket update";
        const description = field
          ? `from ${String(translateHistoryValue(field, h.oldValue ?? "—"))} to ${String(
              translateHistoryValue(field, h.newValue ?? "—")
            )}`
          : h?.notes || "";
        return {
          title,
          time: formatTime(h?.createdAt),
          description,
          meta: h?.user?.name ? `by ${h.user.name}` : "",
        };
      });
  }, [ticket, statusIdToValue, priorityIdToValue]);

  const timeElapsedText = useMemo(() => {
    if (!ticket?.createdAt) return "—";
    const start = new Date(ticket.createdAt);
    if (Number.isNaN(start.getTime())) return "—";
    const hasCompletedDate = ticket?.completedDate && String(ticket.completedDate).trim() !== "";
    const end = hasCompletedDate ? new Date(ticket.completedDate) : new Date();
    if (Number.isNaN(end.getTime())) return "—";
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    if (diffMs < 0) return "0m";
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(" ");
  }, [ticket]);

  const ticketStatusValue = ticket?.status?.value || ticket?.status?.name;
  const ticketPriorityValue = ticket?.priority?.value || ticket?.priority?.name;

  const onResolve = async () => {
    if (!ticket) return;
    try {
      const patchData = { remarks: resolveUpdate.notes?.trim() || undefined };
      await api.patch(`/tickets/${ticket.id}`, patchData);
      const res = await api.get(`/tickets/${ticket.id}`);
      setTicket(res.data);
      setResolveUpdate({ summary: "", rootCause: "", worklog: "", notes: "" });
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? "Failed to resolve.");
    }
  };
  const submitResolutionModal = async (form) => {
    if (!resolutionModal?.pendingStatusId || !ticket) return;
    setResolutionSaving(true);
    try {
      const combinedRemarks = form.notes || "";

      const payload = { statusId: resolutionModal.pendingStatusId, remarks: combinedRemarks };
      const priorityId = ticket?.priority?.id ?? ticket?.priorityId;
      if (priorityId) payload.priorityId = priorityId;

      const res = await api.patch(`/tickets/${ticket.id}`, payload);
      setTicket(res.data);
      setResolutionModal(null);
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? "Failed to update status.");
    } finally {
      setResolutionSaving(false);
    }
  };

  const handleStatusInterceptCheck = (newStatusId) => {
    const opt = (statusOptions || []).find((o) => String(o.id) === String(newStatusId));
    if (statusNeedsResolution(opt)) {
      setResolutionModal({ pendingStatusId: newStatusId });
      return true; // intercepted — modal will handle the actual patch
    }
    return false; // not intercepted — proceed with normal patch
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading ticket workspace..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: 24 }}>
          <EmptyState title="Failed to load ticket" desc={error || "Unknown error."} action={() => navigate("/tickets")} />
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout>
        <div style={{ padding: 24 }}>
          <EmptyState
            title="Ticket not found"
            desc={"The ticket may have been deleted or you may not have access."}
            action={() => navigate("/tickets")}
          />
        </div>
      </Layout>
    );
  }

  const assignedByline =
    ticket?.assignedByline ||
    (ticket?.assignedTo?.name ? ticket.assignedTo.name : ticket?.assignedTo?.email) ||
    (ticket?.assignedTo?.id ? String(ticket.assignedTo.id) : null);
  const createdByline = ticket?.createdBy?.name ? ticket.createdBy.name : ticket?.createdBy?.email;

  const slaDeadline = getSlaDeadlineFromTicket(ticket);
  const slaResult = getDeadlineCountdown(slaDeadline, ticket, now);
  const tatDeadline = getTatDeadlineFromTicket(ticket);
  const tatResult = getDeadlineCountdown(tatDeadline, ticket, now);
  const slaCountdownText = slaResult.label; // unchanged usages elsewhere on the page keep working

  const TABS = [
    { key: "details", label: "Details" },
    { key: "resolution", label: "Resolution" },
    { key: "tasks", label: "Tasks" },
    { key: "worklogs", label: "Work Logs" },
    { key: "history", label: "History" },
  ];

  const fieldRowProps = { editingKey, setEditingKey, reload: () => window.location.reload() };

  return (
    <Layout>
      <div style={{ fontFamily: T.font, minHeight: "calc(100vh - 120px)" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* ------------------------------------------------------------- */}
          {/* MAIN COLUMN                                                   */}
          {/* ------------------------------------------------------------- */}
          <section style={{ flex: 1, minWidth: 0 }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textFaint }}>
                  {header.ticketId}
                </div>
                <h1
                  title={header.subject}
                  style={{
                    margin: "4px 0 0",
                    fontSize: 16,
                    fontWeight: 600,
                    color: T.text,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {header.subject}
                </h1>
              </div>
              <Btn onClick={() => navigate("/tickets")} T={T}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </Btn>
            </div>

            {/* Badge row */}
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <StatusPill value={ticketStatusValue} T={T} />
              <Pill label="Priority" value={ticketPriorityValue} T={T} />
              <Pill label="SLA" value={slaCountdownText} T={T} />
              <Pill label="TAT" value={closedAwareLabel(tatResult, ticket, "TAT")} T={T} />
              <Pill label="Requester" value={ticket?.requesterName} T={T} />
              <Pill label="Assigned to" value={ticket?.assignedByline} T={T} />
            </div>

            {/* Tabs */}
            <div style={{ marginTop: 18 }}>
              <TabStrip tabs={TABS} active={activeTab} onChange={setActiveTab} T={T} />
            </div>

            {/* Tab content panel */}
            <div style={{ marginTop: 12, border: `1px solid ${T.border}`, borderRadius: T.radius, background: T.bg }}>
              <div style={{ padding: 18 }}>
                {activeTab === "details" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Description */}
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}>
                      <details open>
                        <summary
                          style={{
                            listStyle: "none",
                            cursor: "pointer",
                            userSelect: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            borderBottom: `1px solid ${T.borderSoft}`,
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textFaint }}>
                            Description
                          </span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                          </svg>
                        </summary>
                        {/*
                          TicketHtmlRenderer preserves the pasted content's
                          original fonts/colors as-is. It only steps in to
                          fix an individual element's text color when that
                          element would otherwise be unreadable against the
                          panel it's sitting on (e.g. black text with no
                          background, viewed in dark mode) — everything else
                          (font-family, other colors, layout) is left alone.
                        */}
                        <div style={{ padding: "14px 16px", maxHeight: 480, overflow: "auto", fontSize: 13.5 }}>
                          <TicketHtmlRenderer
                            html={ticket?.description}
                            pageBackground={T.bg}
                            readableTextColor={T.text}
                          />
                        </div>
                      </details>
                    </div>

                    {/* Field grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
                      <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: T.radiusSm, padding: "4px 14px" , minWidth: 0 }}>
                        <TicketPropertyRow ticket={ticket} label="Requester Name" value={ticket?.requesterName || ""} type="text" patchKey="requesterName" editable={false} isEditing={editingKey === "requesterName"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Subject" value={ticket?.subject || ticket?.title || ""} type="text" patchKey="subject" editable isEditing={editingKey === "subject"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Technician" value={ticket?.assignedTo?.name || ticket?.assignedTo?.email || ticket?.assignedToId || ""} type="select" patchKey="assignedToId" editable formatInputFromTicket={() => ticket?.assignedTo?.name || ticket?.assignedTo?.email || "Assigned"} isEditing={false} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Remarks" value={ticket?.remarks || ""} type="textarea" patchKey="remarks" editable isEditing={editingKey === "remarks"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Status" value={ticket?.status?.id ?? ticket?.statusId ?? ""} type="select" patchKey="statusId" masterDataType="STATUS" editable formatInputFromTicket={() => formatStatusValue(ticket)} isEditing={editingKey === "statusId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} onInterceptStatusChange={handleStatusInterceptCheck} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Source" value={ticket?.source?.id ?? ticket?.sourceId ?? ""} type="select" patchKey="sourceId" masterDataType="SOURCE" editable formatInputFromTicket={() => { const raw = ticket?.source?.id ?? ticket?.sourceId ?? ""; if (raw === null || raw === undefined || raw === "") return "—"; return sourceIdToValue?.[String(raw)] ?? "—"; }} isEditing={editingKey === "sourceId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Level" value={ticket?.level?.id ?? ticket?.levelId ?? ""} type="select" patchKey="levelId" masterDataType="LEVEL" editable formatInputFromTicket={() => formatIdOrName(ticket?.level?.id ?? ticket?.levelId ?? "", levelIdToValue)} isEditing={editingKey === "levelId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Group" value={ticket?.group?.id ?? ticket?.groupId ?? ""} type="select" patchKey="groupId" masterDataType="GROUP" editable formatInputFromTicket={() => formatIdOrName(ticket?.group?.id ?? ticket?.groupId ?? "", groupIdToValue)} isEditing={editingKey === "groupId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Seat Effected" value={ticket?.seatEffected?.id ?? ticket?.seatEffectedId ?? ""} type="select" patchKey="seatEffectedId" masterDataType="SEAT_EFFECTED" editable formatInputFromTicket={(value) => mapOptionLabel(seatEffectedOptions, value)} isEditing={editingKey === "seatEffectedId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Severity" value={ticket?.severity?.id ?? ticket?.severityId ?? ""} type="select" patchKey="severityId" masterDataType="SEVERITY" editable formatInputFromTicket={() => formatIdOrName(ticket?.severity?.id ?? ticket?.severityId ?? "", severityIdToValue)} isEditing={editingKey === "severityId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Raised By" value={ticket?.raisedBy?.id ?? ticket?.raisedById ?? ""} type="select" patchKey="raisedById" masterDataType="RAISED_BY" editable formatInputFromTicket={() => formatIdOrName(ticket?.raisedBy?.id ?? ticket?.raisedById ?? "", raisedByIdToValue)} isEditing={editingKey === "raisedById"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Reopened" value={ticket?.reopened === true ? "Yes" : ticket?.reopened === false ? "No" : "—"} type="text" patchKey="reopened" editable={false} isEditing={false} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Client Confirmation" value={ticket?.clientConfirmation?.id ?? ticket?.clientConfirmationId ?? ""} type="select" patchKey="clientConfirmationId" masterDataType="CLIENT_CONFIRMATION" editable formatInputFromTicket={(value) => mapOptionLabel(clientConfirmationOptions, value)} isEditing={editingKey === "clientConfirmationId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Department" value={ticket?.department?.id ?? ticket?.departmentId ?? ""} type="select" patchKey="departmentId" masterDataType="DEPARTMENT" editable formatInputFromTicket={(value) => mapOptionLabel(departmentOptions, value)} isEditing={editingKey === "departmentId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Due By Date" value={ticket?.dueDate ? ticket.dueDate.slice(0, 10) : ""} type="date" patchKey="dueDate" editable isEditing={editingKey === "dueDate"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Completed Date" value={formatTime(ticket?.completedDate)} type="text" patchKey={null} editable={false} isEditing={false} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Response Due By Time" value={ticket?.dueDate ? formatTime(ticket.dueDate) : "—"} type="text" patchKey={null} editable={false} isEditing={false} onTicketUpdated={() => window.location.reload()} T={T} />
                      </div>

                      <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: T.radiusSm, padding: "4px 14px" , minWidth: 0 }}>
                        <TicketPropertyRow ticket={ticket} label="Site" value={ticket?.site?.id ?? ticket?.siteId ?? ""} type="select" patchKey="siteId" masterDataType="SITE" editable formatInputFromTicket={() => formatIdOrName(ticket?.site?.id ?? ticket?.siteId ?? "", siteIdToValue)} isEditing={editingKey === "siteId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Ticket Type" value={ticket?.ticketType?.id ?? ticket?.ticketTypeId ?? ""} type="select" patchKey="ticketTypeId" masterDataType="TICKET_TYPE" editable formatInputFromTicket={() => formatIdOrName(ticket?.ticketType?.id ?? ticket?.ticketTypeId ?? "", ticketTypeIdToValue)} isEditing={editingKey === "ticketTypeId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Client Name" value={ticket?.clientName?.id ?? ticket?.clientNameId ?? ""} type="select" patchKey="clientNameId" masterDataType="CLIENT_NAME" editable formatInputFromTicket={(value) => mapOptionLabel(clientNameOptions, value)} isEditing={editingKey === "clientNameId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Priority" value={ticket?.priority?.id ?? ticket?.priorityId ?? ""} type="select" patchKey="priorityId" masterDataType="PRIORITY" editable formatInputFromTicket={() => formatPriorityValue(ticket)} isEditing={editingKey === "priorityId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Category" value={ticket?.category?.id ?? ticket?.categoryId ?? ""} type="select" patchKey="categoryId" masterDataType="CATEGORY" editable formatInputFromTicket={() => formatCategoryValue(ticket)} isEditing={editingKey === "categoryId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Subcategory" value={ticket?.subcategory?.id ?? ticket?.subcategoryId ?? ""} type="select" patchKey="subcategoryId" masterDataType="SUBCATEGORY" editable formatInputFromTicket={() => formatIdOrName(ticket?.subcategory?.id ?? ticket?.subcategoryId ?? "", subcategoryIdToValue)} isEditing={editingKey === "subcategoryId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Item" value={ticket?.item?.id ?? ticket?.itemId ?? ""} type="select" patchKey="itemId" masterDataType="ITEM" editable formatInputFromTicket={() => formatIdOrName(ticket?.item?.id ?? ticket?.itemId ?? "", itemIdToValue)} isEditing={editingKey === "itemId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Root Cause Category" value={ticket?.rootCauseCategory?.id ?? ticket?.rootCauseCategoryId ?? ""} type="select" patchKey="rootCauseCategoryId" masterDataType="ROOT_CAUSE_CATEGORY" editable formatInputFromTicket={() => formatIdOrName(ticket?.rootCauseCategory?.id ?? ticket?.rootCauseCategoryId ?? "", rootCauseCategoryIdToValue)} isEditing={editingKey === "rootCauseCategoryId"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="TAT" value={ticket?.tat ? ticket.tat.slice(0, 10) : ""} type="date" patchKey="tat" editable isEditing={editingKey === "tat"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Assigned On" value={ticket?.assignedOn ? ticket.assignedOn.slice(0, 10) : ""} type="date" patchKey="assignedOn" editable isEditing={editingKey === "assignedOn"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Estimated TAT Hours" value={ticket?.estimatedTatHrs ?? ""} type="number" patchKey="estimatedTatHrs" editable isEditing={editingKey === "estimatedTatHrs"} onRequestEdit={(k) => setEditingKey(k)} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Created By" value={ticket?.createdBy?.name || ticket?.createdBy?.email || ticket?.createdById || ""} type="text" patchKey={null} editable={false} isEditing={false} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="SLA" value={slaCountdownText} type="text" patchKey={null} editable={false} isEditing={false} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Created Date" value={formatTime(ticket?.createdAt)} type="text" patchKey={null} editable={false} isEditing={false} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Resolved Date" value={formatTime(ticket?.resolvedDate)} type="text" patchKey={null} editable={false} isEditing={false} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow ticket={ticket} label="Time Elapsed" value={timeElapsedText} type="text" patchKey={null} editable={false} isEditing={false} onTicketUpdated={() => window.location.reload()} T={T} />
                        <TicketPropertyRow
                          ticket={ticket}
                          label="Last Update"
                          value={(() => {
                            if (!ticket?.updatedAt) return "—";
                            const d = new Date(ticket.updatedAt);
                            if (Number.isNaN(d.getTime())) return "—";
                            const date = d.toLocaleDateString(undefined, { year: "numeric", month: "numeric", day: "numeric" });
                            const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                            return `${date} ${time}`;
                          })()}
                          type="text"
                          patchKey="updatedAt"
                          editable={false}
                          isEditing={editingKey === "updatedAt"}
                          onRequestEdit={(k) => setEditingKey(k)}
                          onTicketUpdated={() => window.location.reload()}
                          T={T}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "resolution" && (
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: "1 1 340px", maxWidth: 480 }}>
                      <LabelTextarea
                        label="Resolution Details"
                        value={resolveUpdate.notes}
                        onChange={(v) => setResolveUpdate((p) => ({ ...p, notes: v }))}
                        placeholder="Describe the resolution, root cause, and work performed…"
                        rows={7}
                        T={T}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Btn variant="primary" onClick={onResolve} T={T}>Submit Resolution</Btn>
                      </div>
                    </div>

                    <div style={{ flex: "1 1 260px", borderLeft: `1px solid ${T.borderSoft}`, paddingLeft: 24 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.textFaint, marginBottom: 12 }}>
                        Submitted Resolution
                      </div>
                      {(() => {
                        const parsed = parseResolutionRemarks(ticket?.remarks);
                        if (!parsed) {
                          return <div style={{ fontSize: 12.5, color: T.textMuted }}>No resolution submitted yet.</div>;
                        }
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {parsed.summary && <InfoRow label="Summary" value={parsed.summary} T={T} />}
                            {parsed.rootCause && <InfoRow label="Root Cause" value={parsed.rootCause} T={T} />}
                            {parsed.worklog && <InfoRow label="Worklog" value={parsed.worklog} T={T} />}
                            {parsed.notes && (
                              <div style={{ paddingTop: 9 }}>
                                <div style={{ fontSize: 11.5, fontWeight: 500, color: T.textMuted, marginBottom: 4 }}>Details</div>
                                <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text, whiteSpace: "pre-wrap" }}>
                                  {parsed.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {activeTab === "tasks" && <div style={{ fontSize: 13, color: T.textMuted }}>No tasks available.</div>}
                {activeTab === "worklogs" && <div style={{ fontSize: 13, color: T.textMuted }}>No worklogs available.</div>}

                {activeTab === "history" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {timelineEvents.length ? (
                      timelineEvents.map((event, idx) => <TimelineCard key={idx} event={event} T={T} />)
                    ) : (
                      <div style={{ fontSize: 13, color: T.textMuted }}>No history available.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SIDEBAR                                                       */}
          {/* ------------------------------------------------------------- */}
          <aside
            style={{
              width: opsCollapsed ? 40 : 264,
              flexShrink: 0,
              alignSelf: "flex-start",
              position: "sticky",
              top: 88,
              transition: "width 180ms ease",
            }}
          >
            <div
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: T.radius,
                background: T.bg,
                padding: opsCollapsed ? "12px 8px" : 18,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Collapse / expand toggle */}
              <button
                onClick={() => setOpsCollapsed((v) => !v)}
                title={opsCollapsed ? "Expand" : "Collapse"}
                style={{
                  position: "absolute",
                  top: 10,
                  right: opsCollapsed ? "50%" : 10,
                  transform: opsCollapsed ? "translateX(50%)" : "none",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  background: T.bgMuted,
                  cursor: "pointer",
                  padding: 0,
                  color: T.textMuted,
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ transform: opsCollapsed ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
                </svg>
              </button>

              {opsCollapsed ? (
                // Collapsed strip — just a vertical label
                <div
                  style={{
                    marginTop: 34,
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: T.textFaint,
                    textAlign: "center",
                  }}
                >
                  Overview
                </div>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: T.textFaint,
                      marginBottom: 14,
                      paddingRight: 28,
                    }}
                  >
                    Overview
                  </div>

                  <div>
                    <OpsRow label="Status" T={T}>
                      <StatusSelect ticket={ticket} statusOptions={statusOptions} T={T} onUpdated={setTicket} onNeedsResolution={(newId) => setResolutionModal({ pendingStatusId: newId })} />
                    </OpsRow>

                    <OpsRow label="SLA" T={T}>
                      <span style={{ color: toneToColor(slaResult.tone, T) }}>
                        {closedAwareLabel(slaResult, ticket, "SLA")}
                      </span>
                    </OpsRow>

                    <OpsRow label="Due by" T={T}>
                      {formatSlaDateTime(slaDeadline)}
                    </OpsRow>

                    <OpsRow label="TAT" T={T}>
                      {formatSlaDateTime(tatDeadline)}
                    </OpsRow>

                    <OpsRow label="TAT timer" T={T}>
                      <span style={{ color: toneToColor(tatResult.tone, T) }}>
                        {closedAwareLabel(tatResult, ticket, "TAT")}
                      </span>
                    </OpsRow>

                    <OpsRow label="Priority" T={T}>
                      {ticketPriorityValue || "—"}
                    </OpsRow>

                    <OpsRow label="Created by" T={T}>
                      {createdByline || "—"}
                    </OpsRow>

                    <OpsRow label="Assigned to" T={T} last>
                      {assignedByline || "—"}
                    </OpsRow>

                    {resolutionModal && (
                      <ResolutionModal
                        T={T}
                        saving={resolutionSaving}
                        onCancel={() => !resolutionSaving && setResolutionModal(null)}
                        onSubmit={submitResolutionModal}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
