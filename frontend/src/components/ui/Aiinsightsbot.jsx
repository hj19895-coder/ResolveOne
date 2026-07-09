/**
 * AiInsightsBot.jsx
 *
 * Premium AI companion card for DeskFlow dashboard.
 * Place in the same column as TopPerformers (3rd slot in the analytics row).
 *
 * Usage in DashboardAnalytics.jsx — Row 1 grid:
 *
 *   import AiInsightsBot from "./AiInsightsBot";
 *
 *   <AiInsightsBot insights={[
 *     { type: "success", title: "Workload optimised", value: "18% lower than yesterday" },
 *     { type: "warning", title: "SLA prediction",     value: "2 tickets may breach"     },
 *     { type: "info",    title: "AI suggestion",      value: "Assign 4 pending tickets"  },
 *     { type: "trend",   title: "Avg resolution",     value: "Down 34 min today"         },
 *   ]} />
 *
 * Bot image:
 *   Place your PNG at:  src/assets/ai-bot.png
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingDown, AlertTriangle, Lightbulb, TrendingUp, BrainCircuit, Activity } from "lucide-react";
import "./AiInsightsBot.css";

// ─── Bot image ────────────────────────────────────────────────────────────────
import botImage from "../../assets/ai-bot.png";

function isDarkDashboard() {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.dashboardTheme === "dark";
}

// ─── Type configs ─────────────────────────────────────────────────────────────
const TYPE_CFG = {
  success: {
    Icon: TrendingDown,
    bg:        "rgba(236,253,245,0.97)",
    border:    "#A7F3D0",
    iconBg:    "#D1FAE5",
    iconColor: "#059669",
    dot:       "#10B981",
    title:     "#065F46",
    value:     "#047857",
    glow:      "rgba(16,185,129,0.18)",
  },
  warning: {
    Icon: AlertTriangle,
    bg:        "rgba(255,251,235,0.97)",
    border:    "#FDE68A",
    iconBg:    "#FEF3C7",
    iconColor: "#D97706",
    dot:       "#F59E0B",
    title:     "#92400E",
    value:     "#B45309",
    glow:      "rgba(245,158,11,0.18)",
  },
  info: {
    Icon: Lightbulb,
    bg:        "rgba(238,242,255,0.97)",
    border:    "#C7D2FE",
    iconBg:    "#E0E7FF",
    iconColor: "#4F46E5",
    dot:       "#818CF8",
    title:     "#3730A3",
    value:     "#4338CA",
    glow:      "rgba(99,102,241,0.18)",
  },
  trend: {
    Icon: TrendingUp,
    bg:        "rgba(240,249,255,0.97)",
    border:    "#BAE6FD",
    iconBg:    "#E0F2FE",
    iconColor: "#0284C7",
    dot:       "#38BDF8",
    title:     "#0C4A6E",
    value:     "#0369A1",
    glow:      "rgba(56,189,248,0.18)",
  },
};

const DEFAULT_INSIGHTS = [
  { type: "success", title: "Workload optimised",   value: "18% lower than yesterday"  },
  { type: "warning", title: "SLA prediction",       value: "2 tickets may breach soon" },
  { type: "info",    title: "AI suggestion",        value: "Assign 4 pending tickets"  },
  { type: "trend",   title: "Avg. resolution time", value: "Down 34 min today"         },
];

const PARTICLES = [
  { top: "10%", left:  "8%", size: 5, dur: "3.2s", delay: "0s"   },
  { top: "20%", left: "85%", size: 4, dur: "4.0s", delay: "0.5s" },
  { top: "55%", left:  "7%", size: 6, dur: "3.7s", delay: "1.1s" },
  { top: "70%", left: "88%", size: 4, dur: "4.4s", delay: "0.8s" },
  { top: "82%", left: "25%", size: 3, dur: "3.0s", delay: "1.6s" },
  { top: "40%", left: "91%", size: 5, dur: "4.8s", delay: "0.3s" },
];

// ─── Floating insight chip ────────────────────────────────────────────────────
function InsightChip({ item, animState, dark }) {
  const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.info;
  const { Icon } = cfg;
  const chipBg = dark ? "rgba(15,23,42,0.92)" : cfg.bg;
  const chipBorder = dark ? "rgba(148,163,184,0.16)" : cfg.border;
  const chipText = dark ? "#e5edf7" : cfg.title;
  const chipSubText = dark ? "#cbd5e1" : cfg.value;

  return (
    <div
      className={
        animState === "enter"
          ? "ai-insight-enter"
          : animState === "exit"
          ? "ai-insight-exit"
          : ""
      }
      style={{
        display:             "flex",
        alignItems:          "center",
        gap:                 10,
        background:          chipBg,
        border:              `1.5px solid ${chipBorder}`,
        borderRadius:        14,
        padding:             "11px 14px",
        boxShadow:           dark ? "0 14px 34px rgba(2,6,23,0.45)" : `0 6px 24px ${cfg.glow}, 0 1px 4px rgba(0,0,0,0.07)`,
        backdropFilter:      "blur(10px)",
        WebkitBackdropFilter:"blur(10px)",
        width:               "100%",
        pointerEvents:       "none",
      }}
    >
      {/* Icon */}
      <div style={{
        width:        36, height: 36,
        borderRadius: 10,
        background:   dark ? "rgba(255,255,255,0.08)" : cfg.iconBg,
        display:      "flex",
        alignItems:   "center",
        justifyContent:"center",
        flexShrink:   0,
      }}>
        <Icon style={{ width: 17, height: 17, color: dark ? "#c7d2fe" : cfg.iconColor }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 12, fontWeight: 700,
          color: chipText, lineHeight: 1.3,
        }}>
          {item.title}
        </p>
        <p style={{
          margin: "2px 0 0", fontSize: 11, color: chipSubText,
          lineHeight: 1.3, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.value}
        </p>
      </div>

      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: cfg.dot, flexShrink: 0,
        boxShadow: `0 0 8px ${cfg.dot}`,
      }} />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function AiInsightsBot({ insights }) {
  const dark = isDarkDashboard();
  const navigate = useNavigate();
  const list = useMemo(() => {
    const source = insights && insights.length ? insights : DEFAULT_INSIGHTS;
    const typeScore = { warning: 80, danger: 95, info: 45, trend: 55, success: 25 };
    return [...source].sort((a, b) => (b.score ?? typeScore[b.type] ?? 40) - (a.score ?? typeScore[a.type] ?? 40));
  }, [insights]);
  const thinkingItems = list.slice(0, 3).map((item, index) => {
    const lower = `${item.title} ${item.value}`.toLowerCase();
    const label = lower.includes("sla") || lower.includes("breach")
      ? "Checking SLA exposure"
      : lower.includes("assign") || lower.includes("unassigned")
      ? "Finding ownership gaps"
      : lower.includes("critical") || lower.includes("p1")
      ? "Prioritising critical work"
      : lower.includes("resolution") || lower.includes("resolved")
      ? "Reading delivery pace"
      : index === 0
      ? "Finding strongest signal"
      : "Comparing live context";
    return { label, value: `${item.title}: ${item.value}` };
  });

  const [activeIdx, setActiveIdx] = useState(0);
  const [animState, setAnimState] = useState("enter");
  const timerRef = useRef(null);

  const advance = useCallback(() => {
    setAnimState("exit");
    setTimeout(() => {
      setActiveIdx(prev => (prev + 1) % list.length);
      setAnimState("enter");
      setTimeout(() => setAnimState("idle"), 450);
    }, 340);
  }, [list.length]);

  useEffect(() => {
    const settle = setTimeout(() => setAnimState("idle"), 450);
    timerRef.current = setInterval(advance, 2000);
    return () => {
      clearTimeout(settle);
      clearInterval(timerRef.current);
    };
  }, [advance]);

  return (

    <div
    className="relative isolate overflow-visible  rounded-2xl shadow-sm p-5 h-[280px]"
    style={{
      background: dark ? "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(13,18,32,0.98))" : "#fff",
      border: dark ? "1px solid rgba(165,180,252,0.16)" : "1px solid #e5e7eb",
      boxShadow: dark ? "0 24px 56px rgba(2,6,23,0.58)" : "0 1px 2px rgba(0,0,0,0.05)",
    }}
    >


    {/* HEADER */}
    <div className="flex items-center justify-between relative z-30">

        <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: dark ? "#c7d2fe" : "#8b5cf6" }}/>

            <span className="font-semibold text-sm" style={{ color: dark ? "#e5edf7" : "#111827" }}>
                AI Insights
            </span>

            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: dark ? "rgba(241, 241, 241, 0.86)" : "#f5f3ff", color: dark ? "#ff405a" : "#ed3a58" }}
              >
                  Live
              </span>
        </div>


        

    </div>

    {/* THINKING TRACE */}
    <div className="absolute left-4 right-4 bottom-12 z-40 rounded-xl p-3"
      style={{
        background: dark ? "rgba(15,23,42,0.78)" : "rgba(255,255,255,0.76)",
        border: dark ? "1px solid rgba(165,180,252,0.14)" : "1px solid rgba(221,214,254,0.7)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <BrainCircuit size={12} style={{ color: dark ? "#c4b5fd" : "#7c3aed" }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: dark ? "#c4b5fd" : "#6d28d9" }}>
          Thinking
        </span>
        <span className="ml-auto flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1 h-1 rounded-full" style={{ background: dark ? "#a78bfa" : "#8b5cf6", animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </span>
      </div>
      <div className="space-y-1.5">
        {thinkingItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2 min-w-0">
            <Activity size={10} style={{ color: dark ? "#94a3b8" : "#64748b", flexShrink: 0 }} />
            <span className="text-[10.5px] truncate" style={{ color: dark ? "#cbd5e1" : "#475569" }}>
              <b>{item.label}</b> - {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* ROTATING FLOATING INSIGHT */}
    <div
    key={activeIdx}
    className={`absolute z-40 top-[60px] -left-3 w-[210px] rounded-xl px-3 py-2.5 backdrop-blur-xl ${animState === "enter" ? "ai-insight-enter" : animState === "exit" ? "ai-insight-exit" : ""}`}
    style={{
      background: dark ? "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(17,24,39,0.92))" : "rgba(255,255,255,0.82)",
      border: dark ? "1px solid rgba(165,180,252,0.18)" : "1px solid #d1d1d1bb",
      boxShadow: dark ? "0 20px 44px rgba(2,6,23,0.50)" : "0 12px 35px rgba(109,61,245,0.22)",
      overflow: "visible",
    }}
    >

        <div
        className="text-xs font-semibold"
        style={{ color: dark ? "#e5edf7" : "#374151" }}
        >
            {list[activeIdx]?.title}
        </div>


        <div
        className="text-[11px] mt-1"
        style={{ color: dark ? "#94a3b8" : "#9ca3af" }}
        >
            {list[activeIdx]?.value}
        </div>


    </div>




    {/* INNER CLIP — contains glow + bot so they don't escape the card */}
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0">

      {/* PURPLE GLOW */}
      <div
        className="ai-bot-glow absolute right-5 top-5 w-44 h-44 rounded-full"
        style={{ background: dark ? "rgba(99,102,241,0.22)" : "#c4b5fd" }}
      />

      {/* BOT IMAGE */}
      <div
        className="absolute right-0 top-0"
        style={{ transform: "translate(20%, -10%)" }}
      >
        <img
          src={botImage}
          alt="AI Bot"
          className="ai-bot-float w-[220px] max-w-none drop-shadow-2xl"
        />
      </div>

    </div>

    




    <div className="absolute bottom-4 left-4 right-4 z-40 flex items-center justify-between text-[10px] font-semibold"
      style={{ color: dark ? "#94a3b8" : "#64748b" }}
    >
      <span>Signals: {list.length}</span>
      <span
        onClick={() => navigate('/reports')}
        style={{ color: dark ? "#c7d2fe" : "#7c3aed", cursor: "pointer" }}
        className="hover:underline"
      >
        Live analysis
      </span>
    </div>

    </div>
  );

}
