// src/components/reports/ReportInsightsBot.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, TrendingDown, AlertTriangle, Lightbulb, TrendingUp, CheckCircle2 } from "lucide-react";
import botImage from "../../assets/ai-bot.png";
import "../ui/AiInsightsBot.css"; // reuse same CSS

// ─── Type configs ─────────────────────────────────────────────────────────────
const TYPE_CFG = {
  success: { Icon: CheckCircle2, dot: "#10B981", title: "#065F46", value: "#047857", iconBg: "#D1FAE5", iconColor: "#059669", bg: "rgba(236,253,245,0.97)", border: "#A7F3D0", glow: "rgba(16,185,129,0.18)" },
  warning: { Icon: AlertTriangle, dot: "#F59E0B", title: "#92400E", value: "#B45309", iconBg: "#FEF3C7", iconColor: "#D97706", bg: "rgba(255,251,235,0.97)", border: "#FDE68A", glow: "rgba(245,158,11,0.18)" },
  danger:  { Icon: AlertTriangle, dot: "#EF4444", title: "#991B1B", value: "#B91C1C", iconBg: "#FEE2E2", iconColor: "#DC2626", bg: "rgba(254,242,242,0.97)", border: "#FECACA", glow: "rgba(239,68,68,0.18)" },
  info:    { Icon: Lightbulb,     dot: "#818CF8", title: "#3730A3", value: "#4338CA", iconBg: "#E0E7FF", iconColor: "#4F46E5", bg: "rgba(238,242,255,0.97)", border: "#C7D2FE", glow: "rgba(99,102,241,0.18)" },
  trend:   { Icon: TrendingUp,    dot: "#38BDF8", title: "#0C4A6E", value: "#0369A1", iconBg: "#E0F2FE", iconColor: "#0284C7", bg: "rgba(240,249,255,0.97)", border: "#BAE6FD", glow: "rgba(56,189,248,0.18)" },
};

