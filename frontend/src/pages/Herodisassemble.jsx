import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

/**
 * HeroDisassemble
 * ----------------
 * A scroll-pinned hero section where a "DeskFlow dashboard" mockup starts
 * fully assembled, then blows apart into its component panels (ticket
 * table, stats card, notifications, reports) as the user scrolls through
 * the section — with floating "collaborator" cursor tags, à la the
 * Untitled UI marketing site.
 *
 * SETUP
 *   npm install framer-motion
 *
 * USAGE
 *   Drop <HeroDisassemble /> directly into your landing page, between
 *   your other sections:
 *
 *     <Hero />
 *     <HeroDisassemble />
 *     <FeatureSection />
 *
 *   It manages its own scroll height (300vh) and pins itself internally —
 *   no wrapper markup needed.
 *
 * CUSTOMIZING PANELS
 *   Each entry in PANELS below is a placeholder styled to look like a
 *   DeskFlow surface (ticket table / stats / bell / reports). Swap the
 *   `render()` JSX for your actual components (e.g. a scaled-down,
 *   read-only <TicketTable /> or <ReportsPage /> card) once you're happy
 *   with the choreography — the animation math doesn't change.
 */

// --- Panel definitions -----------------------------------------------
// `box`   = assembled position/size inside the 960x600 stage (percent).
// `from`  = {x, y, rotate} offset applied at scrollYProgress = 0 (start,
//           i.e. fully assembled) — wait, see note below on direction.
// `to`    = {x, y, rotate} offset applied at scrollYProgress = 1 (fully
//           disassembled / scattered).
const PANELS = [
  {
    id: "tickets",
    box: { top: "0%", left: "0%", width: "60%", height: "68%" },
    to: { x: -140, y: -60, rotate: -8 },
    z: 10,
    render: () => <TicketTablePanel />,
  },
  {
    id: "stats",
    box: { top: "0%", left: "63%", width: "37%", height: "30%" },
    to: { x: 160, y: -90, rotate: 10 },
    z: 20,
    render: () => <StatsPanel />,
  },
  {
    id: "notifications",
    box: { top: "34%", left: "63%", width: "37%", height: "32%" },
    to: { x: 190, y: 20, rotate: -6 },
    z: 30,
    render: () => <NotificationsPanel />,
  },
  {
    id: "reports",
    box: { top: "70%", left: "0%", width: "60%", height: "30%" },
    to: { x: -120, y: 120, rotate: 6 },
    z: 15,
    render: () => <ReportsPanel />,
  },
  {
    id: "reports-mini",
    box: { top: "70%", left: "63%", width: "37%", height: "30%" },
    to: { x: 170, y: 140, rotate: -10 },
    z: 25,
    render: () => <SlaPanel />,
  },
];

// Cursor tags that drift in as pieces separate.
const CURSOR_TAGS = [
  { id: "priya", name: "Priya Sharma", color: "#4318FF", to: { x: -180, y: -110 }, appearAt: 0.35 },
  { id: "rahul", name: "Rahul Verma", color: "#01B574", to: { x: 210, y: 60 }, appearAt: 0.5 },
];

export default function HeroDisassemble() {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Smooth out the raw scroll progress a little.
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.4,
  });

  // Headline fades/lifts out early so it doesn't fight the exploded panels.
  const headlineOpacity = useTransform(progress, [0, 0.25], [1, 0]);
  const headlineY = useTransform(progress, [0, 0.25], [0, -30]);

  // Stage very slightly scales down as it disassembles for depth.
  const stageScale = useTransform(progress, [0, 1], [1, 0.94]);

  return (
    <section
      ref={containerRef}
      className="relative h-[300vh]"
      style={{ background: "#F4F7FE" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6">
        {/* Headline */}
        <motion.div
          style={{ opacity: headlineOpacity, y: headlineY }}
          className="text-center mb-10 max-w-2xl"
        >
          <p
            className="text-sm font-semibold tracking-wide mb-3"
            style={{ color: "#4318FF" }}
          >
            DeskFlow
          </p>
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: "#1B2559" }}
          >
            One helpdesk. Every moving part, in sync.
          </h2>
          <p className="text-base" style={{ color: "#A3AED0" }}>
            Tickets, SLAs, notifications, and reports — all live, all
            connected, all in one view.
          </p>
        </motion.div>

        {/* Stage */}
        <motion.div
          style={{ scale: stageScale }}
          className="relative w-full max-w-4xl aspect-[16/10]"
        >
          {PANELS.map((panel) => (
            <Panel key={panel.id} panel={panel} progress={progress} />
          ))}

          {CURSOR_TAGS.map((tag) => (
            <CursorTag key={tag.id} tag={tag} progress={progress} />
          ))}
        </motion.div>

        {/* Scroll hint */}
        <motion.p
          style={{ opacity: useTransform(progress, [0, 0.15], [1, 0]) }}
          className="mt-8 text-xs tracking-wide"
        >
          <span style={{ color: "#A3AED0" }}>Scroll to explore ↓</span>
        </motion.p>
      </div>
    </section>
  );
}

