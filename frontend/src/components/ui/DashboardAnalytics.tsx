import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, UserCheck, PlusCircle,
  Loader2, ArrowRight, TrendingUp, TrendingDown, Minus, ChevronDown,
} from "lucide-react";
import AiInsightsBot from "./Aiinsightsbot";
import { getSlaDeadlineFromTicket } from "../../utils/sla";



// ─── shared helpers ────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "#EEF2FF", color: "#4F46E5" },
  { bg: "#ECFDF5", color: "#059669" },
  { bg: "#FEF3C7", color: "#D97706" },
  { bg: "#FEE2E2", color: "#DC2626" },
  { bg: "#FCE7F3", color: "#DB2777" },
  { bg: "#DBEAFE", color: "#2563EB" },
];
function avatarPalette(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(name = "") {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const PRIORITY_CFG = [
  { label: "P1 Critical", color: "#EF4444", match: (r) => r.includes("P1") || r.includes("CRITICAL") },
  { label: "P2 High",     color: "#F59E0B", match: (r) => r.includes("P2") || r.includes("HIGH") },
  { label: "P3 Medium",   color: "#10B981", match: (r) => r.includes("P3") || r.includes("NORMAL") || r.includes("MEDIUM") },
  { label: "P4 Low",      color: "#3B82F6", match: () => true },
];
function priorityBucket(t) {
  const raw = String(t.priority?.value ?? t.priority?.name ?? "").toUpperCase().replace(/\s+/g, "_");
  for (const cfg of PRIORITY_CFG) if (cfg.match(raw)) return cfg;
  return PRIORITY_CFG[3];
}
function isClosed(t) {
  const s = String(t.status?.value ?? t.status?.name ?? "").toLowerCase();
  return s === "resolved" || s === "closed";
}
function isOpenOrInProgress(t) {
  const s = String(t.status?.value ?? t.status?.name ?? "").toLowerCase();
  return s === "open" || s === "in progress" || s === "in_progress";
}
function isSlaBreached(t) {
  if (!isOpenOrInProgress(t)) return false;
  const dl = getSlaDeadlineFromTicket(t);
  if (!dl) return false;
  return new Date(dl) < new Date();
}
function isSlaAtRisk(t) {
  if (!isOpenOrInProgress(t)) return false;
  const dl = getSlaDeadlineFromTicket(t);
  if (!dl) return false;
  const remaining = new Date(dl).getTime() - Date.now();
  return remaining > 0 && remaining < 4 * 3600 * 1000;
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function timeAgoStr(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

// ─── Build trend buckets for each range ──────────────────────────────────────

function buildTrendData(tickets, range) {
  const now = new Date();

  if (range === "day") {
    return Array.from({ length: 24 }, (_, h) => {
      const label = `${h.toString().padStart(2, "0")}:00`;
      const created = tickets.filter((t) => {
        if (!t.createdAt) return false;
        const d = new Date(t.createdAt);
        return sameDay(d, now) && d.getHours() === h;
      }).length;
      const closed = tickets.filter((t) => {
        if (!isClosed(t)) return false;
        const ca = t.resolvedAt ?? t.closedAt ?? t.updatedAt;
        if (!ca) return false;
        const d = new Date(ca);
        return sameDay(d, now) && d.getHours() === h;
      }).length;
      return { label, created, closed };
    });
  }

  if (range === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      const created = tickets.filter((t) => t.createdAt && sameDay(new Date(t.createdAt), d)).length;
      const closed = tickets.filter((t) => {
        if (!isClosed(t)) return false;
        const ca = t.resolvedAt ?? t.closedAt ?? t.updatedAt;
        return ca && sameDay(new Date(ca), d);
      }).length;
      return { label: fmtDate(d), created, closed };
    });
  }

  return Array.from({ length: 5 }, (_, i) => {
    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const inRange = (dateStr) => {
      if (!dateStr) return false;
      const t = new Date(dateStr).getTime();
      return t >= weekStart.getTime() && t <= weekEnd.getTime();
    };
    const created = tickets.filter((t) => inRange(t.createdAt)).length;
    const closed = tickets.filter((t) => {
      if (!isClosed(t)) return false;
      return inRange(t.resolvedAt ?? t.closedAt ?? t.updatedAt);
    }).length;
    return { label: `${fmtDate(weekStart)}–${fmtDate(weekEnd)}`, created, closed };
  }).reverse();
}

// ─── InsightsCard ─────────────────────────────────────────────────────────────

function InsightsCard({ tickets = [], theme = "light" }) {
  const dark = theme === "dark";
  const navigate = useNavigate();
  const insights = useMemo(() => {
    const now = new Date();
    const todayStart     = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const countDay = (start, end) =>
      tickets.filter((t) => {
        if (!t.createdAt) return false;
        const d = new Date(t.createdAt).getTime();
        return d >= start.getTime() && d < end.getTime();
      }).length;

    const todayCount     = countDay(todayStart, now);
    const yesterdayCount = countDay(yesterdayStart, todayStart);

    let growthDir   = "neutral";
    let growthTitle = "No new tickets today";
    let growthSub   = "Same as yesterday";

    if (yesterdayCount === 0 && todayCount === 0) {
      growthTitle = "No tickets yet today";
      growthSub   = "Nothing created yet";
    } else if (yesterdayCount === 0 && todayCount > 0) {
      growthDir   = "down";
      growthTitle = `${todayCount} ticket${todayCount > 1 ? "s" : ""} created today`;
      growthSub   = "No tickets yesterday";
    } else {
      const growthPct = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
      if (growthPct > 0) {
        growthDir   = "down";
        growthTitle = `Tickets increased ${growthPct}%`;
        growthSub   = "Compared to yesterday";
      } else if (growthPct < 0) {
        growthDir   = "up";
        growthTitle = `Tickets decreased ${Math.abs(growthPct)}%`;
        growthSub   = "Compared to yesterday";
      } else {
        growthTitle = "Ticket volume steady";
        growthSub   = "Same as yesterday";
      }
    }

    const slaTickets = tickets.filter((t) => t.priority?.value || t.priority?.name);
    const breachedCount = slaTickets.filter(isSlaBreached).length;
    const atRiskCount   = slaTickets.filter(isSlaAtRisk).length;
    const withinCount   = slaTickets.length - breachedCount - atRiskCount;
    const totalForSla   = slaTickets.length || 1;
    const slaPct        = Math.round((withinCount / totalForSla) * 100);

    let slaDir   = "good";
    let slaTitle = "";
    let slaSub   = `${slaPct}% SLA compliance`;
    if (slaPct >= 95)      { slaDir = "good";   slaTitle = "SLA performance excellent"; slaSub = "All SLAs are within target"; }
    else if (slaPct >= 80) { slaDir = "warn";   slaTitle = "SLA performance good";      slaSub = `${slaPct}% compliance — monitor closely`; }
    else                   { slaDir = "danger"; slaTitle = "SLA needs attention";        slaSub = `${slaPct}% compliance — action required`; }

    const THREE_DAYS_MS = 3 * 24 * 3600 * 1000;
    const needAttention = tickets.filter((t) => {
      const raw = String(t.priority?.value ?? t.priority?.name ?? "").toUpperCase();
      const isP1 = raw.includes("P1") || raw.includes("CRITICAL");
      if (isP1 && isOpenOrInProgress(t)) return true;
      if (isSlaBreached(t) || isSlaAtRisk(t)) return true;
      const age = t.createdAt ? Date.now() - new Date(t.createdAt).getTime() : 0;
      if (age > THREE_DAYS_MS && !isClosed(t)) return true;
      return false;
    }).length;

    const attDir   = needAttention === 0 ? "good" : needAttention <= 3 ? "warn" : "danger";
    const attTitle = needAttention === 0 ? "All tickets on track" : `${needAttention} ticket${needAttention > 1 ? "s" : ""} need attention`;
    const attSub   = needAttention === 0 ? "No immediate action required" : "Require immediate action";

    return [
      { dir: growthDir, title: growthTitle, sub: growthSub },
      { dir: slaDir,    title: slaTitle,    sub: slaSub    },
      { dir: attDir,    title: attTitle,    sub: attSub    },
    ];
  }, [tickets]);

  const dirCfg = {
    up:      { outerBg: dark ? "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(15,23,42,0.9))" : "#f0fdf4", iconBg: dark ? "rgba(34,197,94,0.18)" : "#dcfce7", iconColor: "#16a34a", Icon: TrendingUp   },
    down:    { outerBg: dark ? "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(15,23,42,0.9))" : "#fef9f0", iconBg: dark ? "rgba(245,158,11,0.18)" : "#fef3c7", iconColor: "#d97706", Icon: TrendingDown  },
    neutral: { outerBg: dark ? "linear-gradient(135deg, rgba(51,65,85,0.92), rgba(15,23,42,0.96))" : "#f8fafc", iconBg: dark ? "rgba(148,163,184,0.14)" : "#f1f5f9", iconColor: "#64748b", Icon: Minus         },
    good:    { outerBg: dark ? "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(15,23,42,0.9))" : "#f0fdf4", iconBg: dark ? "rgba(34,197,94,0.18)" : "#dcfce7", iconColor: "#16a34a", Icon: CheckCircle2  },
    warn:    { outerBg: dark ? "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(15,23,42,0.9))" : "#fffbeb", iconBg: dark ? "rgba(245,158,11,0.18)" : "#fef3c7", iconColor: "#d97706", Icon: AlertTriangle  },
    danger:  { outerBg: dark ? "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(15,23,42,0.9))" : "#fef2f2", iconBg: dark ? "rgba(239,68,68,0.16)" : "#fee2e2", iconColor: "#dc2626", Icon: AlertTriangle  },
  };
  const titleColor = {
    up: dark ? "#86efac" : "#15803d",
    down: dark ? "#fdba74" : "#b45309",
    neutral: dark ? "#dbe5f3" : "#475569",
    good: dark ? "#86efac" : "#15803d",
    warn: dark ? "#fdba74" : "#b45309",
    danger: dark ? "#fca5a5" : "#b91c1c",
  };

  return (
    <div className="rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow" style={{ background: dark ? "rgba(12, 19, 34, 0.88)" : "#fff", border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid #e5e7eb" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium" style={{ color: dark ? "#e5edf7" : "#374151" }}>Insights</h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: dark ? "rgba(99,102,241,0.18)" : "#EEF2FF", color: dark ? "#c7d2fe" : "#4F46E5" }}>Live</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {insights.map((item, index) => {
          const cfg = dirCfg[item.dir] ?? dirCfg.neutral;
          const Icon = cfg.Icon;
          const isAttentionRow = index === 2; // "needs attention" insight — links to breached/at-risk tickets
          return (
            <div
              key={index}
              onClick={isAttentionRow ? () => navigate('/tickets?slaStatus=attention') : undefined}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: cfg.outerBg,
                border: dark ? "1px solid rgba(148,163,184,0.10)" : "none",
                boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.03)" : "none",
                cursor: isAttentionRow ? "pointer" : "default",
                transition: "transform 0.12s ease",
              }}
              onMouseEnter={isAttentionRow ? (e) => (e.currentTarget.style.transform = "scale(1.015)") : undefined}
              onMouseLeave={isAttentionRow ? (e) => (e.currentTarget.style.transform = "scale(1)") : undefined}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.iconBg }}>
                <Icon style={{ width: 15, height: 15, color: cfg.iconColor }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: titleColor[item.dir] }}>{item.title}</p>
                <p className="text-[11px] truncate" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Range dropdown ───────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { value: "day",   label: "Today"       },
  { value: "week",  label: "Last 7 days" },
  { value: "month", label: "Last 30 days"},
];

