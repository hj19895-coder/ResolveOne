import { useEffect, useRef } from "react";
import "./DashboardShowcase.css";

/**
 * DashboardShowcase
 * ------------------
 * A scroll-pinned section: a dashboard mockup starts fully assembled,
 * then blows apart into its component panels as the user scrolls through
 * the section, with floating collaborator tags drifting in — same idea
 * as the Untitled UI marketing site, but built with plain refs + rAF to
 * match the rest of this codebase (no framer-motion dependency).
 *
 * USAGE (in Landing.jsx):
 *   import DashboardShowcase from "./DashboardShowcase";
 *   ...
 *   </header>                     {/* end of hero *\/}
 *   <DashboardShowcase />
 *   <section id="stats"> ... </section>
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Assembled box position/size (percent of stage) + final scattered offset.
const PANELS = [
  {
    id: "tickets",
    box: { top: "0%", left: "0%", width: "58%", height: "62%" },
    stack: { x: 70, y: 50, rot: -9, scale: 0.92, z: -60 },
    zBase: 5,
    render: () => <TicketsPanel />,
  },
  {
    id: "stats",
    box: { top: "0%", left: "61%", width: "39%", height: "28%" },
    stack: { x: -90, y: 130, rot: 12, scale: 0.86, z: -160 },
    zBase: 3,
    render: () => <StatsPanel />,
  },
  {
    id: "notifications",
    box: { top: "32%", left: "61%", width: "39%", height: "30%" },
    stack: { x: -60, y: 20, rot: -14, scale: 0.88, z: -120 },
    zBase: 4,
    render: () => <NotificationsPanel />,
  },
  {
    id: "chart",
    box: { top: "66%", left: "0%", width: "58%", height: "34%" },
    stack: { x: 50, y: -110, rot: 10, scale: 0.9, z: -100 },
    zBase: 2,
    render: () => <ChartPanel />,
  },
  {
    id: "agents",
    box: { top: "66%", left: "61%", width: "39%", height: "34%" },
    stack: { x: -70, y: -60, rot: -11, scale: 0.84, z: -200 },
    zBase: 1,
    render: () => <AgentsPanel />,
  },
];

const CURSOR_TAGS = [
  { id: "priya", name: "Priya Sharma", accent: "#a855f7", from: { x: -40, y: 60 }, to: { x: -170, y: -110 }, appearAt: 0.3, fadeAt: 0.82 },
  { id: "rahul", name: "Rahul Verma", accent: "#22d3ee", from: { x: 30, y: -50 }, to: { x: 210, y: 70 }, appearAt: 0.46, fadeAt: 0.92 },
];

export default function DashboardShowcase() {
  const sectionRef = useRef(null);
  const headlineRef = useRef(null);
  const hintRef = useRef(null);
  const panelRefs = useRef({});
  const tagRefs = useRef({});

  useEffect(() => {
    let rafId;

    const apply = (progress) => {
      // headline: fully visible while the stack is piled up (early scroll),
      // fades out as the dashboard assembles
      const hp = clamp(progress / 0.3, 0, 1);
      if (headlineRef.current) {
        headlineRef.current.style.opacity = String(1 - hp);
        headlineRef.current.style.transform = `translateY(${-30 * hp}px)`;
      }
      if (hintRef.current) {
        const hintP = clamp(progress / 0.15, 0, 1);
        hintRef.current.style.opacity = String(1 - hintP);
      }

      // f = 1 at the very start (fully stacked/piled), 0 once assembled
      const f = 1 - clamp(progress / 0.85, 0, 1);
      const ease = f * f * (3 - 2 * f); // smoothstep, nicer settle at the end

      PANELS.forEach((panel) => {
        const el = panelRefs.current[panel.id];
        if (!el) return;
        const { x, y, rot, scale, z } = panel.stack;
        const tx = x * ease;
        const ty = y * ease;
        const tz = z * ease;
        const trot = rot * ease;
        const tscale = 1 + (scale - 1) * ease;
        el.style.transform =
          `translate3d(${tx}px, ${ty}px, ${tz}px) rotate(${trot}deg) scale(${tscale})`;
        el.style.zIndex = String(Math.round(panel.zBase + (10 - panel.zBase) * (1 - ease)));
        el.style.boxShadow =
          ease > 0.02
            ? `0 ${18 + 26 * ease}px ${30 + 50 * ease}px rgba(0,0,0,${0.25 + 0.35 * ease})`
            : "0 4px 14px rgba(0,0,0,0.2)";
      });

      CURSOR_TAGS.forEach((tag) => {
        const el = tagRefs.current[tag.id];
        if (!el) return;
        const fadeIn = clamp((progress - (tag.appearAt - 0.05)) / 0.12, 0, 1);
        const fadeOut = clamp((tag.fadeAt - progress) / 0.1, 0, 1);
        const opacity =
          progress < tag.appearAt ? 0 : Math.min(fadeIn, progress > tag.fadeAt - 0.1 ? fadeOut : 1);
        el.style.opacity = String(Math.max(opacity, 0));
        const travel = clamp((progress - tag.appearAt) / (tag.fadeAt - tag.appearAt), 0, 1);
        const x = tag.from.x + (tag.to.x - tag.from.x) * travel;
        const y = tag.from.y + (tag.to.y - tag.from.y) * travel;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };

    const tick = () => {
      const el = sectionRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
        apply(progress);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <section ref={sectionRef} className="dsx-section">
      <div className="dsx-sticky">
        <div ref={headlineRef} className="dsx-headline">
          <p className="dsx-eyebrow">Under the hood</p>
          <h2 className="dsx-h2">
            Every part of your queue, <em>working together</em>
          </h2>
          <p className="dsx-sub">
            Tickets, SLAs, notifications, and reports stay in sync in real time —
            no tab-switching, no stale data.
          </p>
        </div>

        <div className="dsx-stage">
          {PANELS.map((panel) => (
            <div
              key={panel.id}
              ref={(el) => (panelRefs.current[panel.id] = el)}
              className="dsx-panel"
              style={{ ...panel.box }}
            >
              {panel.render()}
            </div>
          ))}

          {CURSOR_TAGS.map((tag) => (
            <div
              key={tag.id}
              ref={(el) => (tagRefs.current[tag.id] = el)}
              className="dsx-cursor-tag"
              style={{ "--tag-accent": tag.accent }}
            >
              <svg className="dsx-cursor-arrow" width="16" height="18" viewBox="0 0 16 18" fill="none">
                <path d="M1 1l4.5 15 2.7-6.3L14.5 7 1 1z" fill={tag.accent} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
              </svg>
              <span className="dsx-cursor-label">{tag.name}</span>
            </div>
          ))}
        </div>

        <p ref={hintRef} className="dsx-hint">
          Scroll to explore ↓
        </p>
      </div>
    </section>
  );
}

/* ── Placeholder panel contents (swap for real components later) ──── */

