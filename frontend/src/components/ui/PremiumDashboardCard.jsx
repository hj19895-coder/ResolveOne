import { useEffect, useRef, useState } from "react";

function useCountUp(target, durationMs = 900) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        let start = null;
        const tick = (ts) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / durationMs, 1);
          setVal(Math.round(p * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [target, durationMs]);

  return { ref, val };
}

function buildSparkline(values = [], W = 200, H = 46, pad = 5) {
  const n = values.length;
  if (n === 0) return { line: "", area: "" };
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const span = vMax - vMin || 1;
  const iW = W - pad * 2;
  const iH = H - pad * 2;
  const pts = values.map((v, i) => ({
    x: pad + (n === 1 ? 0 : (iW * i) / (n - 1)),
    y: pad + iH - iH * ((v - vMin) / span),
  }));

  if (pts.length === 1) {
    const d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    return { line: d, area: `${d} L${pts[0].x},${H} Z` };
  }

  // Cubic bezier through each point using horizontal-only control offsets
  // (control points share each endpoint's own y) — this is what actually
  // produces a smooth curve; the old version's control point averaged
  // both x AND y, which mathematically collapses the curve into a
  // straight line, hence the sharp/angular peaks.
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;

    // Catmull-Rom -> Bezier control points, smooths through all points
    // (not just the two endpoints) for a natural, rounded curve
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  const area = `${d} L${last.x},${H} L${pts[0].x},${H} Z`;
  return { line: d, area };
}

const ACCENT = {
  indigo: {
    card:      { background: "#4318FF", border: "transparent" },
    label:     { color: "rgba(255,255,255,0.65)" },
    value:     { color: "#fff" },
    sub:       { color: "rgba(255,255,255,0.5)" },
    divider:   { background: "rgba(255,255,255,0.15)" },
    icon:      { background: "rgba(255,255,255,0.15)", color: "#fff" },
    pill:      { background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.9)" },
    action:    { background: "rgba(255,255,255,0.15)", color: "#fff", border: "rgba(255,255,255,0.25)" },
    sparkLine: "rgba(255,255,255,0.85)",
    sparkFill: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0)"],
    shadow:    "0 4px 24px rgba(67,24,255,0.22)",
    shadowHov: "0 10px 32px rgba(67,24,255,0.3)",
  },
  emerald: {
    card:      { background: "#fff", border: "rgba(200,190,255,0.3)" },
    label:     { color: "#A3AED0" },
    value:     { color: "#1B2559" },
    sub:       { color: "#A3AED0" },
    divider:   { background: "rgba(163,174,208,0.15)" },
    icon:      { background: "#eaf3de", color: "#3b6d11" },
    pill:      { background: "#eaf3de", color: "#3b6d11" },
    action:    { background: "#eaf3de", color: "#3b6d11", border: "#c0dd97" },
    sparkLine: "#10b981",
    sparkFill: ["rgba(16,185,129,0.2)", "rgba(16,185,129,0)"],
    shadow:    "0 2px 12px rgba(99,102,241,0.06)",
    shadowHov: "0 8px 24px rgba(99,102,241,0.10)",
  },
  amber: {
    card:      { background: "#fff", border: "rgba(200,190,255,0.3)" },
    label:     { color: "#A3AED0" },
    value:     { color: "#1B2559" },
    sub:       { color: "#A3AED0" },
    divider:   { background: "rgba(163,174,208,0.15)" },
    icon:      { background: "#faeeda", color: "#854f0b" },
    pill:      { background: "#faeeda", color: "#854f0b" },
    action:    { background: "#faeeda", color: "#854f0b", border: "#fac775" },
    sparkLine: "#f59e0b",
    sparkFill: ["rgba(245,158,11,0.2)", "rgba(245,158,11,0)"],
    shadow:    "0 2px 12px rgba(99,102,241,0.06)",
    shadowHov: "0 8px 24px rgba(99,102,241,0.10)",
  },
  rose: {
    card:      { background: "#fff", border: "rgba(200,190,255,0.3)" },
    label:     { color: "#A3AED0" },
    value:     { color: "#1B2559" },
    sub:       { color: "#A3AED0" },
    divider:   { background: "rgba(163,174,208,0.15)" },
    icon:      { background: "#fbeaf0", color: "#993556" },
    pill:      { background: "#fbeaf0", color: "#993556" },
    action:    { background: "#fbeaf0", color: "#993556", border: "#f4c0d1" },
    sparkLine: "#e11d48",
    sparkFill: ["rgba(225,29,72,0.15)", "rgba(225,29,72,0)"],
    shadow:    "0 2px 12px rgba(99,102,241,0.06)",
    shadowHov: "0 8px 24px rgba(99,102,241,0.10)",
  },
  // ── NEW: SLA Breached ──────────────────────────────────────────────────────
  orange: {
    card:      { background: "#fff", border: "rgba(239,68,68,0.2)" },
    label:     { color: "#A3AED0" },
    value:     { color: "#dc2626" },
    sub:       { color: "#A3AED0" },
    divider:   { background: "rgba(239,68,68,0.12)" },
    icon:      { background: "#fff1f0", color: "#dc2626" },
    pill:      { background: "#fff1f0", color: "#dc2626" },
    action:    { background: "#fff1f0", color: "#dc2626", border: "#fca5a5" },
    sparkLine: "#ef4444",
    sparkFill: ["rgba(239,68,68,0.18)", "rgba(239,68,68,0)"],
    shadow:    "0 2px 14px rgba(239,68,68,0.10)",
    shadowHov: "0 8px 24px rgba(239,68,68,0.18)",
  },
  // ── NEW: Unassigned Tickets ────────────────────────────────────────────────
  slate: {
    card:      { background: "#fff", border: "rgba(99,102,241,0.18)" },
    label:     { color: "#A3AED0" },
    value:     { color: "#1B2559" },
    sub:       { color: "#A3AED0" },
    divider:   { background: "rgba(163,174,208,0.15)" },
    icon:      { background: "#ede9fe", color: "#5b21b6" },
    pill:      { background: "#ede9fe", color: "#5b21b6" },
    action:    { background: "#4318FF", color: "#fff", border: "transparent" },
    sparkLine: "#6366f1",
    sparkFill: ["rgba(99,102,241,0.18)", "rgba(99,102,241,0)"],
    shadow:    "0 2px 12px rgba(99,102,241,0.08)",
    shadowHov: "0 8px 24px rgba(99,102,241,0.14)",
  },
};

