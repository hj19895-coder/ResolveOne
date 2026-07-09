import { useMemo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import PremiumDashboardCard from "../components/ui/PremiumDashboardCard";
import DashboardAnalytics from "../components/ui/DashboardAnalytics";
import Badge from "../components/ui/Badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useTickets } from "../hooks/useTickets";
import { useAuth } from "../context/AuthContext";
import { useDashboardStats } from '../hooks/useDashboardStats';
import { getSlaDeadlineFromTicket } from "../utils/sla";

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

// Matches tickets-page date format: "Jun 3, 2026"
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#4318FF,#9f7aea)",
  "linear-gradient(135deg,#01b574,#05cd99)",
  "linear-gradient(135deg,#f6ad55,#ed8936)",
  "linear-gradient(135deg,#3182ce,#63b3ed)",
  "linear-gradient(135deg,#e53e3e,#fc8181)",
  "linear-gradient(135deg,#d53f8c,#f687b3)",
];
function avatarGradient(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Priority config — consistent with DashboardAnalytics
const PRIORITY_CFG = {
  P1: { label: "P1 Critical", bg: "#FEE2E2", color: "#DC2626", dot: "#EF4444" },
  P2: { label: "P2 High",     bg: "#FEF3C7", color: "#D97706", dot: "#F59E0B" },
  P3: { label: "P3 Medium",   bg: "#D1FAE5", color: "#059669", dot: "#10B981" },
  P4: { label: "P4 Low",      bg: "#DBEAFE", color: "#2563EB", dot: "#3B82F6" },
};
function getPriorityBucket(t) {
  const raw = String(t.priority?.value ?? t.priority?.name ?? "").toUpperCase();
  if (raw.includes("P1") || raw.includes("CRITICAL")) return PRIORITY_CFG.P1;
  if (raw.includes("P2") || raw.includes("HIGH"))     return PRIORITY_CFG.P2;
  if (raw.includes("P3") || raw.includes("NORMAL") || raw.includes("MEDIUM")) return PRIORITY_CFG.P3;
  return PRIORITY_CFG.P4;
}

// Status config
const STATUS_CFG = {
  open:        { label: "Open",        bg: "#EEF2FF", color: "#4F46E5" },
  "in progress":  { label: "In Progress", bg: "#DBEAFE", color: "#1D4ED8" },
  "in_progress":  { label: "In Progress", bg: "#DBEAFE", color: "#1D4ED8" },
  resolved:    { label: "Resolved",    bg: "#D1FAE5", color: "#065F46" },
  closed:      { label: "Closed",      bg: "#F3F4F6", color: "#374151" },
};
function getStatusCfg(t) {
  const raw = String(t.status?.value ?? t.status?.name ?? "").toLowerCase();
  return STATUS_CFG[raw] ?? { label: raw || "—", bg: "#F1F5F9", color: "#475569" };
}

const AVATAR_SHADES = ['#CBD5E1','#94A3B8','#64748B','#475569','#334155'];
function avatarShade(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_SHADES[Math.abs(h) % AVATAR_SHADES.length];
}

function UserChip({ user }) {
  const dark = typeof document !== 'undefined' && document.documentElement.dataset.dashboardTheme === 'dark';
  if (!user?.name) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 9px', borderRadius: 20,
        fontSize: 11.5, fontWeight: 500,
        background: dark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.09)',
        color: dark ? '#cbd5e1' : '#9CA3AF',
        border: `0.5px solid ${dark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.18)'}`,
      }}>
        Unassigned
      </span>
    );
  }
  const inits = user.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: 7,
        background: avatarShade(user.name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 9, fontWeight: 500,
        boxShadow: '0 1px 5px rgba(0,0,0,0.13)',
      }}>
        {inits}
      </div>
      <span style={{
        fontSize: 12, fontWeight: 400, color: dark ? '#e5e7eb' : '#111827',
        overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', maxWidth: 110,
      }}>
        {user.name}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { stats, loading, error, refetch } = useDashboardStats();
  const { tickets, loading: ticketsLoading } = useTickets('', '', false, '');
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("dashboard-theme") || "light";
  });

  useEffect(() => {
    const interval = setInterval(() => { refetch(); }, 60000);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    const handler = (event) => {
      const next = event?.detail;
      if (next === "dark" || next === "light") setTheme(next);
    };
    window.addEventListener("dashboard-theme-change", handler);
    return () => window.removeEventListener("dashboard-theme-change", handler);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.dashboardTheme = theme;
    window.localStorage.setItem("dashboard-theme", theme);
    return () => {
      document.documentElement.dataset.dashboardTheme = "";
    };
  }, [theme]);

  const isToday = (d) => {
    if (!d) return false;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return false;
    const now = new Date();
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
  };

  const normalize = (v = "") => v.toString().trim().toLowerCase();
  const statusMatchers = {
    open:       (s) => normalize(s) === "open",
    inProgress: (s) => { const n = normalize(s); return n === "in progress" || n === "in_progress"; },
    resolved:   (s) => normalize(s) === "resolved",
    closed:     (s) => normalize(s) === "closed",
  };
  const pickValue = (obj, keys = []) => { if (!obj) return undefined; for (const k of keys) { if (obj?.[k] != null) return obj[k]; } return undefined; };
  const getStatusName = (t) => pickValue(t?.status, ["name", "value", "id"]);
  const getPriorityKey = (t) => pickValue(t?.priority, ["value", "name", "id"]);
  const isOpenOrInProgress = (t) => { const s = getStatusName(t); return statusMatchers.open(s) || statusMatchers.inProgress(s); };
  const isClosedStatus = (t) => { const s = getStatusName(t); return statusMatchers.resolved(s) || statusMatchers.closed(s); };
  const priorityNormalize = (p) => normalize(p).replace(/\s+/g, "_");

  const priorityBreakdown  = stats?.priorityBreakdown  ?? { p1:0, p2:0, p3:0, p4:0 };


  const totalActiveTickets = stats?.totalActive        ?? 0;
  const createdToday       = stats?.createdToday       ?? 0;
  const closedToday        = stats?.closedToday        ?? 0;

  const createdSparkline   = stats?.createdSparkline   ?? [];

  const closedSparkline    = stats?.closedSparkline    ?? [];

  const totalActiveSparkline = stats?.totalActiveSparkline ?? [];

  

  const isSlaBreached = (t) => {
    if (!isOpenOrInProgress(t)) return false;
    const deadline = getSlaDeadlineFromTicket(t);
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };
  const getPriorityBucketRaw = (t) => { const raw = getPriorityKey(t) ?? ""; const m = raw.toString().match(/\b(P[1-4])\b/i); return m?.[1]?.toUpperCase() || ""; };
  const slaBreachedCount   = stats?.slaBreachedCount   ?? 0;
  const slaBreakdown       = stats?.slaBreakdown       ?? { critical:0, high:0, medium:0 };
  const unassignedCount    = stats?.unassignedCount    ?? 0;

  const { tickets: rawRecentTickets } = useTickets('', '', false, '');
  const recentTickets = rawRecentTickets.slice(0, 5);

  // Columns driven by role
  const columns = [
    { key: "id",      label: "Ticket #"   },
    { key: "subject", label: "Subject"    },
    { key: "status",  label: "Status"     },
    { key: "priority",label: "Priority"   },
    ...(isSuperAdmin ? [{ key: "createdBy", label: "Created By" }] : []),
    { key: "assignedTo", label: "Assigned To" },
    { key: "date",    label: "Date"       },
  ];
  if (typeof document !== 'undefined' && !document.getElementById('rt-blink-style')) {
    const s = document.createElement('style');
    s.id = 'rt-blink-style';
    s.textContent = `@keyframes rtDotBlink{0%,100%{opacity:1}50%{opacity:0.15}} .rt-blink{animation:rtDotBlink 1.35s ease-in-out infinite;}`;
    document.head.appendChild(s);
  }

  const dark = theme === "dark";
  const pageVars = {
    "--dash-bg": dark ? "#07111f" : "#f5f7fb",
    "--dash-surface": dark ? "rgba(12, 19, 34, 0.88)" : "#ffffff",
    "--dash-surface-2": dark ? "rgba(15, 23, 42, 0.74)" : "#f8fafc",
    "--dash-border": dark ? "rgba(148, 163, 184, 0.16)" : "#e5e7eb",
    "--dash-border-soft": dark ? "rgba(148, 163, 184, 0.1)" : "rgba(220,215,255,0.4)",
    "--dash-text": dark ? "#e5edf7" : "#111827",
    "--dash-text-soft": dark ? "#9fb0c7" : "#6b7280",
    "--dash-muted": dark ? "#74839a" : "#9CA3AF",
    "--dash-row-hover": dark ? "rgba(148,163,184,0.08)" : "rgba(0,0,0,0.02)",
    "--dash-table-head": dark ? "rgba(15, 23, 42, 0.96)" : "#f1f1f1",
    "--dash-pill": dark ? "rgba(99,102,241,0.16)" : "#eef2ff",
  };

  return (
    <Layout>
      <div className="space-y-6" style={{ padding: "0 16px", ...pageVars }}>
        {error && (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 text-sm font-medium"
            style={{ background: dark ? "rgba(127,29,29,0.26)" : "#FFF5F5", color: dark ? "#fca5a5" : "#E53E3E", border: `1px solid ${dark ? "rgba(248,113,113,0.24)" : "#FED7D7"}` }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Stats cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, maxWidth: 1160, margin: "0 auto", alignItems: "start" }}>
          <PremiumDashboardCard theme={theme} colorKey="indigo" iconKey="ticket" label="Total active tickets" sub="Open + in progress" counter={{ target: totalActiveTickets, durationMs: 900 }} pill={{ label: "Live", direction: "up" }} sparklineSeries={totalActiveSparkline} minHeight={245} />
          <PremiumDashboardCard theme={theme} colorKey="emerald" iconKey="plus" label="Created today" sub="New requests received" counter={{ target: createdToday, durationMs: 950 }} pill={{ label: `${createdToday} today`, direction: createdToday > 0 ? "up" : "neutral" }} sparklineSeries={createdSparkline} minHeight={245} />
          <PremiumDashboardCard theme={theme} colorKey="amber" iconKey="check" label="Closed today" sub="Resolved successfully" counter={{ target: closedToday, durationMs: 1000 }} pill={{ label: `${closedToday} resolved`, direction: closedToday > 0 ? "up" : "neutral" }} sparklineSeries={closedSparkline} minHeight={245} />
          <PremiumDashboardCard theme={theme} colorKey="rose" iconKey="bar" label="Priority breakdown" sub="Open + in progress" counter={{ target: totalActiveTickets, durationMs: 900 }} priorityBreakdown={priorityBreakdown} minHeight={245} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignSelf: "start" }}>
            <PremiumDashboardCard theme={theme} compact colorKey="orange" iconKey="warning" label="SLA breached" sub="Overdue open tickets" counter={{ target: slaBreachedCount, durationMs: 900 }} pill={{ label: slaBreachedCount > 0 ? `${slaBreachedCount} overdue` : "All on track", direction: slaBreachedCount > 0 ? "down" : "up" }} actionLabel="View tickets" onActionClick={() => navigate('/tickets?slaStatus=breached')} />
            <PremiumDashboardCard theme={theme} compact colorKey="slate" iconKey="user" label="Unassigned tickets" sub="Needs a technician" counter={{ target: unassignedCount, durationMs: 900 }} pill={{ label: unassignedCount > 0 ? `${unassignedCount} pending` : "All assigned", direction: unassignedCount > 0 ? "down" : "up" }} actionLabel="Assign tickets" onActionClick={() => navigate('/tickets?unassigned=true')} />
          </div>
        </div>
        <DashboardAnalytics theme={theme} tickets={rawRecentTickets} stats={stats} />

        {/* ── Recent Tickets ── */}
        <div style={{
          background: 'var(--dash-surface)',
          borderRadius: 16,
          border: '1px solid var(--dash-border)',
          boxShadow: dark ? '0 18px 50px rgba(2, 6, 23, 0.45)' : '0 1px 4px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '0.5px solid var(--dash-border-soft)',
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--dash-text)' }}>Recent Tickets</h2>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ padding: '64px 0' }}>
              <LoadingSpinner fullPage text="Loading dashboard data..." />
            </div>
          ) : recentTickets.length === 0 ? (
            <div style={{ padding: '64px 0' }}>
              <EmptyState
                title="No tickets yet"
                desc="Get started by creating your first support ticket."
                action={
                  <button
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '8px 16px', borderRadius: 12, border: 'none',
                      fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
                      marginTop: 16, background: 'linear-gradient(135deg,#4318FF,#6c47ff)',
                    }}
                    onClick={() => navigate("/tickets/new")}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create first ticket
                  </button>
                }
              />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'separate', borderSpacing: 0,
                fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
              }}>

                {/* Column headers — TicketTable style */}
                <thead>
                  <tr style={{ background: 'var(--dash-table-head)', borderBottom: '0.5px solid var(--dash-border-soft)' }}>
                    {[
                      { label: 'ID',          icon: 'hash'          },
                      { label: 'Subject',     icon: 'text-size'     },
                      { label: 'Status',      icon: 'circle-dot'    },
                      { label: 'Priority',    icon: 'flag'          },
                      ...(isSuperAdmin ? [{ label: 'Created By', icon: 'user' }] : []),
                      { label: 'Assigned To', icon: 'user-circle'   },
                      { label: 'Date',        icon: 'calendar'      },
                    ].map(col => (
                      <th key={col.label} style={{ padding: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '0 13px', height: 34,
                        }}>
                          <i className={`ti ti-${col.icon}`} style={{ fontSize: 11, color: dark ? 'rgba(165,180,252,0.65)' : 'rgba(110,99,231,0.4)', flexShrink: 0 }} />
                          <span style={{
                            fontSize: 10.5, fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.07em',
                            color: dark ? '#9fb0c7' : 'rgba(0,0,0,0.55)', whiteSpace: 'nowrap',
                          }}>
                            {col.label}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Rows */}
                <tbody>
                  {recentTickets.map((t) => {
                    // ── ticket id
                    const ticketId = t.ticketNumber
                      ? `#${t.ticketNumber}`
                      : t.id ? `#${parseInt(t.id, 10) || t.id}` : '—';

                    // ── status
                    const statusRaw = String(t.status?.value ?? t.status?.name ?? '');
                    const statusUp  = statusRaw.toUpperCase().replace(/[-\s]+/g, '_');
                    const statusStyle = (() => {
                      if (statusUp.includes('OPEN'))        return { bg: 'rgba(59,130,246,0.09)',  color: '#1d4ed8', dot: '#3b82f6',  ring: 'rgba(59,130,246,0.2)'  };
                      if (statusUp.includes('IN_PROGRESS')) return { bg: 'rgba(245,158,11,0.09)',  color: '#92400e', dot: '#f59e0b',  ring: 'rgba(245,158,11,0.22)' };
                      if (statusUp.includes('RESOLVED'))    return { bg: 'rgba(16,185,129,0.09)',  color: '#065f46', dot: '#10b981',  ring: 'rgba(16,185,129,0.2)'  };
                      if (statusUp.includes('CLOSED'))      return { bg: 'rgba(34,197,94,0.09)',   color: '#14532d', dot: '#22c55e',  ring: 'rgba(34,197,94,0.2)'   };
                      return { bg: 'rgba(148,163,184,0.1)', color: '#374151', dot: '#94a3b8', ring: 'rgba(148,163,184,0.2)' };
                    })();

                    // ── priority
                    const priRaw = String(t.priority?.value ?? t.priority?.name ?? '');
                    const priUp  = priRaw.toUpperCase().replace(/[-\s]+/g, '_');
                    const priStyle = (() => {
                      const isActive = statusUp.includes('OPEN') || statusUp.includes('IN_PROGRESS');
                      if (!isActive) return { color: dark ? '#94a3b8' : '#374151', dot: '#94a3b8', glow: null, blink: false };
                      if (priUp.includes('P1') || priUp.includes('CRITICAL'))
                        return { color: '#b91c1c', dot: '#ef4444', glow: 'rgba(239,68,68,0.7)', blink: true  };
                      if (priUp.includes('P2') || priUp.includes('HIGH'))
                        return { color: '#92400e', dot: '#f59e0b', glow: 'rgba(245,158,11,0.6)', blink: true  };
                      if (priUp.includes('P3') || priUp.includes('MEDIUM'))
                        return { color: '#065f46', dot: '#10b981', glow: null, blink: false };
                      return { color: dark ? '#94a3b8' : '#374151', dot: '#94a3b8', glow: null, blink: false };
                    })();

                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/tickets/${t.id}`)}
                        style={{ cursor: 'pointer', transition: 'background 0.12s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dash-row-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* ID */}
                        <td style={{ padding: 0, borderBottom: '1px solid var(--dash-border-soft)', verticalAlign: 'middle' }}>
                          <div style={{ padding: '7px 13px' }}>
                            <span style={{
                              fontSize: 11.5, fontWeight: 420, color: 'var(--dash-text-soft)',
                              fontFamily: 'Inter, -apple-system, sans-serif',
                              letterSpacing: '-0.01em',
                            }}>
                              {ticketId}
                            </span>
                          </div>
                        </td>

                        {/* Subject */}
                        <td style={{ padding: 0, borderBottom: '1px solid var(--dash-border-soft)', verticalAlign: 'middle', maxWidth: 260 }}>
                          <div style={{ padding: '7px 13px' }}>
                            <span style={{
                              fontSize: 12, fontWeight: 400, color: 'var(--dash-text)',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', display: 'block',
                              letterSpacing: '0.2px',
                            }}>
                              {t.subject ?? t.title ?? '—'}
                            </span>
                          </div>
                        </td>

                        {/* Status — pill, no dropdown */}
                        <td style={{ padding: 0, borderBottom: '1px solid var(--dash-border-soft)', verticalAlign: 'middle' }}>
                          <div style={{ padding: '7px 13px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '3px 10px 3px 7px', borderRadius: 20,
                              fontSize: 11.5, fontWeight: 400,
                              background: statusStyle.bg, color: statusStyle.color,
                              border: `0.5px solid ${statusStyle.ring}`,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusStyle.dot, flexShrink: 0 }} />
                              {statusRaw || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Priority — dot + label, no pill background */}
                        <td style={{ padding: 0, borderBottom: '1px solid var(--dash-border-soft)', verticalAlign: 'middle' }}>
                          <div style={{ padding: '7px 13px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20 }}>
                              <span
                                className={priStyle.blink ? 'rt-blink' : ''}
                                style={{
                                  width: 7, height: 7, borderRadius: '50%',
                                  background: priStyle.dot, flexShrink: 0,
                                  boxShadow: priStyle.glow ? `0 0 7px ${priStyle.glow}` : 'none',
                                }}
                              />
                              <span style={{ fontSize: 11.5, fontWeight: 450, color: priStyle.color, whiteSpace: 'nowrap' }}>
                                {priRaw || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Created By — super admin only */}
                        {isSuperAdmin && (
                          <td style={{ padding: 0, borderBottom: '1px solid var(--dash-border-soft)', verticalAlign: 'middle' }}>
                            <div style={{ padding: '7px 13px' }}>
                              <UserChip user={t.createdBy} />
                            </div>
                          </td>
                        )}

                        {/* Assigned To */}
                        <td style={{ padding: 0, borderBottom: '1px solid var(--dash-border-soft)', verticalAlign: 'middle' }}>
                          <div style={{ padding: '7px 13px' }}>
                            <UserChip user={t.assignedTo} />
                          </div>
                        </td>

                        {/* Date */}
                        <td style={{ padding: 0, borderBottom: '1px solid var(--dash-border-soft)', verticalAlign: 'middle' }}>
                          <div style={{ padding: '7px 13px' }}>
                              <span style={{ fontSize: 11.5, color: 'var(--dash-muted)', whiteSpace: 'nowrap' }}>
                              {formatDate(t.createdAt)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {!loading && recentTickets.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 20px', borderTop: '0.5px solid var(--dash-border-soft)',
              background: dark ? 'rgba(7,17,31,0.9)' : 'rgba(250,249,255,0.97)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--dash-muted)' }}>
                Showing <span style={{ fontWeight: 600, color: 'var(--dash-text)' }}>{recentTickets.length}</span> most recent tickets
              </span>
              <button
                onClick={() => navigate("/tickets")}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, color: '#4F46E5',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#4338CA'}
                onMouseLeave={e => e.currentTarget.style.color = '#4F46E5'}
              >
                View all tickets
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