// ─── Derive insights + summary per report type ────────────────────────────────
function deriveContent(reportKey, data) {
  if (!data) return { insights: [], summary: "Loading report data…" };

  // ── Ticket Health ──────────────────────────────────────────────────────────
  if (reportKey === "ticket-health") {
    const t = data.today  ?? {};
    const w = data.weekly ?? {};
    const insights = [];

    const sla = w.slaCompliance;
    if (sla == null)       insights.push({ type: "info",    title: "SLA Compliance",      value: "No closed tickets this week" });
    else if (sla >= 90)    insights.push({ type: "success", title: "SLA Compliance",      value: `${sla}% — Excellent this week` });
    else if (sla >= 70)    insights.push({ type: "warning", title: "SLA Compliance",      value: `${sla}% — Needs monitoring` });
    else                   insights.push({ type: "danger",  title: "SLA Compliance",      value: `${sla}% — Action required` });

    const p1 = t.openP1 ?? 0;
    if (p1 === 0)          insights.push({ type: "success", title: "P1 Tickets",          value: "No critical tickets open" });
    else if (p1 <= 2)      insights.push({ type: "warning", title: "P1 Tickets",          value: `${p1} critical ticket${p1>1?"s":""} need attention` });
    else                   insights.push({ type: "danger",  title: "P1 Tickets",          value: `${p1} critical tickets — escalate now` });

    const hrs = w.avgResolutionHrs;
    if (hrs == null)       insights.push({ type: "info",    title: "Avg Resolution",      value: "No resolved tickets yet" });
    else if (hrs <= 4)     insights.push({ type: "success", title: "Avg Resolution",      value: `${hrs} hrs — Fast turnaround` });
    else if (hrs <= 24)    insights.push({ type: "trend",   title: "Avg Resolution",      value: `${hrs} hrs this week` });
    else                   insights.push({ type: "warning", title: "Avg Resolution",      value: `${hrs} hrs — Consider optimising` });

    const raised = t.raised ?? 0;
    if (raised === 0)      insights.push({ type: "success", title: "Today's Workload",    value: "No new tickets today" });
    else if (raised <= 5)  insights.push({ type: "trend",   title: "Today's Workload",    value: `${raised} new ticket${raised>1?"s":""} raised today` });
    else                   insights.push({ type: "warning", title: "Today's Workload",    value: `${raised} tickets raised — high volume` });

    const rr = w.reopenRate;
    if (!rr || rr === 0)   insights.push({ type: "success", title: "Reopen Rate",         value: "No tickets reopened this week" });
    else if (rr > 10)      insights.push({ type: "warning", title: "Reopen Rate",         value: `${rr}% — Quality needs review` });
    else                   insights.push({ type: "info",    title: "Reopen Rate",         value: `${rr}% reopen rate this week` });

    const slaStr    = sla != null ? `SLA compliance stands at ${sla}%${sla >= 90 ? ", which is excellent" : sla >= 70 ? " — worth monitoring closely" : " — immediate action recommended"}.` : "No SLA data available for this period.";
    const p1Str     = p1 === 0 ? "There are no open P1 critical tickets right now." : `There ${p1 === 1 ? "is" : "are"} ${p1} open P1 critical ticket${p1>1?"s":""} requiring immediate attention.`;
    const hrsStr    = hrs != null ? `Average resolution time this week is ${hrs} hours${hrs <= 4 ? " — a fast turnaround" : hrs <= 24 ? "" : ", which is on the higher side"}.` : "";
    const raisedStr = raised === 0 ? "No new tickets have been raised today." : `${raised} ticket${raised>1?"s have":" has"} been raised today${raised > 5 ? ", indicating high inbound volume" : ""}.`;
    const rrStr     = rr && rr > 0 ? ` Reopen rate is ${rr}%${rr > 10 ? " — suggesting resolution quality should be reviewed" : ""}.` : "";

    const summary = `${slaStr} ${p1Str} ${hrsStr} ${raisedStr}${rrStr} Overall, ${sla != null && sla >= 80 ? "the team is performing well this week." : "there are areas that need your attention today."}`;
    return { insights, summary };
  }

  // ── Developer Pivot ────────────────────────────────────────────────────────
  if (reportKey === "developer-pivot") {
    const rows = data.rows ?? [];
    if (!rows.length) return { insights: [], summary: "No developer data available." };

    const sorted    = [...rows].sort((a, b) => b.total - a.total);
    const top       = sorted[0];
    const total     = rows.reduce((s, r) => s + r.total, 0);
    const unassigned = rows.find(r => r.name === "Unassigned" || r.developer === "Unassigned");
    const unassignedCount = unassigned?.total ?? 0;

    const insights = [
      { type: total > 50 ? "warning" : "trend",   title: "Total Pending",        value: `${total} open tickets across team` },
      { type: "info",    title: "Top Load",              value: `${top?.developer ?? top?.name} has ${top?.total} tickets` },
      { type: unassignedCount > 0 ? "warning" : "success", title: "Unassigned", value: unassignedCount > 0 ? `${unassignedCount} tickets unassigned` : "All tickets assigned" },
      { type: rows.length > 10 ? "trend" : "success",  title: "Team Size",       value: `${rows.length} active developers` },
    ];

    const summary = `There are currently ${total} open tickets across ${rows.length} developers. ${top?.developer ?? top?.name} carries the highest load with ${top?.total} tickets. ${unassignedCount > 0 ? `${unassignedCount} tickets are unassigned and need to be distributed.` : "All tickets are currently assigned to a developer."} Review workload distribution to avoid burnout on top performers.`;
    return { insights, summary };
  }

  // ── Client Status ──────────────────────────────────────────────────────────
  if (reportKey === "client-status") {
    const rows = data.rows ?? [];
    if (!rows.length) return { insights: [], summary: "No client data available." };

    const total     = rows.reduce((s, r) => s + r.total, 0);
    const sorted    = [...rows].sort((a, b) => b.total - a.total);
    const topClient = sorted[0];
    const openCount = rows.reduce((s, r) => s + (r.counts?.["Open"] ?? 0), 0);
    const onHold    = rows.reduce((s, r) => s + (r.counts?.["On-hold"] ?? 0), 0);

    const insights = [
      { type: total > 80 ? "warning" : "trend",   title: "Total Client Tickets",  value: `${total} tickets across ${rows.length} clients` },
      { type: "info",    title: "Highest Volume",        value: `${topClient?.client} — ${topClient?.total} tickets` },
      { type: openCount > 30 ? "warning" : "success", title: "Open Tickets",       value: `${openCount} tickets currently open` },
      { type: onHold > 10 ? "warning" : "success",    title: "On Hold",            value: onHold > 0 ? `${onHold} tickets on hold` : "No tickets on hold" },
    ];

    const summary = `There are ${total} open tickets across ${rows.length} clients. ${topClient?.client} has the highest volume with ${topClient?.total} tickets. ${openCount} tickets are in open state requiring active work${onHold > 0 ? `, and ${onHold} are currently on hold` : ""}. Focus on the top clients to ensure SLA commitments are met.`;
    return { insights, summary };
  }

  return { insights: [], summary: "Select a report to see AI insights." };
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 22) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone]           = useState(false);
  const timerRef                  = useRef(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    clearInterval(timerRef.current);
    if (!text) return;
    timerRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timerRef.current);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [text, speed]);

  return { displayed, done };
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ReportInsightsBot({ reportKey, data }) {
  const { insights, summary } = deriveContent(reportKey, data);

  const [activeIdx, setActiveIdx] = useState(0);
  const [animState, setAnimState] = useState("enter");
  const timerRef = useRef(null);

  const { displayed, done } = useTypewriter(summary, 18);

  const advance = useCallback(() => {
    if (!insights.length) return;
    setAnimState("exit");
    setTimeout(() => {
      setActiveIdx(prev => (prev + 1) % insights.length);
      setAnimState("enter");
      setTimeout(() => setAnimState("idle"), 450);
    }, 340);
  }, [insights.length]);

  useEffect(() => {
    setActiveIdx(0);
    setAnimState("enter");
  }, [reportKey, data]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!insights.length) return;
    const settle = setTimeout(() => setAnimState("idle"), 450);
    timerRef.current = setInterval(advance, 2600);
    return () => { clearTimeout(settle); clearInterval(timerRef.current); };
  }, [advance, insights.length]);

  const current = insights[activeIdx] ?? insights[0];
  const cfg     = current ? (TYPE_CFG[current.type] ?? TYPE_CFG.info) : null;

  return (
    <div className="flex flex-col gap-4 flex-shrink-0" style={{ width: 490 }}>

      {/* ── Borderless bot ── */}
      <div className="relative" style={{ height: 300 }}>

        {/* Header */}
        <div className="flex items-center justify-between relative z-30">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500" />
            <span className="font-semibold text-sm text-gray-800">AI Summary</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-semibold">
            <span
              className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"
              style={{ animation: "pulse 1.5s ease-in-out infinite", boxShadow: "0 0 6px rgba(239,68,68,0.8)" }}
            />
            Live
          </span>
        </div>

        

        {/* Purple glow — no card, just ambient */}
        <div
          className="ai-bot-glow absolute w-48 h-48 bg-violet-300 rounded-full z-0"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -54%)" }}
        />

        {/* Bot image */}
        <div className="absolute left-1/2 top-[28px] -translate-x-1/2 z-10 pointer-events-none">
          <img src={botImage} alt="AI Bot" className="ai-bot-float w-[460px] max-w-none drop-shadow-2xl" />
        </div>
      </div>

      {/* ── Typewriter summary card ── */}
      <div
        className="rounded-2xl border border-violet-100 p-4 relative overflow-hidden"
        style={{
          background:   "linear-gradient(135deg, rgba(238,242,255,0.9) 0%, rgba(245,243,255,0.95) 100%)",
          boxShadow:    "0 4px 24px rgba(109,61,245,0.10)",
          backdropFilter: "blur(12px)",
          minHeight:    220,
        }}
      >
        {/* Subtle shimmer line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
          style={{ background: "linear-gradient(90deg, #7C3AED, #a78bfa, #7C3AED)", backgroundSize: "200% auto", animation: "btnShimmer 3s linear infinite" }}
        />

        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Sparkles size={10} className="text-violet-600" />
          </div>
          <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">Summary</span>
          {!done && (
            <span className="ml-auto flex gap-0.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full bg-violet-400"
                  style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </span>
          )}
        </div>

        <p className="text-[13px] text-gray-700 leading-relaxed">
          {displayed}
          {!done && <span className="inline-block w-0.5 h-3 bg-violet-500 ml-0.5 animate-pulse" />}
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}