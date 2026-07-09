import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";
import DashboardPan from "./DashboardPan";



const FEATURES = [
  {
    title: "Smart ticket routing",
    desc: "Auto-assign incoming tickets to the right agent by skill, workload, and priority — no manual triage.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12h4l3 8 4-16 3 8h4" />
      </svg>
    ),
  },
  {
    title: "SLA tracking & alerts",
    desc: "Real-time SLA timers with breach warnings, so nothing slips past its deadline ever again.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6" />
      </svg>
    ),
  },
  {
    title: "Live team dashboard",
    desc: "See open, resolved, and breached tickets update in real time across your whole support team.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    title: "Powerful automations",
    desc: "Trigger actions on status changes, escalate stale tickets, and notify stakeholders automatically.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
      </svg>
    ),
  },
  {
    title: "Role-based access",
    desc: "Granular permissions for agents, managers, and admins keep sensitive data exactly where it belongs.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    ),
  },
  {
    title: "Insightful reports",
    desc: "Track resolution times, agent performance, and customer satisfaction with exportable analytics.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
];

const STATS = [
  { val: "182", lbl: "Tickets resolved / day" },
  { val: "98%", lbl: "SLA compliance" },
  { val: "2.4h", lbl: "Avg. resolution time" },
  { val: "24/7", lbl: "Live monitoring" },
];

function BrandIcon() {
  return (
    <div className="lp-brand-icon">
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M13 2L5 14H11L9 22L19 9H13V2Z" fill="#ffffff" />
      </svg>
    </div>
  );
}