// --- Individual panel wrapper: handles the assemble/disassemble motion --
function Panel({ panel, progress }) {
  const x = useTransform(progress, [0, 1], [0, panel.to.x]);
  const y = useTransform(progress, [0, 1], [0, panel.to.y]);
  const rotate = useTransform(progress, [0, 1], [0, panel.to.rotate]);
  const shadow = useTransform(
    progress,
    [0, 1],
    ["0px 4px 12px rgba(20,20,50,0.06)", "0px 24px 40px rgba(20,20,50,0.18)"]
  );

  return (
    <motion.div
      style={{
        position: "absolute",
        top: panel.box.top,
        left: panel.box.left,
        width: panel.box.width,
        height: panel.box.height,
        zIndex: panel.z,
        x,
        y,
        rotate,
        boxShadow: shadow,
      }}
      className="rounded-xl bg-white overflow-hidden border border-[#E9EDF7]"
    >
      {panel.render()}
    </motion.div>
  );
}

function CursorTag({ tag, progress }) {
  const opacity = useTransform(
    progress,
    [tag.appearAt - 0.05, tag.appearAt, 0.9, 1],
    [0, 1, 1, 0]
  );
  const x = useTransform(progress, [0, 1], [0, tag.to.x]);
  const y = useTransform(progress, [0, 1], [0, tag.to.y]);

  return (
    <motion.div
      style={{
        position: "absolute",
        top: "45%",
        left: "50%",
        opacity,
        x,
        y,
        zIndex: 40,
      }}
      className="pointer-events-none"
    >
      <div
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-lg whitespace-nowrap"
        style={{ background: tag.color }}
      >
        {tag.name}
      </div>
    </motion.div>
  );
}

// --- Placeholder DeskFlow-styled panel contents ------------------------
// Swap these for real, scaled-down versions of your components whenever
// you're ready — the layout/animation shell above stays the same.

function TicketTablePanel() {
  const rows = [
    { id: "#1042", subject: "VPN drops on login", status: "Open", tone: "#4318FF" },
    { id: "#1041", subject: "Invoice export bug", status: "In Progress", tone: "#FFB547" },
    { id: "#1039", subject: "Reset SSO for client", status: "Resolved", tone: "#01B574" },
  ];
  return (
    <div className="p-4 h-full flex flex-col">
      <p className="text-xs font-semibold mb-3" style={{ color: "#1B2559" }}>
        Open tickets
      </p>
      <div className="flex-1 space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between text-[11px] rounded-lg px-2 py-1.5 bg-[#F4F7FE]"
          >
            <span className="font-medium" style={{ color: "#1B2559" }}>
              {r.id} — {r.subject}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-white font-medium"
              style={{ background: r.tone }}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsPanel() {
  return (
    <div className="p-4 h-full flex flex-col justify-center">
      <p className="text-[10px] mb-1" style={{ color: "#A3AED0" }}>
        Avg. resolution time
      </p>
      <p className="text-2xl font-bold" style={{ color: "#1B2559" }}>
        3.4h
      </p>
      <p className="text-[10px] mt-1" style={{ color: "#01B574" }}>
        ▲ 12% faster than last week
      </p>
    </div>
  );
}

function NotificationsPanel() {
  const items = ["New ticket assigned to you", "SLA breach warning: #1042", "Priya commented on #1039"];
  return (
    <div className="p-4 h-full flex flex-col">
      <p className="text-xs font-semibold mb-2" style={{ color: "#1B2559" }}>
        Notifications
      </p>
      <div className="space-y-1.5">
        {items.map((t, i) => (
          <div key={i} className="text-[10px] rounded-md px-2 py-1 bg-[#F4F7FE]" style={{ color: "#1B2559" }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsPanel() {
  const bars = [40, 65, 30, 80, 55, 70, 45];
  return (
    <div className="p-4 h-full flex flex-col">
      <p className="text-xs font-semibold mb-3" style={{ color: "#1B2559" }}>
        Tickets closed / day
      </p>
      <div className="flex-1 flex items-end gap-1.5">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%`, background: i === 3 ? "#4318FF" : "#C9D4F5" }}
          />
        ))}
      </div>
    </div>
  );
}

function SlaPanel() {
  return (
    <div className="p-4 h-full flex flex-col justify-center items-center text-center">
      <p className="text-[10px] mb-1" style={{ color: "#A3AED0" }}>
        SLA compliance
      </p>
      <p className="text-2xl font-bold" style={{ color: "#4318FF" }}>
        96%
      </p>
    </div>
  );
}