const ICONS = {
  ticket: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  bar: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  // NEW icons
  warning: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

// ── Priority breakdown rows ───────────────────────────────────────────────────
function PriorityRows({ breakdown, total, colors }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 350);
    return () => clearTimeout(t);
  }, []);

  const rows = [
    { label: "P1 Critical", key: "p1", color: "#e24b4a" },
    { label: "P2 High",     key: "p2", color: "#ef9f27" },
    { label: "P3 Medium",   key: "p3", color: "#639922" },
    { label: "P4 Low",      key: "p4", color: "#378add" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map(({ label, key, color }) => {
        const count = breakdown[key] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 74, fontSize: 11, fontWeight: 500, color: colors.label.color, flexShrink: 0 }}>
              {label}
            </span>
            <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(163,174,208,0.15)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, background: color,
                width: animate ? `${pct}%` : "0%",
                transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
            <span style={{ width: 20, textAlign: "right", fontSize: 11, fontWeight: 500, color: colors.value.color }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── SLA breach sub-rows ───────────────────────────────────────────────────────
function SlaRows({ slaData, colors }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 350);
    return () => clearTimeout(t);
  }, []);

  const total = (slaData.critical ?? 0) + (slaData.high ?? 0) + (slaData.medium ?? 0);

  const rows = [
    { label: "Critical",  key: "critical", color: "#dc2626" },
    { label: "High",      key: "high",     color: "#f97316" },
    { label: "Medium",    key: "medium",   color: "#f59e0b" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map(({ label, key, color }) => {
        const count = slaData[key] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 52, fontSize: 11, fontWeight: 500, color: colors.label.color, flexShrink: 0 }}>
              {label}
            </span>
            <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(239,68,68,0.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, background: color,
                width: animate ? `${pct}%` : "0%",
                transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
            <span style={{ width: 20, textAlign: "right", fontSize: 11, fontWeight: 500, color: "#dc2626" }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PremiumDashboardCard({
  theme = "light",
  colorKey = "indigo",
  label,
  sub,
  iconKey = "ticket",
  counter = { target: 0, durationMs: 900 },
  pill,
  sparklineSeries,
  priorityBreakdown,
  slaBreakdown,
  actionLabel,
  onActionClick,
  compact = false,
  minHeight,
  children,
}) {
  const colors = ACCENT[colorKey] ?? ACCENT.indigo;
  const dark = theme === "dark";
  const { ref, val } = useCountUp(counter.target ?? 0, counter.durationMs ?? 900);
  const gradId = `sg-${colorKey}-${label?.replace(/\s/g, "")}`;

  const spark = buildSparkline(sparklineSeries ?? [], 200, 46, 5);
  const hasSpark = Array.isArray(sparklineSeries) && sparklineSeries.length > 0;
  const hasSubContent = !!priorityBreakdown || !!slaBreakdown;

  const pillDir = pill?.direction;
  const pillBg =
    pillDir === "up"   ? colors.pill.background :
    pillDir === "down" ? (colorKey === "indigo" ? "rgba(255,255,255,0.18)" : colors.pill.background) :
    dark ? "rgba(148,163,184,0.14)" : "rgba(163,174,208,0.12)";
  const pillColor =
    pillDir === "up"   ? colors.pill.color :
    pillDir === "down" ? colors.pill.color :
    dark ? "#c7d2fe" : "#A3AED0";

  const cardAnimations = `
    @keyframes floatGlow {
      0% {
        transform: translate(0,0) scale(1);
      }
      50% {
        transform: translate(-25px,25px) scale(1.2);
      }
      100% {
        transform: translate(0,0) scale(1);
      }
    }

    @keyframes glassReflection {
      0% {
        left:-70%;
        opacity:0;
      }

      20% {
        opacity:.8;
      }

      50% {
        left:120%;
        opacity:.6;
      }

      100% {
        left:120%;
        opacity:0;
      }
    }

    @keyframes pulseDot {
      0%,100% {
        opacity:.25;
        transform:scale(.8);
      }
      50% {
        opacity:.9;
        transform:scale(1.5);
      }
    }
    `;  

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        overflow: "hidden",
        border  : "#000000",
        minHeight: minHeight ?? undefined,

        background:
          colorKey === "indigo"
            ? `
              radial-gradient(
              circle at 15% 15%,
              rgba(255,255,255,0.18),
              transparent 35%
              ),
              radial-gradient(
              circle at 80% 90%,
              rgba(192,132,252,0.45),
              transparent 55%
              ),
              linear-gradient(
                135deg,
                #4318FF 0%,
                #5B21F6 45%,
                #7C3AED 100%
              )
            `
            : dark
              ? {
                  emerald: "linear-gradient(180deg, rgba(8,24,23,0.98), rgba(10,19,34,0.92))",
                  amber: "linear-gradient(180deg, rgba(30,20,8,0.98), rgba(10,19,34,0.92))",
                  rose: "linear-gradient(180deg, rgba(30,10,16,0.98), rgba(10,19,34,0.92))",
                  orange: "linear-gradient(180deg, rgba(33,16,9,0.98), rgba(10,19,34,0.92))",
                  slate: "linear-gradient(180deg, rgba(14,18,34,0.98), rgba(10,19,34,0.92))",
                }[colorKey] ?? "linear-gradient(180deg, rgba(10,19,34,0.98), rgba(8,13,24,0.96))"
              : colors.card.background,

        border: `0.5px solid ${dark ? "rgba(165,180,252,0.14)" : colors.card.border}`,
        borderRadius: 14,

        padding: compact ? "12px 14px 10px" : "14px 16px 12px",
        display: "flex",
        flexDirection: "column",

        boxShadow: dark ? "0 18px 48px rgba(2, 6, 23, 0.52)" : colors.shadow,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = dark ? "0 26px 64px rgba(2, 6, 23, 0.62)" : colors.shadowHov;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = dark ? "0 18px 48px rgba(2, 6, 23, 0.52)" : colors.shadow;
      }}

    >
      {colorKey === "indigo" && (
        <style>{cardAnimations}</style>
      )}

      {colorKey === "indigo" && (
        <>
          {/* soft liquid wave */}
          {/* premium glass reflection wave */}
          <div
            style={{
              position: "absolute",

              width: "45%",
              height: "180%",

              top: "-40%",
              left: "-70%",

              background: `
                linear-gradient(
                  105deg,
                  transparent 0%,
                  rgba(255,255,255,0.02) 25%,
                  rgba(255,255,255,0.22) 50%,
                  rgba(255,255,255,0.02) 75%,
                  transparent 100%
                )
              `,

              filter: "blur(18px)",

              transform: "rotate(20deg)",

              animation: "glassReflection 4s ease-in-out infinite",

              pointerEvents: "none",


            }}
          />


          {/* top glow */}
          <span
            style={{
              position: "absolute",
              width: 120,
              height: 120,
              right: -35,
              top: -45,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(255,255,255,.25),transparent 65%)",
              animation:"floatGlow 8s ease-in-out infinite",  
            }}
          />


          {/* particles */}
          {[ 
            {top:35,left:60},
            {top:90,right:45},
            {bottom:40,left:130}
          ].map((p,i)=>(
            <span
              key={i}
              style={{
                position:"absolute",
                ...p,
                width:4,
                height:4,
                borderRadius:"50%",
                background:"#fff",
                opacity:.55,
                boxShadow:"0 0 14px white",
                animation:`pulseDot ${2+i}s ease-in-out infinite`,
              }}
            />
          ))}
        </>
      )}

      <div
      style={{
        position: "relative",
        zIndex: 2,
      }}
    >  

      
    
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: compact ? 6 : 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 400, letterSpacing: "0.01em", marginBottom: 4, ...(dark ? { color: "rgba(203,213,225,0.72)" } : colors.label) }}>
            {label}
          </div>
          <div style={{ fontSize: compact ? 22 : 30, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.03em", ...(dark ? { color: "#f8fafc" } : colors.value) }}>
            {val}
          </div>
          <div style={{ fontSize: 11, marginTop: 3, ...(dark ? { color: "rgba(203,213,225,0.56)" } : colors.sub) }}>{sub}</div>
        </div>
        <div style={{
          width: compact ? 28 : 38, height: compact ? 28 : 38, borderRadius: compact ? 8 : 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          ...(dark ? { background: "rgba(255,255,255,0.08)", color: "#f8fafc", boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset" } : colors.icon),
        }}>
          {ICONS[iconKey]}
        </div>
      </div>

      {/* Pill */}
      {/* Pill + compact action on same row */}
      {pill && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: actionLabel ? "space-between" : "flex-start", gap: 4, marginBottom: compact ? 4 : 12, width: "100%", }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 500,
            padding: "2px 7px", borderRadius: 20,
            background: pillBg, color: pillColor,
          }}>
            {pillDir === "up" && (
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            )}
            {pillDir === "down" && (
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {pill.label}
          </div>

          {/* Compact action button — inline next to pill */}
          {actionLabel && onActionClick && compact && (
            <button
              type="button"
              onClick={onActionClick}
              style={{
                padding: "2px 7px",
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "transparent",
            color: dark ? "#e2e8f0" : colors.icon.color,
                border: `0.5px solid ${dark ? "rgba(165,180,252,0.18)" : colors.action.border}`,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {actionLabel}
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Sparkline */}
      {hasSpark && !hasSubContent && (
        <div style={{ height: 32, marginTop: 4 }}>
          <svg viewBox="0 0 200 46" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.sparkFill[0]} />
                <stop offset="100%" stopColor={colors.sparkFill[1]} />
              </linearGradient>
            </defs>
            <path fill={`url(#${gradId})`} d={spark.area} />
            <path fill="none" stroke={colors.sparkLine} strokeWidth="2" strokeLinecap="round" d={spark.line} />
          </svg>
        </div>
      )}

      {/* Priority breakdown */}
      {priorityBreakdown && (
        <>
          <div style={{ height: 0.5, background: dark ? "rgba(148,163,184,0.14)" : colors.divider.background, margin: "2px 0 10px" }} />
          <PriorityRows breakdown={priorityBreakdown} total={counter.target} colors={colors} />
        </>
      )}

      {/* SLA breakdown rows */}
      {slaBreakdown && (
        <>
          <div style={{ height: 0.5, background: dark ? "rgba(148,163,184,0.14)" : colors.divider.background, margin: "2px 0 10px" }} />
          <SlaRows slaData={slaBreakdown} colors={colors} />
        </>
      )}

      
    

      {children}

    </div> 
    {/* content wrapper close */}

  </div>
);
}