/* ── Scroll reveal wrapper: fades in on enter, fades back out on exit ─── */
function Reveal({ children, as: Tag = "div", className = "", delay = 0, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`lp-reveal ${visible ? "lp-reveal-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ── Contained ripple effect for buttons ─────────────────────────────── */
function spawnRipple(e) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2.2;
  const ripple = document.createElement("span");
  ripple.className = "lp-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

/* ── Directional link: ripple + full-screen wipe, then navigate ─────── */
function DirectionalLink({ to, className, children }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    spawnRipple(e);

    const overlay = document.createElement("div");
    overlay.className = "lp-wipe";
    const maxDim = Math.max(window.innerWidth, window.innerHeight) * 2.4;
    overlay.style.left = `${e.clientX}px`;
    overlay.style.top = `${e.clientY}px`;
    overlay.style.setProperty("--wipe-size", `${maxDim}px`);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add("lp-wipe-active"));

    setTimeout(() => navigate(to), 480);
    setTimeout(() => overlay.remove(), 1200);
  };

  return (
    <a href={to} className={className} onClick={handleClick} onMouseDown={spawnRipple}>
      {children}
    </a>
  );
}

/* ── 3D Hero Visual ───────────────────────────────────────────────────── */
function HeroVisual() {
  return (
    <div className="lp-visual">
      <div className="lp-visual-glow" />
      
      {/* Main dashboard panel */}
      <div className="lp-panel">
        {/* Panel header */}
        <div className="lp-panel-header">
          <div className="lp-panel-dots">
            <span /><span /><span />
          </div>
          <span className="lp-panel-title">Support Queue</span>
          <span className="lp-panel-live"><span className="lp-live-dot" />Live</span>
        </div>

        {/* Ticket rows */}
        <div className="lp-ticket-list">
          {[
            { id: "TK-4821", subject: "All Agents Unable to Login", tag: "critical", agent: "AK", time: "45m", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
            { id: "TK-4820", subject: "Api Not Working", tag: "open", agent: "MJ", time: "2h", color: "#22d3ee", bg: "rgba(34,211,238,0.10)" },
            { id: "TK-4819", subject: "Submit button not responding", tag: "open", agent: "TD", time: "4h", color: "#22d3ee", bg: "rgba(34,211,238,0.10)" },
            { id: "TK-4817", subject: "Chola APR Issue", tag: "resolved", agent: "AK", time: "done", color: "#4ade80", bg: "rgba(74,222,128,0.10)" },
          ].map((t) => (
            <div className="lp-ticket-row" key={t.id}>
              <div className="lp-ticket-left">
                <span className="lp-ticket-tag" style={{ color: t.color, background: t.bg }}>{t.tag}</span>
                <span className="lp-ticket-subject">{t.subject}</span>
              </div>
              <div className="lp-ticket-right">
                <span className="lp-ticket-id">{t.id}</span>
                <span className="lp-ticket-avatar" style={{ background: t.tag === "critical" ? "linear-gradient(135deg,#f97316,#ef4444)" : t.tag === "resolved" ? "linear-gradient(135deg,#22d3ee,#6366f1)" : "linear-gradient(135deg,#c084fc,#6366f1)" }}>{t.agent}</span>
                <span className="lp-ticket-time" style={{ color: t.tag === "critical" ? "#f87171" : t.tag === "resolved" ? "#4ade80" : "var(--c-text-muted)" }}>{t.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stat bar */}
        <div className="lp-panel-footer">
          <div className="lp-panel-stat">
            <strong>182</strong><span>resolved today</span>
          </div>
          <div className="lp-panel-divider" />
          <div className="lp-panel-stat">
            <strong style={{ color: "#4ade80" }}>98%</strong><span>SLA met</span>
          </div>
          <div className="lp-panel-divider" />
          <div className="lp-panel-stat">
            <strong>2.4h</strong><span>avg resolve</span>
          </div>
        </div>
      </div>

      {/* Floating SLA badge */}
      <div className="lp-float-badge lp-float-badge-tl">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
        SLA breach prevented
      </div>

      {/* Floating assign badge */}
      <div className="lp-float-badge lp-float-badge-br">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.5"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>
        Auto-assigned to AK
      </div>
    </div>
  );
}



export default function Landing() {

  useEffect(() => {
    // prevent the browser from restoring the previous scroll position on
    // refresh/reload — always land at the top of the landing page
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll(".lp-feature");
    const onMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };
    cards.forEach((c) => c.addEventListener("mousemove", onMove));
    return () => cards.forEach((c) => c.removeEventListener("mousemove", onMove));
  }, []);
  return (
    <div className="lp">
      <div className="lp-bg" />
      <div className="lp-grid" />

      <div className="lp-shell">
        {/* Nav */}
        <nav className="lp-nav">
          <div className="lp-brand">
            <BrandIcon />
            <span className="lp-brand-name">ResolveOne</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#stats">Why ResolveOne</a>
            <a href="#cta">Get started</a>
          </div>
          <DirectionalLink to="/login" className="lp-nav-cta">
            Sign in
          </DirectionalLink>
        </nav>

        {/* Hero */}
        <header className="lp-hero">
          <Reveal as="div" className="lp-hero-text">
            <span className="lp-badge">
              <span className="lp-badge-dot" />
              Enterprise Support Platform
            </span>
            <h1 className="lp-h1">
              Ticket management that <em>Actually gets things resolved</em>
            </h1>
            <p className="lp-sub">
              ResolveOne gives support teams a single, real-time workspace to route, resolve, and report on every
              customer ticket — with SLAs you never miss.
            </p>
            <div className="lp-hero-cta">
              <DirectionalLink to="/login" className="lp-btn-primary">
                Sign in to your workspace
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </DirectionalLink>
              <a href="#features" className="lp-btn-ghost" onMouseDown={spawnRipple}>
                Explore features
              </a>
            </div>
          </Reveal>
          <Reveal as="div" className="lp-hero-visual" delay={120}>
            <HeroVisual />
          </Reveal>
        </header>

        <DashboardPan />

        {/* Stats */}
        <section id="stats" className="lp-stats">
          {STATS.map((s, i) => (
            <Reveal as="div" key={s.lbl} className="lp-stat" delay={i * 70}>
              <div className="lp-stat-val">{s.val}</div>
              <div className="lp-stat-lbl">{s.lbl}</div>
            </Reveal>
          ))}
        </section>

        {/* Features */}
        <section id="features" className="lp-section">
          <Reveal as="p" className="lp-eyebrow">
            Everything in one place
          </Reveal>
          <Reveal as="h2" className="lp-h2" delay={60}>
            Built for support teams that move fast
          </Reveal>
          <Reveal as="p" className="lp-section-sub" delay={120}>
            From the first ticket to the final report, ResolveOne keeps your whole team aligned and your customers
            happy.
          </Reveal>
          <div className="lp-features">
            {FEATURES.map((f, i) => (
              <Reveal as="article" key={f.title} className="lp-feature" delay={(i % 3) * 90}>
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Reveal as="section" id="cta" className="lp-cta">
          <div className="lp-cta-glow" />
          <h2>Ready to take control of your support queue?</h2>
          <p>Sign in to ResolveOne and turn ticket chaos into a calm, measurable workflow.</p>
          <DirectionalLink to="/login" className="lp-btn-primary">
            Sign in now
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </DirectionalLink>
        </Reveal>

      </div>

      {/* Footer — giant faded wordmark behind a solid gradient bottom bar */}
      <footer className="lp-footer-section">
        <div className="lp-footer-watermark" aria-hidden="true">ResolveOne</div>
        <div className="lp-footer-bar">
          <span>© {new Date().getFullYear()} ResolveOne, Inc. All rights reserved</span>
          <div className="lp-footer-bar-links">
            <DirectionalLink to="/login">Sign in</DirectionalLink>
            <a href="#features">Features</a>
            <a href="#cta">Get started</a>
          </div>
        </div>
      </footer>

      <button
        className="lp-scroll-top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
