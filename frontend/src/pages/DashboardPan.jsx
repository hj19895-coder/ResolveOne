import { useEffect, useRef } from "react";
import dashboardImg from "../assets/dashboard-preview.png"; // update path if you save it elsewhere
import sidebarImg from "../assets/panel-sidebar.png";
import slaImg from "../assets/panel-sla.png";
import aiImg from "../assets/panel-ai.png";
import "./DashboardPan.css";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const FLOAT_PANELS = [
  { id: "sidebar", src: sidebarImg, className: "dpn-float-sidebar", scatter: { x: -60, y: -30 }, rot: -6, tiltFactor: 0.5 },
  { id: "sla", src: slaImg, className: "dpn-float-sla", scatter: { x: 70, y: -50 }, rot: 8, tiltFactor: 0.5 },
  { id: "ai", src: aiImg, className: "dpn-float-ai", scatter: { x: 90, y: 40 }, rot: -4, tiltFactor: 0.3 },
];
const CURSOR_TAGS = [
  { id: "rohit", name: "Rohit Gupta", accent: "#7c3aeda2", className: "dpn-cursor-priya", appearAt: 0.02, fadeAt: 0.9 },
];

export default function DashboardPan() {
  const sectionRef = useRef(null);
  const headlineRef = useRef(null);
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const floatRefs = useRef({});
  const tagRefs = useRef({});

  useEffect(() => {
    let rafId;

    const apply = (progress) => {
      // headline fades/lifts out early in the scroll
      const hp = clamp(progress / 0.25, 0, 1);
      if (headlineRef.current) {
        headlineRef.current.style.opacity = String(1 - hp);
        headlineRef.current.style.transform = `translateY(${-24 * hp}px)`;
      }

      if (frameRef.current) {
        // starts perfectly flat/parallel to the page; as you scroll, the top
        // edge tilts back (away from viewer) and the bottom edge tilts
        // forward (toward viewer) — like the screen leaning back
        const tiltProgress = clamp(progress / 0.12, 0, 1);
        const tiltX = 45 * tiltProgress; // degrees, up/down tilt
        frameRef.current.style.transform = `rotateX(${tiltX}deg)`;
      }

      if (imgRef.current) {
        // horizontal pan: image is wider than its frame, slides left as you scroll
        const tiltProgress = clamp(progress / 0.25, 0, 1);
        const maxPan = 26; // % of image width revealed over the scroll
        imgRef.current.style.transform = `translateX(${-maxPan * tiltProgress}%)`;
      }

      // floating panels: start tucked close to the frame, tilt in sync with
      // it, then drift further outward as you scroll for a 3D scatter feel
      const tiltProgress = clamp(progress / 0.12, 0, 1);
      const tiltX = 45 * tiltProgress;
      FLOAT_PANELS.forEach((panel) => {
        const el = floatRefs.current[panel.id];
        if (!el) return;
        const x = panel.scatter.x * progress;
        const y = panel.scatter.y * progress;
        const rot = panel.rot * progress;
        el.style.transform =
          `translate3d(${x}px, ${y}px, 40px) rotateX(${tiltX}deg) rotate(${rot}deg)`;
      });

      CURSOR_TAGS.forEach((tag) => {
        const el = tagRefs.current[tag.id];
        if (!el) return;
        // position is fixed via CSS now (each cursor keeps its own spot and
        // just floats continuously in place) — scroll only controls fade
        const fadeIn = clamp((progress - (tag.appearAt - 0.03)) / 0.1, 0, 1);
        const fadeOut = clamp((tag.fadeAt - progress) / 0.1, 0, 1);
        const opacity =
          progress < tag.appearAt ? 0 : Math.min(fadeIn, progress > tag.fadeAt - 0.1 ? fadeOut : 1);
        el.style.opacity = String(Math.max(opacity, 0));
      });
    
    };

    const tick = () => {
      const el = sectionRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        // progress is 0 while the frame is entering/still scrolling up
        // (flat), and only starts increasing once the section is pinned
        // at the top of the viewport
        const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
        apply(progress);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <section ref={sectionRef} className="dpn-section">
      <div className="dpn-sticky">
        <div ref={headlineRef} className="dpn-headline">
          <p className="dpn-eyebrow">Under the hood</p>
          <h2 className="dpn-h2">
            Every part of your queue, <em>working together</em>
          </h2>
          <p className="dpn-sub">
            Tickets, SLAs, notifications, and reports stay in sync in real time —
            no tab-switching, no stale data.
          </p>
        </div>

        <div className="dpn-stage">
          <div ref={frameRef} className="dpn-frame">
            <div className="dpn-frame-bar">
              <span /><span /><span />
            </div>
            <div className="dpn-frame-viewport">
              <img ref={imgRef} src={dashboardImg} alt="DeskFlow dashboard" className="dpn-img" />
            </div>
          </div>

          {FLOAT_PANELS.map((panel) => (
            <div
              key={panel.id}
              ref={(el) => (floatRefs.current[panel.id] = el)}
              className={`dpn-float ${panel.className}`}
            >
              <img src={panel.src} alt="" />
            </div>
          ))}

          {CURSOR_TAGS.map((tag, i) => (
            <div
              key={tag.id}
              ref={(el) => (tagRefs.current[tag.id] = el)}
              className={`dpn-cursor-tag ${tag.className}`}
              style={{ "--tag-accent": tag.accent }}
            >
              <div className={`dpn-cursor-float dpn-cursor-float-${i % 2}`}>
                <svg className="dpn-cursor-arrow" width="16" height="18" viewBox="0 0 16 18" fill="none">
                  <path d="M1 1l4.5 15 2.7-6.3L14.5 7 1 1z" fill={tag.accent} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
                </svg>
                <span className="dpn-cursor-label">{tag.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}