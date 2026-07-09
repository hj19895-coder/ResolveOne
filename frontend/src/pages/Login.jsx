import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

// ─── Ticket / stat data ──────────────────────────────────────────────────────
const TICKETS = [
  { id: "TK-4821", title: "API timeout on prod", priority: "critical", status: "open",   sla: "2h left",  assignee: "AK", color: "#ef4444" },
  { id: "TK-4820", title: "Agent Logout Issue",      priority: "high",     status: "active", sla: "5h left",  assignee: "SR", color: "#f97316" },
  { id: "TK-4819", title: "Dashboard slow load times",   priority: "medium",   status: "review", sla: "1d left",  assignee: "MJ", color: "#a855f7" },
  { id: "TK-4817", title: "Calls Disconnection",     priority: "high",     status: "open",   sla: "3h left",  assignee: "LW", color: "#f97316" },
  { id: "TK-4815", title: "Need Support",   priority: "low",      status: "closed", sla: "Done",     assignee: "TD", color: "#22c55e" },
];

const STATS = [
  { label: "Open",        value: "24",  delta: "+3",  up: true  },
  { label: "Resolved",    value: "182", delta: "+12", up: true  },
  { label: "SLA Breached",value: "2",   delta: "-1",  up: false },
];

const STATUS_COLORS = {
  open:   { bg: "rgba(239,68,68,0.15)",  text: "#f87171", dot: "#ef4444" },
  active: { bg: "rgba(249,115,22,0.15)", text: "#fb923c", dot: "#f97316" },
  review: { bg: "rgba(168,85,247,0.15)", text: "#c084fc", dot: "#a855f7" },
  closed: { bg: "rgba(34,197,94,0.15)",  text: "#4ade80", dot: "#22c55e" },
};

// ─── Particle canvas ─────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const particles = useRef([]);
  const mouse     = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn particles
    const COUNT = 120;
    particles.current = Array.from({ length: COUNT }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      vx:   (Math.random() - 0.5) * 0.35,
      vy:   (Math.random() - 0.5) * 0.35,
      r:    Math.random() * 1.6 + 0.4,
      // color cycling
      hue:  Math.random() * 60 + 250,   // 250–310: indigo→purple
      alpha: Math.random() * 0.5 + 0.15,
    }));

    const onMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pts = particles.current;
      // Draw connection lines
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        // mouse repel
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          p.vx += (dx / dist) * 0.04;
          p.vy += (dy / dist) * 0.04;
        }
        // speed cap
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 1.2) { p.vx *= 0.95; p.vy *= 0.95; }

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // lines to neighbours
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const dx2 = p.x - q.x, dy2 = p.y - q.y;
          const d2  = dx2 * dx2 + dy2 * dy2;
          if (d2 < 14400) { // 120px
            const t = 1 - Math.sqrt(d2) / 120;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `hsla(${(p.hue + q.hue) / 2},70%,65%,${t * 0.18})`;
            ctx.lineWidth = t * 0.8;
            ctx.stroke();
          }
        }

        // dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},70%,70%,${p.alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="df-particle-canvas" />;
}