function RangeDropdown({ value, onChange, theme = "light" }) {
  const [open, setOpen] = useState(false);
  const selected = RANGE_OPTIONS.find((o) => o.value === value);
  const dark = theme === "dark";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
        style={{ color: dark ? "#dbe5f3" : "#4b5563", background: dark ? "rgba(15,23,42,0.9)" : "#f9fafb", border: dark ? "1px solid rgba(148,163,184,0.16)" : "1px solid #e5e7eb" }}
      >
        {selected?.label}
        <ChevronDown style={{ width: 13, height: 13 }} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-10 overflow-hidden min-w-[130px]" style={{ background: dark ? "#0f172a" : "#fff", border: dark ? "1px solid rgba(148,163,184,0.16)" : "1px solid #e5e7eb" }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-xs transition-colors"
              style={{ color: opt.value === value ? (dark ? "#c7d2fe" : "#4338ca") : (dark ? "#dbe5f3" : "#374151"), background: opt.value === value ? (dark ? "rgba(99,102,241,0.14)" : "#eef2ff") : "transparent" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DashboardAnalytics({ tickets = [], stats = null, theme = "light" }) {
  const navigate = useNavigate();
  const [trendRange, setTrendRange] = useState("week");
  const dark = theme === "dark";

  // ── 1. slaData ──────────────────────────────────────────────────────────────
  const slaData = useMemo(() => {
    let within = 0, atRisk = 0, breached = 0;
    const now = new Date();

    tickets.forEach((t) => {
      const deadline = getSlaDeadlineFromTicket(t); // priority-based, from createdAt
      if (!deadline) return;

      if (isClosed(t)) {
          const resolvedTime =
              t.resolvedDate ??
              t.completedDate ??
              t.closedAt ??
              t.resolvedAt ??
              t.updatedAt;

          if (!resolvedTime) return;

          if (new Date(resolvedTime) > deadline) {
              breached++;
          } else {
              within++;
          }
      } else if (isOpenOrInProgress(t)) {
        // Still open → compare deadline against right now
        if (deadline < now) {
          breached++;
        } else if (deadline.getTime() - now.getTime() < 4 * 3600 * 1000) {
          atRisk++;
        } else {
          within++;
        }
      }
    });

    const total = within + atRisk + breached || 1;
    return { within, atRisk, breached, pct: Math.round((within / total) * 100) };
  }, [tickets]);

  // ── 2. agentPerf ────────────────────────────────────────────────────────────
  const agentPerf = useMemo(() => {
    if (stats?.topPerformers) {
      return stats.topPerformers.map(p => ({ name: p.user.name, count: p.count }));
    }
    const map = new Map();
    tickets.forEach(t => {
      if (!isClosed(t) || !t.assignedTo?.name) return;
      const n = t.assignedTo.name;
      map.set(n, (map.get(n) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [tickets, stats]);

  const maxResolved = Math.max(...agentPerf.map((a) => a.count), 1);

  const trendData = useMemo(() => buildTrendData(tickets, trendRange), [tickets, trendRange]);

  // ── 3. flowStats ────────────────────────────────────────────────────────────
  const flowStats = useMemo(() => {
    if (stats && stats.totalActive != null) {
      const total    = stats.totalTickets ?? stats.totalActive;
      const assigned = stats.totalAssigned ?? (stats.totalActive - (stats.unassignedCount ?? 0));
      const resolved = stats.totalResolved ?? 0;
      return {
        total,
        assigned,
        inProgress:  stats.totalInProgress ?? 0,
        resolved,
        assignRate:  total > 0 ? Math.round((assigned / total) * 100) : 0,
        resolveRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        inProgRate:  0,
        deltaCreated:    { pct: 0, dir: "neutral" },
        deltaAssigned:   { pct: 0, dir: "neutral" },
        deltaInProgress: { pct: 0, dir: "neutral" },
        deltaResolved:   { pct: 0, dir: "neutral" },
      };
    }
    
    

    // ── 3b. todayFlowStats — Ticket Flow card ke liye, STRICTLY today-only ──────

    const now            = new Date();
    const todayStart     = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const createdInWindow  = (t, start, end) => { if (!t.createdAt) return false; const d = new Date(t.createdAt).getTime(); return d >= start.getTime() && d < end.getTime(); };
    const resolvedInWindow = (t, start, end) => { if (!isClosed(t)) return false; const ca = t.resolvedAt ?? t.closedAt ?? t.updatedAt; if (!ca) return false; const d = new Date(ca).getTime(); return d >= start.getTime() && d < end.getTime(); };
    const total      = tickets.length;
    const assigned   = tickets.filter(t => t.assignedTo || t.assignedToId).length;
    const inProgress = tickets.filter(t => String(t.status?.value ?? t.status?.name ?? "").toLowerCase().includes("progress")).length;
    const resolved   = tickets.filter(isClosed).length;
    const delta = (today, yest) => { if (yest === 0 && today === 0) return { pct: 0, dir: "neutral" }; if (yest === 0) return { pct: 100, dir: "up" }; const pct = Math.round(((today - yest) / yest) * 100); return { pct: Math.abs(pct), dir: pct > 0 ? "up" : pct < 0 ? "down" : "neutral" }; };
    return {
      total, assigned, inProgress, resolved,
      assignRate:      total > 0 ? Math.round((assigned   / total) * 100) : 0,
      resolveRate:     total > 0 ? Math.round((resolved   / total) * 100) : 0,
      inProgRate:      total > 0 ? Math.round((inProgress / total) * 100) : 0,
      deltaCreated:    delta(tickets.filter(t => createdInWindow(t, todayStart, now)).length,    tickets.filter(t => createdInWindow(t, yesterdayStart, todayStart)).length),
      deltaAssigned:   delta(tickets.filter(t => (t.assignedTo || t.assignedToId) && createdInWindow(t, todayStart, now)).length, tickets.filter(t => (t.assignedTo || t.assignedToId) && createdInWindow(t, yesterdayStart, todayStart)).length),
      deltaInProgress: delta(0, 0),
      deltaResolved:   delta(tickets.filter(t => resolvedInWindow(t, todayStart, now)).length,   tickets.filter(t => resolvedInWindow(t, yesterdayStart, todayStart)).length),
    };
  }, [tickets, stats]);

    const todayFlowStats = useMemo(() => {
    const delta = (today, yest) => {
      if (yest === 0 && today === 0) return { pct: 0, dir: "neutral" };
      if (yest === 0) return { pct: 100, dir: "up" };
      const pct = Math.round(((today - yest) / yest) * 100);
      return { pct: Math.abs(pct), dir: pct > 0 ? "up" : pct < 0 ? "down" : "neutral" };
    };

    const createdToday      = stats?.createdToday      ?? 0;
    const createdYesterday  = stats?.createdYesterday  ?? 0;
    const assignedToday     = stats?.assignedToday     ?? 0;
    const assignedYesterday = stats?.assignedYesterday ?? 0;
    const inProgToday       = stats?.inProgressToday    ?? 0;
    const inProgYesterday   = stats?.inProgressYesterday ?? 0;
    const resolvedToday     = stats?.closedToday        ?? 0;
    const resolvedYesterday = stats?.closedYesterday     ?? 0;

    return {
      total: createdToday,
      assigned: assignedToday,
      inProgress: inProgToday,
      resolved: resolvedToday,
      assignRate:  createdToday > 0 ? Math.round((assignedToday / createdToday) * 100) : 0,
      resolveRate: createdToday > 0 ? Math.round((resolvedToday / createdToday) * 100) : 0,
      inProgRate:  createdToday > 0 ? Math.round((inProgToday   / createdToday) * 100) : 0,
      deltaCreated:    delta(createdToday, createdYesterday),
      deltaAssigned:   delta(assignedToday, assignedYesterday),
      deltaInProgress: delta(inProgToday, inProgYesterday),
      deltaResolved:   delta(resolvedToday, resolvedYesterday),
    };
  }, [stats]);

  // ── 4. aiInsights — MUST come after slaData and flowStats ───────────────────
  const aiInsights = useMemo(() => {
    const now        = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1);

    const countCreated = (start, end) =>
      tickets.filter(t => {
        if (!t.createdAt) return false;
        const d = new Date(t.createdAt).getTime();
        return d >= start.getTime() && d < end.getTime();
      }).length;

    // 1 — Workload today vs yesterday
    const todayCount = countCreated(todayStart, now);
    const yestCount  = countCreated(yestStart, todayStart);
    let workloadValue;
    if (yestCount === 0 && todayCount === 0) {
      workloadValue = "No tickets created today";
    } else if (yestCount === 0) {
      workloadValue = `${todayCount} ticket${todayCount > 1 ? "s" : ""} so far today`;
    } else {
      const pct = Math.round(((todayCount - yestCount) / yestCount) * 100);
      workloadValue = pct === 0
        ? "Same volume as yesterday"
        : pct > 0
        ? `${pct}% higher than yesterday`
        : `${Math.abs(pct)}% lower than yesterday`;
    }
    const workloadType = yestCount > 0 && todayCount < yestCount ? "success" : "trend";

    // 2 — SLA prediction (uses slaData computed above)
    const breachCount = slaData.breached + slaData.atRisk;
    const slaValue    = breachCount === 0
      ? "All tickets within SLA"
      : `${breachCount} ticket${breachCount > 1 ? "s" : ""} may breach soon`;
    const slaType = breachCount === 0 ? "success" : slaData.breached > 0 ? "warning" : "info";
    const slaScore = slaData.breached > 0 ? 95 : slaData.atRisk > 0 ? 75 : 20;

    // 3 — Unassigned suggestion (prefers backend stats, falls back to tickets)
    const unassigned = stats?.unassignedCount ??
      tickets.filter(t => !t.assignedTo && !t.assignedToId && isOpenOrInProgress(t)).length;
    const suggValue = unassigned === 0
      ? "All open tickets are assigned"
      : `Assign ${unassigned} pending ticket${unassigned > 1 ? "s" : ""}`;
    const suggType = unassigned === 0 ? "success" : "info";
    const suggScore = unassigned > 5 ? 82 : unassigned > 0 ? 62 : 18;

    // 4 — Resolution rate (uses flowStats computed above)
    const { resolveRate, resolved } = flowStats;
    let trendValue;
    if (resolveRate >= 80)   trendValue = `Strong — ${resolveRate}% resolved today`;
    else if (resolveRate >= 50) trendValue = `${resolveRate}% resolved, keep going`;
    else if (resolved === 0) trendValue = "No tickets resolved yet today";
    else                     trendValue = `${resolved} resolved so far today`;
    const trendType = resolveRate >= 80 ? "success" : resolveRate >= 50 ? "trend" : "info";
    const trendScore = resolveRate >= 80 ? 25 : resolveRate >= 50 ? 45 : 58;

    const p1Open = tickets.filter((t) => {
      const p = String(t.priority?.value ?? t.priority?.name ?? "").toUpperCase();
      return (p.includes("P1") || p.includes("CRITICAL")) && isOpenOrInProgress(t);
    }).length;
    const p1Type = p1Open === 0 ? "success" : p1Open <= 2 ? "warning" : "warning";
    const p1Value = p1Open === 0 ? "No critical tickets open" : `${p1Open} critical ticket${p1Open > 1 ? "s" : ""} open`;
    const p1Score = p1Open > 2 ? 92 : p1Open > 0 ? 78 : 15;

    const assignedOpen = tickets.filter((t) => (t.assignedTo || t.assignedToId) && isOpenOrInProgress(t)).length;
    const openCount = tickets.filter(isOpenOrInProgress).length;
    const assignRate = openCount ? Math.round((assignedOpen / openCount) * 100) : 100;
    const assignType = assignRate >= 90 ? "success" : assignRate >= 70 ? "trend" : "warning";
    const assignScore = assignRate < 70 ? 76 : assignRate < 90 ? 52 : 18;
    const workloadScore = todayCount > 8 ? 72 : todayCount > yestCount ? 54 : 24;

    return [
      { type: workloadType, title: "Workload today",  value: workloadValue, score: workloadScore },
      { type: slaType,      title: "SLA prediction",  value: slaValue, score: slaScore },
      { type: suggType,     title: "AI suggestion",   value: suggValue, score: suggScore },
      { type: trendType,    title: "Resolution rate", value: trendValue, score: trendScore },
      { type: p1Type,       title: "Critical focus",  value: p1Value, score: p1Score },
      { type: assignType,   title: "Assignment cover", value: `${assignRate}% of open work assigned`, score: assignScore },
    ];
  }, [tickets, slaData, flowStats, stats]);

  // ── 5. feedItems ────────────────────────────────────────────────────────────
  const feedItems = useMemo(() => {
    return [...tickets]
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
      .slice(0, 8)
      .map((t) => {
        const statusRaw    = String(t.status?.value ?? t.status?.name ?? "");
        const statusLow    = statusRaw.toLowerCase();
        const isRes        = statusLow === "resolved" || statusLow === "closed";
        const isBr         = isSlaBreached(t);
        const ticketId     = t.ticketNumber ? `#${t.ticketNumber}` : `#${String(t.id).slice(0, 6).toUpperCase()}`;
        const timeStr      = timeAgoStr(t.updatedAt ?? t.createdAt);
        const assigneeName = t.assignedTo?.name ?? null;

        let icon, iconBg, iconColor, iconBorder, actor, actionLabel, suffix;

        if (isBr) {
          icon = AlertTriangle; iconBg = "bg-red-100"; iconColor = "text-red-500"; iconBorder = "border-red-200";
          actor = null; actionLabel = "SLA breached for"; suffix = null;
        } else if (isRes) {
          icon = CheckCircle2; iconBg = "bg-emerald-100"; iconColor = "text-emerald-600"; iconBorder = "border-emerald-200";
          actor = assigneeName ?? "Someone"; actionLabel = "resolved"; suffix = null;
        } else if (assigneeName) {
          icon = UserCheck; iconBg = "bg-violet-100"; iconColor = "text-violet-600"; iconBorder = "border-violet-200";
          actor = "New ticket"; actionLabel = ""; suffix = `assigned to ${assigneeName}`;
        } else {
          icon = PlusCircle; iconBg = "bg-amber-100"; iconColor = "text-amber-500"; iconBorder = "border-amber-200";
          actor = "Customer replied to"; actionLabel = ""; suffix = null;
        }

        return { icon, iconBg, iconColor, iconBorder, actor, actionLabel, ticketId, suffix, time: timeStr };
      });
  }, [tickets]);

  // ── Derived display values ───────────────────────────────────────────────────
  const FLOW = [
    { label: "Created",     value: todayFlowStats.total,      rate: null,                        rateLabel: "total tickets",   delta: todayFlowStats.deltaCreated,    bg: "bg-indigo-50",  color: "text-indigo-600",  icon: PlusCircle,   accentColor: "#4F46E5" },
    { label: "Assigned",    value: todayFlowStats.assigned,   rate: todayFlowStats.assignRate,   rateLabel: "assignment rate", delta: todayFlowStats.deltaAssigned,   bg: "bg-blue-50",    color: "text-blue-600",    icon: UserCheck,    accentColor: "#2563EB" },
    { label: "In Progress", value: todayFlowStats.inProgress, rate: todayFlowStats.inProgRate,   rateLabel: "of total",        delta: todayFlowStats.deltaInProgress, bg: "bg-amber-50",   color: "text-amber-600",   icon: Loader2,      accentColor: "#D97706" },
    { label: "Resolved",    value: todayFlowStats.resolved,   rate: todayFlowStats.resolveRate,  rateLabel: "resolution rate", delta: todayFlowStats.deltaResolved,   bg: "bg-emerald-50", color: "text-emerald-600", icon: CheckCircle2, accentColor: "#059669" },
  ];

  const slaColor = slaData.pct >= 90 ? "text-emerald-600" : slaData.pct >= 70 ? "text-amber-600" : "text-red-600";

  const slaProgressData = [
    { name: "On track",  value: slaData.pct,       color: "#10b981" },
    { name: "Remaining", value: 100 - slaData.pct, color: "#eef2f7" },
  ];

  const xTickFormatter = (label) => {
    if (trendRange === "month") return label.split("–")[0];
    return label;
  };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes liquidWaveScrollA { 0% { transform: translateX(0); } 100% { transform: translateX(-40px); } }
        @keyframes liquidWaveScrollB { 0% { transform: translateX(0); } 100% { transform: translateX(40px); } }
        @keyframes liquidPipeMove { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        .liquid-wave-a { animation: liquidWaveScrollA 2.8s linear infinite; }
        .liquid-wave-b { animation: liquidWaveScrollB 3.6s linear infinite; }
        .liquid-pipe-flow { animation: liquidPipeMove 1.6s linear infinite; }
      `}</style>
      {/* ── Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ minWidth: 0 }}>

        {/* SLOT 1 — Insights */}
        <InsightsCard tickets={tickets} theme={theme} />

        {/* SLOT 2 — SLA Compliance */}
        <div className="rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow" style={{ minWidth: 0, background: dark ? "linear-gradient(180deg, rgba(9,14,27,0.98), rgba(15,23,42,0.92))" : "#fff", border: dark ? "1px solid rgba(165,180,252,0.12)" : "1px solid #e5e7eb", boxShadow: dark ? "0 18px 48px rgba(2,6,23,0.45)" : undefined }}>
          <h3 className="text-sm font-semibold mb-6" style={{ color: dark ? "#e5edf7" : "#111827" }}>SLA compliance</h3>
          <div className="flex items-center gap-6">
            <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto" }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <defs>
                    <linearGradient id="slaGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={slaData.pct >= 90 ? "#10b981" : slaData.pct >= 70 ? "#f59e0b" : "#ef4444"} />
                      <stop offset="100%" stopColor={slaData.pct >= 90 ? "#34d399" : slaData.pct >= 70 ? "#fcd34d" : "#f87171"} />
                    </linearGradient>
                    <filter id="slaGlow2">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <Pie
                    data={slaProgressData}
                    cx="50%" cy="50%"
                    startAngle={90} endAngle={-270}
                    innerRadius={40} outerRadius={50}
                    cornerRadius={8} paddingAngle={0}
                    dataKey="value" stroke="none"
                    animationDuration={1600} animationEasing="ease-out"
                  >
                    <Cell fill="url(#slaGradient2)" filter="url(#slaGlow2)" />
                    <Cell fill={dark ? "rgba(148,163,184,0.08)" : "#f1f5f9"} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: slaData.pct >= 90 ? "#10b981" : slaData.pct >= 70 ? "#f59e0b" : "#ef4444" }}>
                  {slaData.pct}%
                </span>
                <span style={{ fontSize: 9, fontWeight: 500, marginTop: 2, color: dark ? "#94a3b8" : "#9ca3af" }}>on track</span>
              </div>
            </div>
            <div className="flex-1 space-y-5">
              {[
                { label: "Within SLA", value: slaData.within,  color: "#10b981", bg: dark ? "rgba(16,185,129,0.10)" : "#f0fdf4", border: dark ? "rgba(16,185,129,0.18)" : "#bbf7d0", filter: "within" },
                { label: "At risk",    value: slaData.atRisk,   color: "#f59e0b", bg: dark ? "rgba(245,158,11,0.10)" : "#fffbeb", border: dark ? "rgba(245,158,11,0.18)" : "#fde68a", filter: "atRisk" },
                { label: "Breached",   value: slaData.breached, color: "#ef4444", bg: dark ? "rgba(239,68,68,0.10)" : "#fef2f2", border: dark ? "rgba(239,68,68,0.18)" : "#fecaca", filter: "breached" },
              ].map((row) => (
                <div
                  key={row.label}
                  onClick={() => navigate(`/tickets?slaStatus=${row.filter}`)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                    background: row.bg, border: `1px solid ${row.border}`,
                    transition: "transform 0.12s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.015)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: row.color, boxShadow: `0 0 5px ${row.color}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: dark ? "#cbd5e1" : "#374151" }}>{row.label}</span>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: row.color,
                    background: dark ? `rgba(0,0,0,0.2)` : "rgba(255,255,255,0.7)",
                    border: `1px solid ${row.border}`,
                    borderRadius: 6, padding: "1px 8px", minWidth: 28, textAlign: "center",
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SLOT 3 — Top Performers */}
        <div className="rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow" style={{ background: dark ? "linear-gradient(180deg, rgba(9,14,27,0.98), rgba(15,23,42,0.92))" : "#fff", border: dark ? "1px solid rgba(165,180,252,0.12)" : "1px solid #e5e7eb", boxShadow: dark ? "0 18px 48px rgba(2,6,23,0.45)" : undefined }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: dark ? "#e5edf7" : "#374151" }}>Top Performers</h3>
          {agentPerf.length === 0 ? (
            <p className="text-sm" style={{ color: dark ? "#94a3b8" : "#6b7280" }}>No resolved tickets yet.</p>
          ) : (
            <div className="space-y-3">
              {agentPerf.slice(0, 4).map((a) => {
                const pal = avatarPalette(a.name);
                const pct = Math.round((a.count / maxResolved) * 100);
                return (
                  <div key={a.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0" style={{ backgroundColor: pal.bg, color: pal.color }}>
                      {initials(a.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium truncate" style={{ color: dark ? "#f8fafc" : "#111827" }}>{a.name}</span>
                        <span className="text-xs ml-2" style={{ color: dark ? "#94a3b8" : "#6b7280" }}>{a.count}</span>
                      </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: dark ? "rgba(148,163,184,0.12)" : "#f3f4f6" }}>
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: pal.color }} />
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SLOT 4 — AI Insights Bot — live computed data */}
        <AiInsightsBot insights={aiInsights} />
      </div>

      {/* ── Row 2: Trend chart + Live Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Trend chart */}
        <div className="lg:col-span-2 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow" style={{ minWidth: 0, background: dark ? "linear-gradient(180deg, rgba(9,14,27,0.98), rgba(15,23,42,0.92))" : "#fff", border: dark ? "1px solid rgba(165,180,252,0.12)" : "1px solid #e5e7eb", boxShadow: dark ? "0 18px 48px rgba(2,6,23,0.45)" : undefined }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: dark ? "#e5edf7" : "#111827" }}>Ticket Trend</h3>
              <p className="text-[11px] mt-0.5" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>
                {trendRange === "day" ? "Hourly breakdown for today" : trendRange === "week" ? "Daily view — last 7 days" : "Weekly buckets — last 30 days"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-indigo-600 rounded" />
                  <span className="text-xs" style={{ color: dark ? "#94a3b8" : "#6b7280" }}>Created</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-emerald-600 rounded" style={{ backgroundImage: "repeating-linear-gradient(90deg,#10B981 0,#10B981 4px,transparent 4px,transparent 9px)" }} />
                  <span className="text-xs" style={{ color: dark ? "#94a3b8" : "#6b7280" }}>Closed</span>
                </div>
              </div>
              <RangeDropdown value={trendRange} onChange={setTrendRange} theme={theme} />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(148,163,184,0.18)" : "#E5E7EB"} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={dark ? "#94a3b8" : "#6B7280"}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={xTickFormatter}
                interval={trendRange === "day" ? 3 : 0}
                angle={trendRange === "month" ? -20 : 0}
                textAnchor={trendRange === "month" ? "end" : "middle"}
                height={trendRange === "month" ? 40 : 30}
              />
              <YAxis stroke={dark ? "#94a3b8" : "#6B7280"} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: dark ? "#0f172a" : "#FFFFFF", border: `1px solid ${dark ? "rgba(148,163,184,0.18)" : "#E5E7EB"}`, borderRadius: "12px", boxShadow: dark ? "0 20px 40px rgba(2,6,23,0.45)" : "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                labelStyle={{ fontSize: 11, color: dark ? "#cbd5e1" : "#6B7280", marginBottom: 4 }}
              />
              <Line type="monotone" dataKey="created" name="Created" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: "#4F46E5", r: 3.5 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="closed"  name="Closed"  stroke="#10B981" strokeWidth={2.5} strokeDasharray="5 5" dot={{ fill: "#10B981", r: 3.5 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Live Activity */}
        <div className="rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col" style={{ background: dark ? "linear-gradient(180deg, rgba(9,14,27,0.98), rgba(15,23,42,0.92))" : "#fff", border: dark ? "1px solid rgba(165,180,252,0.12)" : "1px solid #e5e7eb", boxShadow: dark ? "0 18px 48px rgba(2,6,23,0.45)" : undefined }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium" style={{ color: dark ? "#e5edf7" : "#374151" }}>Live Activity</h3>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {feedItems.length === 0 ? (
            <p className="text-sm" style={{ color: dark ? "#94a3b8" : "#6b7280" }}>No recent activity.</p>
          ) : (
            <div className="relative flex flex-col">
              <div className="absolute left-[15px] top-[18px] bottom-[18px] w-px" style={{ background: dark ? "rgba(148,163,184,0.18)" : "#f3f4f6" }} />
              {feedItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className={`flex items-start gap-3 relative ${i < feedItems.length - 1 ? "pb-5" : ""}`}>
                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10 border ${item.iconBg} ${item.iconBorder}`}>
                      <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                    </div>
                    <div className="pt-1 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                          <p className="text-[11.5px] leading-snug" style={{ color: dark ? "#dbe5f3" : "#1f2937" }}>
                          {item.actor && <span className="font-medium">{item.actor} </span>}
                          {item.actionLabel && `${item.actionLabel} `}
                          {item.ticketId && <span className="text-violet-600 font-medium cursor-pointer">{item.ticketId}</span>}
                          {item.suffix && <span className="font-medium"> {item.suffix}</span>}
                        </p>
                        <span className="text-[10.5px] flex-shrink-0 whitespace-nowrap mt-0.5" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>{item.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Ticket Flow ── */}
      <div className="rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow" style={{ background: dark ? "linear-gradient(180deg, rgba(9,14,27,0.98), rgba(15,23,42,0.92))" : "#fff", border: dark ? "1px solid rgba(165,180,252,0.12)" : "1px solid #e5e7eb", boxShadow: dark ? "0 18px 48px rgba(2,6,23,0.45)" : undefined }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium" style={{ color: dark ? "#e5edf7" : "#374151" }}>Ticket Flow</h3>
          <span className="text-[11px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>vs yesterday</span>
        </div>

        <div className="flex items-stretch" style={{ gap: 0 }}>
          {FLOW.map((step, i) => {
            const Icon = step.icon;
            const d = step.delta;
            const deltaColor = d.dir === "up"
              ? (step.label === "Created" ? "text-amber-500" : "text-emerald-600")
              : d.dir === "down"
              ? (step.label === "Resolved" ? "text-amber-500" : "text-red-500")
              : "text-gray-400";
            const deltaSymbol = d.dir === "up" ? "↑" : d.dir === "down" ? "↓" : "—";
            const deltaText   = d.dir === "neutral" ? "No change" : `${deltaSymbol} ${d.pct}%`;

            const maxFlowValue = Math.max(FLOW[0]?.value || 1, 1);
            const fillPct = Math.max(0, Math.min(100, Math.round((step.value / maxFlowValue) * 100)));
            const waveTopA = 145 - (fillPct / 100) * 90;
            const waveTopB = waveTopA + 5;

            return (
              <div key={step.label} className="flex items-center" style={{ flex: i === FLOW.length - 1 ? "1" : "1" }}>
                <div
                  className="relative flex flex-col gap-3 hover:shadow-md transition-all"
                  style={{
                    flex: 1,
                    background: dark ? "rgba(15,23,42,0.86)" : "#fafafa",
                    border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid #ececec",
                    borderRadius: 14,
                    padding: 16,
                    overflow: "hidden",
                    position: "relative",
                    minHeight: 172,
                    boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.25)" : "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <svg viewBox="0 0 200 150" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                    <defs>
                      <clipPath id={`flowClip-${i}`}>
                        <rect x="0" y="0" width="200" height="150" rx="14" />
                      </clipPath>
                      <linearGradient id={`liquidGrad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#A7F3D0" />
                        <stop offset="35%" stopColor="#60d5a6" />
                        <stop offset="100%" stopColor="#32c690" />
                      </linearGradient>
                      <filter id={`glow-${i}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <g clipPath={`url(#flowClip-${i})`}>
                      <path
                        className="liquid-wave-b"
                        d={`M -40,${waveTopB} Q -20,${waveTopB - 12} 0,${waveTopB} Q 20,${waveTopB + 12} 40,${waveTopB} Q 60,${waveTopB - 12} 80,${waveTopB} Q 100,${waveTopB + 12} 120,${waveTopB} Q 140,${waveTopB - 12} 160,${waveTopB} Q 180,${waveTopB + 12} 200,${waveTopB} Q 220,${waveTopB - 12} 240,${waveTopB} L240,150 L-40,150 Z`}
                        fill={`url(#liquidGrad-${i})`} opacity="0.55"
                      />
                      <path
                        className="liquid-wave-a"
                        filter={`url(#glow-${i})`}
                        d={`M -40,${waveTopA} Q -20,${waveTopA - 12} 0,${waveTopA} Q 20,${waveTopA + 12} 40,${waveTopA} Q 60,${waveTopA - 12} 80,${waveTopA} Q 100,${waveTopA + 12} 120,${waveTopA} Q 140,${waveTopA - 12} 160,${waveTopA} Q 180,${waveTopA + 12} 200,${waveTopA} Q 220,${waveTopA - 12} 240,${waveTopA} L240,150 L-40,150 Z`}
                        fill={`url(#liquidGrad-${i})`} opacity="0.9"
                      />
                      <path
                        d={`M -40,${waveTopA} Q -20,${waveTopA - 12} 0,${waveTopA} Q 20,${waveTopA + 12} 40,${waveTopA} Q 60,${waveTopA - 12} 80,${waveTopA} Q 100,${waveTopA + 12} 120,${waveTopA} Q 140,${waveTopA - 12} 160,${waveTopA} Q 180,${waveTopA + 12} 200,${waveTopA} Q 220,${waveTopA - 12} 240,${waveTopA}`}
                        fill="none" stroke="#A7F3D0" strokeWidth="1.5" opacity="0.9"
                      />
                    </g>
                  </svg>

                  <div style={{ position: "relative", zIndex: 1 }} className="flex flex-col gap-3 h-full justify-between">
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 ${step.bg} rounded-lg flex items-center justify-center`} style={{ boxShadow: dark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.08)" }}>
                        <Icon className={`w-4 h-4 ${step.color}`} />
                      </div>
                      <span
                        className="text-[11px] font-semibold"
                        style={{
                          padding: "2px 7px", borderRadius: 20,
                          background: dark ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.75)",
                          color: d.dir === "up" ? (step.label === "Created" ? "#d97706" : "#059669") : d.dir === "down" ? (step.label === "Resolved" ? "#d97706" : "#dc2626") : (dark ? "#94a3b8" : "#9ca3af"),
                        }}
                      >
                        {deltaText}
                      </span>
                    </div>

                    <div
                      style={{
                        background: dark ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.72)",
                        backdropFilter: "blur(6px)",
                        WebkitBackdropFilter: "blur(6px)",
                        borderRadius: 10,
                        padding: "8px 10px",
                        border: dark ? "1px solid rgba(148,163,184,0.12)" : "1px solid rgba(255,255,255,0.6)",
                      }}
                    >
                      <span className="text-2xl font-semibold" style={{ color: dark ? "#f8fafc" : "#111827" }}>{step.value}</span>
                      <p className="text-[11px] font-medium mt-0.5" style={{ color: dark ? "#cbd5e1" : "#4b5563" }}>{step.label}</p>
                      {step.rate !== null ? (
                        <p className="text-[10px] mt-0.5" style={{ color: dark ? "#94a3b8" : "#6b7280" }}>
                          {step.rate}% {step.rateLabel}
                        </p>
                      ) : (
                        <p className="text-[10px] mt-0.5" style={{ color: dark ? "#64748b" : "#9ca3af" }}>
                          * as of now
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {i < FLOW.length - 1 && (() => {
                  const nextValue = FLOW[i + 1].value;
                  const flowRatio = maxFlowValue > 0 ? Math.min(1, nextValue / maxFlowValue) : 0;
                  const pipeOpacity = 0.35 + flowRatio * 0.65;
                  return (
                    <div className="relative flex items-center flex-shrink-0" style={{ width: 28, height: 8 }}>
                      <div style={{
                        position: "absolute", top: "50%", left: 0, right: 0, height: 6,
                        transform: "translateY(-50%)", borderRadius: 999,
                        background: dark ? "rgba(148,163,184,0.18)" : "#e5e7eb",
                      }} />
                      <div
                        className="liquid-pipe-flow"
                        style={{
                          position: "absolute", top: "50%", left: 0, right: 0, height: 6,
                          transform: "translateY(-50%)", borderRadius: 999,
                          background: "linear-gradient(90deg, #34D399, #A7F3D0, #34D399)",
                          backgroundSize: "200% 100%",
                          opacity: pipeOpacity,
                          filter: flowRatio > 0.4 ? "drop-shadow(0 0 3px rgba(52,211,153,0.7))" : "none",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute", right: -2, top: "50%", transform: "translateY(-50%)",
                          width: 0, height: 0,
                          borderTop: "5px solid transparent",
                          borderBottom: "5px solid transparent",
                          borderLeft: `7px solid ${flowRatio > 0.1 ? "#34D399" : (dark ? "rgba(148,163,184,0.3)" : "#d1d5db")}`,
                          opacity: pipeOpacity,
                          filter: flowRatio > 0.4 ? "drop-shadow(0 0 2px rgba(52,211,153,0.6))" : "none",
                        }}
                      />
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
