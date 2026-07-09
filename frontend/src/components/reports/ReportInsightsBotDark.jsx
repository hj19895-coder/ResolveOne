import { useState, useEffect, useRef } from "react";
import { Activity, AlertTriangle, BrainCircuit, CheckCircle2, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import botImage from "../../assets/ai-bot.png";
import useDashboardTheme from "../../hooks/useDashboardTheme";
import "../ui/AiInsightsBot.css";

function rankInsights(items) {
  const typeScore = { danger: 95, warning: 78, trend: 55, info: 42, success: 20 };
  return [...items]
    .filter(Boolean)
    .sort((a, b) => (b.score ?? typeScore[b.type] ?? 40) - (a.score ?? typeScore[a.type] ?? 40));
}

function statusTotal(rows, match) {
  return rows.reduce((sum, row) => {
    const found = Object.entries(row.counts ?? {}).find(([key]) =>
      key.toLowerCase().replace(/[_-]+/g, " ").includes(match)
    );
    return sum + Number(found?.[1] ?? 0);
  }, 0);
}

function deriveContent(reportKey, data) {
  if (!data) return { summary: "Loading report data...", insights: [], thinking: ["Waiting for the selected report to finish loading."], action: "Once data arrives, I will compare workload, status mix, risk, and ownership." };

  if (reportKey === "ticket-health") {
    const t = data.today ?? {};
    const w = data.weekly ?? {};
    const sla = w.slaCompliance;
    const p1 = t.openP1 ?? 0;
    const hrs = w.avgResolutionHrs;
    const raised = t.raised ?? 0;
    const rr = w.reopenRate;

    const slaStr = sla != null ? `SLA compliance stands at ${sla}%${sla >= 90 ? ", which is excellent" : sla >= 70 ? " and is worth watching closely" : " and needs attention"}.` : "No SLA data is available for this period.";
    const p1Str = p1 === 0 ? "There are no open P1 critical tickets right now." : `There ${p1 === 1 ? "is" : "are"} ${p1} open P1 critical ticket${p1 > 1 ? "s" : ""} requiring immediate attention.`;
    const hrsStr = hrs != null ? `Average resolution time this week is ${hrs} hours${hrs <= 4 ? " - a fast turnaround" : hrs <= 24 ? "" : ", which is on the higher side"}.` : "";
    const raisedStr = raised === 0 ? "No new tickets have been raised today." : `${raised} ticket${raised > 1 ? "s have" : " has"} been raised today${raised > 5 ? ", indicating high inbound volume" : ""}.`;
    const rrStr = rr && rr > 0 ? ` Reopen rate is ${rr}%${rr > 10 ? " and should be reviewed for quality trends" : ""}.` : "";

    const riskCount = (t.openSlaBreached ?? 0) + p1;
    const insights = rankInsights([
      { type: sla != null && sla >= 90 ? "success" : sla != null && sla < 70 ? "danger" : "warning", title: "SLA posture", value: sla == null ? "No closed tickets for SLA scoring" : `${sla}% weekly compliance`, score: sla == null ? 36 : sla < 70 ? 96 : sla < 90 ? 74 : 22 },
      { type: p1 === 0 ? "success" : "danger", title: "Critical queue", value: p1 === 0 ? "No open P1 tickets" : `${p1} P1 ticket${p1 > 1 ? "s" : ""} open`, score: p1 > 2 ? 98 : p1 > 0 ? 86 : 18 },
      { type: riskCount === 0 ? "success" : "warning", title: "Risk load", value: riskCount === 0 ? "No immediate risk signal" : `${riskCount} ticket${riskCount > 1 ? "s" : ""} need focus`, score: riskCount ? 88 : 16 },
      { type: raised > 5 ? "warning" : "trend", title: "Inbound flow", value: `${raised} ticket${raised === 1 ? "" : "s"} raised today`, score: raised > 8 ? 82 : raised > 0 ? 52 : 20 },
      { type: rr > 10 ? "warning" : rr > 0 ? "info" : "success", title: "Reopen signal", value: rr ? `${rr}% reopen rate` : "No reopen signal", score: rr > 10 ? 76 : rr > 0 ? 44 : 18 },
      { type: hrs > 24 ? "warning" : hrs ? "trend" : "info", title: "Resolution pace", value: hrs ? `${hrs} hrs average resolution` : "No resolution timing yet", score: hrs > 24 ? 72 : hrs ? 46 : 30 },
    ]);
    const lead = insights[0];
    const situation = lead?.type === "danger" || lead?.type === "warning"
      ? `${lead.title} is the main pressure point right now.`
      : "No urgent pressure point is dominating the report right now.";
    return {
      summary: `${situation} ${slaStr} ${p1Str} ${hrsStr} ${raisedStr}${rrStr}`,
      insights: insights.slice(0, 4),
      thinking: [
        `Compared weekly SLA, today's P1 count, reopen rate, and average resolution time.`,
        `Weighted active risk higher when breached SLA and P1 tickets appear together.`,
        `Checked inbound volume today to understand whether the queue is getting heavier.`,
      ],
      action: riskCount > 0 ? "Prioritize breached SLA and P1 tickets first, then review reopen patterns for quality issues." : "Keep the current rhythm, but continue watching inbound volume and weekly SLA movement.",
    };
  }

  if (reportKey === "developer-pivot") {
    const rows = data.rows ?? [];
    if (!rows.length) return { summary: "No developer data available.", insights: [], thinking: ["No developer rows are available to analyze."], action: "Refresh the report once tickets are assigned." };
    const sorted = [...rows].sort((a, b) => b.total - a.total);
    const top = sorted[0];
    const total = rows.reduce((s, r) => s + r.total, 0);
    const unassigned = rows.find((r) => r.name === "Unassigned" || r.developer === "Unassigned");
    const unassignedCount = unassigned?.total ?? 0;
    const avg = rows.length ? total / rows.length : 0;
    const overloaded = rows.filter((r) => r.total > avg * 1.5 && r.total >= 3);
    const statusTotals = {};
    rows.forEach((r) => Object.entries(r.counts ?? {}).forEach(([key, value]) => { statusTotals[key] = (statusTotals[key] ?? 0) + Number(value ?? 0); }));
    const topStatus = Object.entries(statusTotals).sort((a, b) => b[1] - a[1])[0];
    const waiting = statusTotal(rows, "awaiting");
    const onHold = statusTotal(rows, "hold");
    const spread = sorted.length > 1 ? top.total - sorted[sorted.length - 1].total : 0;
    const insights = rankInsights([
      { type: total > 50 ? "warning" : "trend", title: "Open workload", value: `${total} tickets across ${rows.length} developers`, score: total > 50 ? 76 : total > 15 ? 52 : 32 },
      { type: overloaded.length ? "warning" : "success", title: "Load balance", value: overloaded.length ? `${overloaded.length} developer${overloaded.length > 1 ? "s" : ""} above normal load` : "No major load imbalance", score: overloaded.length ? 86 : 18 },
      { type: unassignedCount ? "warning" : "success", title: "Ownership", value: unassignedCount ? `${unassignedCount} tickets unassigned` : "All tickets assigned", score: unassignedCount > 5 ? 90 : unassignedCount ? 70 : 16 },
      { type: "info", title: "Dominant status", value: topStatus ? `${topStatus[0]}: ${topStatus[1]}` : "No status concentration", score: Number(topStatus?.[1] ?? 0) > total * 0.5 ? 66 : 38 },
      { type: onHold ? "warning" : "success", title: "Blocked work", value: onHold ? `${onHold} tickets on hold` : "No hold backlog", score: onHold ? 72 : 14 },
      { type: waiting ? "warning" : "success", title: "Waiting work", value: waiting ? `${waiting} tickets awaiting input` : "No waiting backlog", score: waiting ? 68 : 14 },
      { type: spread >= 4 ? "warning" : "trend", title: "Load spread", value: `${spread} ticket gap between highest and lowest load`, score: spread >= 4 ? 74 : 34 },
    ]);
    const lead = insights[0];
    return {
      summary: `${lead.title} is the current signal to watch: ${lead.value}. ${top?.developer ?? top?.name} has the highest load with ${top?.total} tickets, while the team average is ${avg.toFixed(1)}. ${unassignedCount > 0 ? `${unassignedCount} tickets still need clear ownership.` : "Ownership coverage looks complete."}`,
      insights: insights.slice(0, 4),
      thinking: [
        `Sorted developers by ticket volume and compared the top load against team average.`,
        `Scanned unassigned work because ownership gaps usually become SLA risk later.`,
        `Grouped tickets by status to see whether work is blocked, waiting, or actively moving.`,
      ],
      action: overloaded.length ? `Rebalance a few tickets away from ${top?.developer ?? top?.name} before assigning new work.` : "Keep assignment flow steady and review status blockers during standup.",
    };
  }

  if (reportKey === "client-status") {
    const rows = data.rows ?? [];
    if (!rows.length) return { summary: "No client data available.", insights: [], thinking: ["No client rows are available to analyze."], action: "Refresh once client ticket data is available." };
    const total = rows.reduce((s, r) => s + r.total, 0);
    const sorted = [...rows].sort((a, b) => b.total - a.total);
    const topClient = sorted[0];
    const openCount = statusTotal(rows, "open");
    const onHold = statusTotal(rows, "hold");
    const waiting = statusTotal(rows, "awaiting");
    const concentration = total ? Math.round((topClient.total / total) * 100) : 0;
    const secondClient = sorted[1];
    const gap = secondClient ? topClient.total - secondClient.total : topClient.total;
    const insights = rankInsights([
      { type: total > 80 ? "warning" : "trend", title: "Client workload", value: `${total} tickets across ${rows.length} clients`, score: total > 80 ? 76 : total > 20 ? 52 : 30 },
      { type: concentration > 50 ? "warning" : "info", title: "Concentration", value: `${topClient?.client} owns ${concentration}% of the queue`, score: concentration > 60 ? 88 : concentration > 40 ? 66 : 36 },
      { type: onHold ? "warning" : "success", title: "Blocked work", value: onHold ? `${onHold} tickets on hold` : "No on-hold tickets", score: onHold ? 78 : 16 },
      { type: waiting ? "warning" : "success", title: "Waiting state", value: waiting ? `${waiting} tickets awaiting input` : "No awaiting-state backlog", score: waiting ? 72 : 16 },
      { type: openCount > 30 ? "warning" : "trend", title: "Active work", value: `${openCount} tickets in open status`, score: openCount > 30 ? 70 : openCount > 0 ? 42 : 18 },
      { type: gap > 5 ? "warning" : "info", title: "Client gap", value: secondClient ? `${gap} more than ${secondClient.client}` : "Single-client queue", score: gap > 5 ? 68 : 34 },
    ]);
    const lead = insights[0];
    return {
      summary: `${lead.title} is driving this view: ${lead.value}. ${topClient?.client} has ${topClient?.total} tickets out of ${total}, with ${onHold + waiting} tickets in blocked or waiting states across clients.`,
      insights: insights.slice(0, 4),
      thinking: [
        `Ranked clients by open volume to detect concentration risk.`,
        `Checked hold and awaiting statuses because they usually need coordination, not only development effort.`,
        `Compared the top client share against the full queue to decide where follow-up matters most.`,
      ],
      action: concentration > 50 || onHold || waiting ? `Start with ${topClient?.client}, then clear hold/awaiting blockers by owner.` : "Maintain current client coverage and monitor any new concentration spikes.",
    };
  }

  return { summary: "Select a report to see AI insights.", insights: [], thinking: ["Choose a report to begin analysis."], action: "Select a report from the dropdown." };
}

function useTypewriter(text, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    clearInterval(timerRef.current);
    if (!text) return;
    timerRef.current = setInterval(() => {
      i += 1;
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

export default function ReportInsightsBotDark({ reportKey, data }) {
  const { summary, insights = [], thinking = [], action } = deriveContent(reportKey, data);
  const { displayed, done } = useTypewriter(summary, 18);
  const dark = useDashboardTheme();
  const iconFor = (type) => {
    if (type === "success") return CheckCircle2;
    if (type === "warning" || type === "danger") return AlertTriangle;
    if (type === "trend") return TrendingUp;
    return Lightbulb;
  };
  const colorFor = (type) => {
    if (type === "success") return dark ? "#86efac" : "#16a34a";
    if (type === "warning") return dark ? "#fbbf24" : "#d97706";
    if (type === "danger") return dark ? "#fca5a5" : "#dc2626";
    if (type === "trend") return dark ? "#7dd3fc" : "#0284c7";
    return dark ? "#c4b5fd" : "#7c3aed";
  };

  return (
    <div className="flex flex-col gap-4 flex-shrink-0 max-w-full" style={{ width: 490 }}>
      <div className="relative" style={{ height: 300 }}>
        <div className="flex items-center justify-between relative z-30">
          <div className="flex items-center gap-2">
            <Sparkles size={14} color={dark ? "#c4b5fd" : "#8b5cf6"} />
            <span className="font-semibold text-sm" style={{ color: dark ? "#e5edf7" : "#1f2937" }}>
              AI Summary
            </span>
          </div>
          <span
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-semibold"
            style={{
              color: dark ? "#fca5a5" : "#dc2626",
              background: dark ? "rgba(127,29,29,0.28)" : "#fef2f2",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: dark ? "#f87171" : "#ef4444",
                animation: "pulse 1.5s ease-in-out infinite",
                boxShadow: "0 0 6px rgba(239,68,68,0.8)",
              }}
            />
            Live
          </span>
        </div>

        <div
          className="ai-bot-glow absolute w-48 h-48 rounded-full z-0"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -54%)",
            background: dark ? "radial-gradient(circle, rgba(124,58,237,0.24), rgba(15,23,42,0.02) 70%)" : "rgba(196,181,253,0.95)",
          }}
        />

        <div className="absolute left-1/2 top-[28px] -translate-x-1/2 z-10 pointer-events-none">
          <img src={botImage} alt="AI Bot" className="ai-bot-float w-[460px] max-w-none drop-shadow-2xl" />
        </div>
      </div>

      <div
        className="rounded-2xl border p-4 relative overflow-hidden"
        style={{
          background: dark ? "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.92) 100%)" : "linear-gradient(135deg, rgba(238,242,255,0.9) 0%, rgba(245,243,255,0.95) 100%)",
          borderColor: dark ? "rgba(165,180,252,0.16)" : "rgb(221 214 254)",
          boxShadow: dark ? "0 20px 44px rgba(2,6,23,0.50)" : "0 4px 24px rgba(109,61,245,0.10)",
          backdropFilter: "blur(12px)",
          minHeight: 220,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
          style={{
            background: dark ? "linear-gradient(90deg, #a78bfa, #818cf8, #a78bfa)" : "linear-gradient(90deg, #7C3AED, #a78bfa, #7C3AED)",
            backgroundSize: "200% auto",
            animation: "btnShimmer 3s linear infinite",
          }}
        />

        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: dark ? "rgba(124,58,237,0.18)" : "#ede9fe" }}
          >
            <Sparkles size={10} color={dark ? "#c4b5fd" : "#7c3aed"} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: dark ? "#c4b5fd" : "#7c3aed" }}>
            Summary
          </span>
          {!done && (
            <span className="ml-auto flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: dark ? "#a78bfa" : "#a78bfa",
                    animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </span>
          )}
        </div>

        <p className="text-[13px] leading-relaxed" style={{ color: dark ? "#cbd5e1" : "#374151" }}>
          {displayed}
          {!done && <span className="inline-block w-0.5 h-3 ml-0.5 animate-pulse" style={{ background: dark ? "#c4b5fd" : "#7c3aed" }} />}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {insights.map((item) => {
            const Icon = iconFor(item.type);
            const color = colorFor(item.type);
            return (
              <div key={`${item.title}-${item.value}`} className="rounded-xl p-2.5" style={{ background: dark ? "rgba(255,255,255,0.04)" : "#f8fafc", border: dark ? "1px solid rgba(148,163,184,0.10)" : "1px solid #e5e7eb" }}>
                <div className="flex items-center gap-2">
                  <Icon size={12} color={color} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{item.title}</span>
                </div>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: dark ? "#cbd5e1" : "#475569" }}>{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl p-3" style={{ background: dark ? "rgba(124,58,237,0.08)" : "#f5f3ff", border: dark ? "1px solid rgba(167,139,250,0.14)" : "1px solid #ddd6fe" }}>
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit size={13} color={dark ? "#c4b5fd" : "#7c3aed"} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: dark ? "#c4b5fd" : "#6d28d9" }}>Thinking Trail</span>
          </div>
          <div className="space-y-1.5">
            {thinking.map((line) => (
              <div key={line} className="flex gap-2">
                <Activity size={10} className="mt-0.5 flex-shrink-0" color={dark ? "#94a3b8" : "#64748b"} />
                <p className="text-[11px] leading-snug" style={{ color: dark ? "#cbd5e1" : "#475569" }}>{line}</p>
              </div>
            ))}
          </div>
          {action && (
            <p className="text-[11px] leading-snug mt-3 font-medium" style={{ color: dark ? "#e5edf7" : "#374151" }}>
              Next: {action}
            </p>
          )}
        </div>
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