// ─── Mouse-tracked 3-D tilt wrapper ──────────────────────────────────────────
function TiltCard({ children, className = "", intensity = 12 }) {
  const ref  = useRef(null);
  const raf  = useRef(null);
  const curr = useRef({ rx: 0, ry: 0 });
  const tgt  = useRef({ rx: 0, ry: 0 });

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    tgt.current.rx =  ((e.clientY - cy) / (rect.height / 2)) * intensity;
    tgt.current.ry = -((e.clientX - cx) / (rect.width  / 2)) * intensity;
  }, [intensity]);

  const onLeave = useCallback(() => {
    tgt.current = { rx: 0, ry: 0 };
  }, []);

  useEffect(() => {
    const loop = () => {
      const c = curr.current, t = tgt.current;
      c.rx += (t.rx - c.rx) * 0.1;
      c.ry += (t.ry - c.ry) * 0.1;
      if (ref.current) {
        ref.current.style.transform =
          `perspective(900px) rotateX(${c.rx}deg) rotateY(${c.ry}deg)`;
      }
      raf.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      {children}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ initials, hue }) {
  return (
    <div className="df-avatar"
      style={{ background: `linear-gradient(135deg,hsl(${hue},70%,50%),hsl(${hue+40},70%,38%))` }}>
      {initials}
    </div>
  );
}

function TicketCard({ ticket, className = "", style }) {
  const sc = STATUS_COLORS[ticket.status];
  return (
    <div className={`df-tc-positioner ${className}-pos`} style={style}>
      <div className={`df-ticket-card ${className}`}>
        {/* Glint line */}
        <div className="df-card-glint" />
        <div className="df-ticket-top">
          <span className="df-ticket-id">{ticket.id}</span>
          <span className="df-ticket-sla" style={{ color: ticket.color }}>{ticket.sla}</span>
        </div>
        <p className="df-ticket-title">{ticket.title}</p>
        <div className="df-ticket-bottom">
          <span className="df-status-chip" style={{ background: sc.bg, color: sc.text }}>
            <span className="df-status-dot" style={{ background: sc.dot }} />
            {ticket.status}
          </span>
          <Avatar
            initials={ticket.assignee}
            hue={ticket.priority === "critical" ? 0 : ticket.priority === "high" ? 30 : ticket.priority === "medium" ? 270 : 150}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat, style, className = "" }) {
  return (
    <div className={`df-stat-card ${className}`} style={style}>
      <div className="df-stat-value">{stat.value}</div>
      <div className="df-stat-label">{stat.label}</div>
      <div className={`df-stat-delta ${stat.up ? "up" : "down"}`}>
        {stat.up ? "▲" : "▼"} {stat.delta} today
      </div>
    </div>
  );
}

// ─── Dramatic hero / scene on the left ───────────────────────────────────────
export function HeroScene() {
  const sceneRef = useRef(null);
  const raf      = useRef(null);
  const curr     = useRef({ rx: 8, ry: -4 });
  const tgt      = useRef({ rx: 8, ry: -4 });

  const onMove = useCallback((e) => {
    const el = sceneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    tgt.current.rx =  8 + ((e.clientY - cy) / window.innerHeight) * 10;
    tgt.current.ry = -4 - ((e.clientX - cx) / window.innerWidth)  * 14;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    const loop = () => {
      const c = curr.current, t = tgt.current;
      c.rx += (t.rx - c.rx) * 0.06;
      c.ry += (t.ry - c.ry) * 0.06;
      if (sceneRef.current) {
        sceneRef.current.style.transform =
          `perspective(1400px) rotateX(${c.rx}deg) rotateY(${c.ry}deg)`;
      }
      raf.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [onMove]);

  return (
    <div className="df-hero-wrap">
      <div ref={sceneRef} className="df-scene" style={{ transformStyle: "preserve-3d" }}>

        {/* Infinite grid floor */}
        <div className="df-floor" style={{ transform: "translateZ(-60px) rotateX(55deg)" }} />

        {/* Glowing orb behind cards */}
        <div className="df-orb df-orb-main" />
        <div className="df-orb df-orb-sec"  />

        {/* Pulsing depth rings */}
        <div className="df-ring df-ring-1" />
        <div className="df-ring df-ring-2" />
        <div className="df-ring df-ring-3" />

        {/* Stat chips — float at different Z depths */}
        {STATS.map((s, i) => (
          <StatCard key={s.label} stat={s}
            style={{ animationDelay: `${i * 0.45}s` }}
            className={`df-stat-${i + 1}`}
          />
        ))}

        <TicketCard ticket={TICKETS[0]} className="df-tc-main" />
        <TicketCard ticket={TICKETS[1]} className="df-tc-mid" />
        <TicketCard ticket={TICKETS[2]} className="df-tc-back" />
        <TicketCard ticket={TICKETS[3]} className="df-tc-side" />
        <TicketCard ticket={TICKETS[4]} className="df-tc-corner" />

        {/* SLA gauge */}
        <div className="df-sla-gauge">
          <svg viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="30" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
            <circle cx="40" cy="40" r="30"
              stroke="url(#slaGrad)" strokeWidth="8"
              strokeLinecap="round" strokeDasharray="142" strokeDashoffset="35"
              style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
            />
            <defs>
              <linearGradient id="slaGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="df-sla-text">
            <span className="df-sla-pct">76%</span>
            <span className="df-sla-lbl">SLA met</span>
          </div>
        </div>

        {/* Critical ping */}
        <div className="df-ping-badge">
          <div className="df-ping-dot" />
          <span>3 critical</span>
        </div>

        {/* Live indicator */}
        <div className="df-live-chip">
          <span className="df-live-dot" />
          LIVE
        </div>

      </div>

      <div className="df-left-brand">
        <span className="df-left-brand-name">ResolveOne</span>
        <span className="df-left-brand-sub">Enterprise Support Platform</span>
      </div>
    </div>
  );
}

// ─── Main Login ───────────────────────────────────────────────────────────────
export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [focused,  setFocused]  = useState(null);

  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      navigate(user.role === "SUPERADMIN" ? "/dashboard" : "/tickets");
    } catch (err) {
      setError(err.response?.data?.message ?? "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="df-root">
      {/* Particle layer */}
      <ParticleCanvas />

      {/* Ambient blobs */}
      <div className="df-bg-mesh" />
      <div className="df-blob df-blob-1" />
      <div className="df-blob df-blob-2" />
      <div className="df-blob df-blob-3" />
      <div className="df-grid-overlay" />

      <div className="df-split">

        {/* ══ LEFT — 3-D hero ════════════════════════════════════════════ */}
        <div className="df-left">
          <HeroScene />
        </div>

        {/* ══ RIGHT — login card ═════════════════════════════════════════ */}
        <div className="df-right">
          {/* The whole card tilts with mouse */}
          <TiltCard className="df-card-tilt-wrap" intensity={0}>
            <div className="df-card">
              {/* Inner glow when focused */}
              <div className="df-card-inner-glow" />

              {/* Logo */}
              <div className="df-logo-row">
                <div className="df-logo-icon">
                  <div className="df-logo-pulse" />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div>
                  <div className="df-logo-name">ResolveOne</div>
                  <div className="df-logo-sub">Support System</div>
                </div>
              </div>

              {/* Heading */}
              <div className="df-heading-block">
                <h1 className="df-heading">Welcome back</h1>
                <p className="df-subheading">Continue to your workspace</p>
              </div>

              {/* Form */}
              <form className="df-form" onSubmit={handleLogin}>

                {error && (
                  <div className="df-error-banner">
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                {/* Email */}
                <div className={`df-field ${focused === "email" ? "focused" : ""} ${email ? "has-value" : ""}`}>
                  <label className="df-label">Email address</label>
                  <div className="df-input-wrap">
                    <svg className="df-field-icon" width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <input type="email" placeholder="you@company.com" value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      autoComplete="email" autoFocus className="df-input" />
                  </div>
                  <div className="df-field-glow" />
                </div>

                {/* Password */}
                <div className={`df-field ${focused === "password" ? "focused" : ""} ${password ? "has-value" : ""}`}>
                  <label className="df-label">Password</label>
                  <div className="df-input-wrap">
                    <svg className="df-field-icon" width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input type={showPass ? "text" : "password"} placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      autoComplete="current-password" className="df-input" />
                    <button type="button" className="df-eye-btn"
                      onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                      {showPass ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="df-field-glow" />
                </div>

                {/* Remember + Forgot */}
                <div className="df-options-row">
                  <label className="df-remember">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="df-checkbox" />
                    <span className="df-checkbox-box" />
                    Remember me
                  </label>
                  <button type="button" className="df-forgot">Forgot password?</button>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading} className={`df-submit ${loading ? "loading" : ""}`}>
                  <span className="df-submit-shimmer" />
                  <span className="df-submit-particles" />
                  {loading ? (
                    <span className="df-submit-inner">
                      <svg className="df-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Signing in…
                    </span>
                  ) : (
                    <span className="df-submit-inner">
                      Sign in
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </span>
                  )}
                </button>
              </form>

              <p className="df-footer-text">
                Protected by enterprise-grade security · <span>Privacy Policy</span>
              </p>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}