function TicketsPanel() {
  const rows = [
    { id: "TK-4821", subject: "All Agents Unable to Login", tag: "critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    { id: "TK-4820", subject: "Api Not Working", tag: "open", color: "#22d3ee", bg: "rgba(34,211,238,0.10)" },
    { id: "TK-4819", subject: "Submit button not responding", tag: "open", color: "#22d3ee", bg: "rgba(34,211,238,0.10)" },
  ];
  return (
    <div className="dsx-panel-inner">
      <p className="dsx-panel-title">Support Queue</p>
      <div className="dsx-ticket-list">
        {rows.map((r) => (
          <div key={r.id} className="dsx-ticket-row">
            <span className="dsx-ticket-tag" style={{ color: r.color, background: r.bg }}>
              {r.tag}
            </span>
            <span className="dsx-ticket-subject">{r.subject}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsPanel() {
  return (
    <div className="dsx-panel-inner dsx-panel-center">
      <span className="dsx-stat-lbl">SLA met</span>
      <span className="dsx-stat-val">98%</span>
    </div>
  );
}

function NotificationsPanel() {
  const items = ["New ticket assigned to you", "SLA breach warning: TK-4821", "Priya commented on TK-4819"];
  return (
    <div className="dsx-panel-inner">
      <p className="dsx-panel-title">Notifications</p>
      <div className="dsx-notif-list">
        {items.map((t, i) => (
          <div key={i} className="dsx-notif-item">
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartPanel() {
  const bars = [40, 65, 30, 80, 55, 70, 45];
  return (
    <div className="dsx-panel-inner">
      <p className="dsx-panel-title">Resolved / day</p>
      <div className="dsx-chart">
        {bars.map((h, i) => (
          <div key={i} className="dsx-bar" style={{ height: `${h}%`, opacity: i === 3 ? 1 : 0.5 }} />
        ))}
      </div>
    </div>
  );
}

function AgentsPanel() {
  return (
    <div className="dsx-panel-inner dsx-panel-center">
      <div className="dsx-avatar-stack">
        <span style={{ background: "linear-gradient(135deg,#f97316,#ef4444)" }}>AK</span>
        <span style={{ background: "linear-gradient(135deg,#c084fc,#6366f1)" }}>MJ</span>
        <span style={{ background: "linear-gradient(135deg,#22d3ee,#6366f1)" }}>TD</span>
      </div>
      <span className="dsx-stat-lbl">3 agents online</span>
    </div>
  );
}